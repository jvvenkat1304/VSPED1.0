import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// Educator/therapist submits a consent request to access a child's data.
// The parent must approve before any access is granted.

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

    const { child_id, reason, duration_hours, scope } = await req.json();

    if (!child_id || !reason || !duration_hours) {
      return Response.json(
        { success: false, message: "child_id, reason, and duration_hours are required" },
        { status: 400 }
      );
    }

    if (duration_hours < 1 || duration_hours > 8760) { // max 1 year
      return Response.json(
        { success: false, message: "duration_hours must be between 1 and 8760" },
        { status: 400 }
      );
    }

    // Get the child's parent_id
    const { data: child, error: childError } = await supabaseAdmin
      .from("children")
      .select("id, parent_id")
      .eq("id", child_id)
      .single();

    if (childError || !child) {
      return Response.json({ success: false, message: "Child not found" }, { status: 404 });
    }

    // Requester cannot be the parent themselves
    if (child.parent_id === user.id) {
      return Response.json(
        { success: false, message: "Parents don't need consent to access their own child's data" },
        { status: 400 }
      );
    }

    // Get requester's role
    const { data: requesterProfile } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    // Create the consent request
    const { data: request, error: insertError } = await supabaseAdmin
      .from("consent_requests")
      .insert({
        requester_id: user.id,
        requester_role: requesterProfile?.role ?? "unknown",
        child_id: child.id,
        parent_id: child.parent_id,
        reason,
        requested_duration_hours: duration_hours,
        requested_scope: scope || ["progress", "session_notes"],
      })
      .select("id, created_at")
      .single();

    if (insertError) {
      return Response.json(
        { success: false, message: "Failed to create consent request", detail: insertError.message },
        { status: 500 }
      );
    }

    // Log to audit
    await supabaseAdmin.from("consent_audit_log").insert({
      event_type: "request_created",
      actor_id: user.id,
      child_id: child.id,
      consent_request_id: request.id,
      details: { reason, duration_hours, scope: scope || ["progress", "session_notes"] },
    });

    // TODO: Send push notification to parent (notification system not yet built)

    return Response.json({
      success: true,
      request_id: request.id,
      message: "Consent request submitted. Awaiting parent approval.",
    });

  } catch (_err) {
    return Response.json({ success: false, message: "Server error" }, { status: 500 });
  }
});
