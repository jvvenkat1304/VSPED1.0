import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// Parent responds to a consent request: approve, modify (change duration/scope), or reject.
// If approved/modified, creates a time-bound consent_grant.

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

interface ConsentDecision {
  finalStatus: string;
  finalDurationHours: number;
  finalScope: string[];
}

/**
 * Determine the final consent values based on the parent's action.
 * Returns null with an error Response if validation fails.
 */
function resolveConsentDecision(
  action: string,
  consentReq: Record<string, unknown>,
  modifiedDurationHours?: number,
  modifiedScope?: string[]
): { decision?: ConsentDecision; error?: Response } {
  if (action === "reject") {
    return { decision: { finalStatus: "rejected", finalDurationHours: 0, finalScope: [] } };
  }

  if (action === "modify") {
    if (!modifiedDurationHours && !modifiedScope) {
      return {
        error: Response.json(
          { success: false, message: "Modify requires modified_duration_hours or modified_scope" },
          { status: 400 }
        ),
      };
    }
    return {
      decision: {
        finalStatus: "modified",
        finalDurationHours: modifiedDurationHours || (consentReq.requested_duration_hours as number),
        finalScope: modifiedScope || (consentReq.requested_scope as string[]),
      },
    };
  }

  // approve as-is
  return {
    decision: {
      finalStatus: "approved",
      finalDurationHours: consentReq.requested_duration_hours as number,
      finalScope: consentReq.requested_scope as string[],
    },
  };
}

/**
 * Create a time-bound consent grant and log to audit trail.
 */
async function createConsentGrant(
  consentReq: Record<string, unknown>,
  parentId: string,
  finalScope: string[],
  finalDurationHours: number
): Promise<{ grantId: string | null; error?: Response }> {
  const expiresAt = new Date(Date.now() + finalDurationHours * 60 * 60 * 1000).toISOString();

  const { data: grant, error: grantError } = await supabaseAdmin
    .from("consent_grants")
    .insert({
      request_id: consentReq.id,
      child_id: consentReq.child_id,
      parent_id: parentId,
      grantee_id: consentReq.requester_id,
      scope: finalScope,
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (grantError) {
    return {
      grantId: null,
      error: Response.json(
        { success: false, message: "Failed to create grant", detail: grantError.message },
        { status: 500 }
      ),
    };
  }

  // Audit: grant created
  await supabaseAdmin.from("consent_audit_log").insert({
    event_type: "grant_created",
    actor_id: parentId,
    child_id: consentReq.child_id,
    consent_request_id: consentReq.id,
    consent_grant_id: grant.id,
    details: { scope: finalScope, duration_hours: finalDurationHours, expires_at: expiresAt },
  });

  return { grantId: grant.id };
}

Deno.serve(async (req) => {
  try {
    // --- Auth ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return Response.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return Response.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    // --- Validate input ---
    const { request_id, action, modified_duration_hours, modified_scope, note } = await req.json();

    if (!request_id || !action) {
      return Response.json({ success: false, message: "request_id and action (approve/modify/reject) are required" }, { status: 400 });
    }
    if (!["approve", "modify", "reject"].includes(action)) {
      return Response.json({ success: false, message: "action must be 'approve', 'modify', or 'reject'" }, { status: 400 });
    }

    // --- Fetch consent request ---
    const { data: consentReq, error: fetchError } = await supabaseAdmin
      .from("consent_requests")
      .select("*")
      .eq("id", request_id)
      .eq("parent_id", user.id)
      .eq("status", "pending")
      .single();

    if (fetchError || !consentReq) {
      return Response.json({ success: false, message: "Consent request not found or already responded to" }, { status: 404 });
    }

    // --- Resolve decision ---
    const { decision, error: decisionError } = resolveConsentDecision(action, consentReq, modified_duration_hours, modified_scope);
    if (decisionError) return decisionError;

    const { finalStatus, finalDurationHours, finalScope } = decision!;

    // --- Update the request ---
    const { error: updateError } = await supabaseAdmin
      .from("consent_requests")
      .update({
        status: finalStatus,
        parent_modified_duration_hours: action === "modify" ? finalDurationHours : null,
        parent_modified_scope: action === "modify" ? finalScope : null,
        parent_response_note: note || null,
        responded_at: new Date().toISOString(),
      })
      .eq("id", request_id);

    if (updateError) {
      return Response.json({ success: false, message: "Failed to update request", detail: updateError.message }, { status: 500 });
    }

    // --- Create grant if approved/modified ---
    let grantId: string | null = null;
    if (action !== "reject") {
      const result = await createConsentGrant(consentReq, user.id, finalScope, finalDurationHours);
      if (result.error) return result.error;
      grantId = result.grantId;
    }

    return Response.json({
      success: true,
      status: finalStatus,
      grant_id: grantId,
      message: action === "reject"
        ? "Consent request rejected."
        : `Consent granted for ${finalDurationHours} hours.`,
    });
  } catch (err) {
    console.error('[respond-consent] error:', err);
    return Response.json({ success: false, message: "Server error" }, { status: 500 });
  }
});
