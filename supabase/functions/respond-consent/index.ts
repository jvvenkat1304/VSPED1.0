import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Parent responds to a consent request: approve, modify (change duration/scope), or reject.
// If approved/modified, creates a time-bound consent_grant.

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  try {
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

    const { request_id, action, modified_duration_hours, modified_scope, note } = await req.json();

    if (!request_id || !action) {
      return Response.json(
        { success: false, message: "request_id and action (approve/modify/reject) are required" },
        { status: 400 }
      );
    }

    if (!["approve", "modify", "reject"].includes(action)) {
      return Response.json(
        { success: false, message: "action must be 'approve', 'modify', or 'reject'" },
        { status: 400 }
      );
    }

    // Fetch the request — must belong to this parent and be pending
    const { data: consentReq, error: fetchError } = await supabaseAdmin
      .from("consent_requests")
      .select("*")
      .eq("id", request_id)
      .eq("parent_id", user.id)
      .eq("status", "pending")
      .single();

    if (fetchError || !consentReq) {
      return Response.json(
        { success: false, message: "Consent request not found or already responded to" },
        { status: 404 }
      );
    }

    // Determine final values
    let finalStatus: string;
    let finalDurationHours: number;
    let finalScope: string[];

    if (action === "reject") {
      finalStatus = "rejected";
      finalDurationHours = 0;
      finalScope = [];
    } else if (action === "modify") {
      if (!modified_duration_hours && !modified_scope) {
        return Response.json(
          { success: false, message: "Modify requires modified_duration_hours or modified_scope" },
          { status: 400 }
        );
      }
      finalStatus = "modified";
      finalDurationHours = modified_duration_hours || consentReq.requested_duration_hours;
      finalScope = modified_scope || consentReq.requested_scope;
    } else {
      // approve as-is
      finalStatus = "approved";
      finalDurationHours = consentReq.requested_duration_hours;
      finalScope = consentReq.requested_scope;
    }

    // Update the request
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
      return Response.json(
        { success: false, message: "Failed to update request", detail: updateError.message },
        { status: 500 }
      );
    }

    // If approved or modified, create a consent grant
    let grantId: string | null = null;
    if (action !== "reject") {
      const expiresAt = new Date(Date.now() + finalDurationHours * 60 * 60 * 1000).toISOString();

      const { data: grant, error: grantError } = await supabaseAdmin
        .from("consent_grants")
        .insert({
          request_id: consentReq.id,
          child_id: consentReq.child_id,
          parent_id: user.id,
          grantee_id: consentReq.requester_id,
          scope: finalScope,
          expires_at: expiresAt,
        })
        .select("id")
        .single();

      if (grantError) {
        return Response.json(
          { success: false, message: "Failed to create grant", detail: grantError.message },
          { status: 500 }
        );
      }

      grantId = grant.id;

      // Audit: grant created
      await supabaseAdmin.from("consent_audit_log").insert({
        event_type: "grant_created",
        actor_id: user.id,
        child_id: consentReq.child_id,
        consent_request_id: consentReq.id,
        consent_grant_id: grant.id,
        details: { scope: finalScope, duration_hours: finalDurationHours, expires_at: expiresAt },
      });
    }

    return Response.json({
      success: true,
      status: finalStatus,
      grant_id: grantId,
      message: action === "reject"
        ? "Consent request rejected."
        : `Consent granted for ${finalDurationHours} hours.`,
    });

  } catch (_err) {
    return Response.json({ success: false, message: "Server error" }, { status: 500 });
  }
});
