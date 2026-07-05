import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// Educator proposes a session with a child.
// Requires: educator has active consent grant for the child.
// Parent must accept before the session is confirmed.

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

    const { child_id, scheduled_start, scheduled_end, subject, session_type, participant_count } = await req.json();

    if (!child_id || !scheduled_start || !scheduled_end) {
      return Response.json(
        { success: false, message: "child_id, scheduled_start, and scheduled_end are required" },
        { status: 400 }
      );
    }

    // Validate times
    const start = new Date(scheduled_start);
    const end = new Date(scheduled_end);
    if (end <= start) {
      return Response.json(
        { success: false, message: "scheduled_end must be after scheduled_start" },
        { status: 400 }
      );
    }
    if (start < new Date()) {
      return Response.json(
        { success: false, message: "Cannot schedule a session in the past" },
        { status: 400 }
      );
    }

    // Verify educator has active consent for this child
    const { data: grant } = await supabaseAdmin
      .from("consent_grants")
      .select("id, child_id, parent_id")
      .eq("grantee_id", user.id)
      .eq("child_id", child_id)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .limit(1)
      .single();

    if (!grant) {
      return Response.json(
        { success: false, message: "No active consent grant for this child. Request consent first." },
        { status: 403 }
      );
    }

    // Create the session proposal
    const { data: session, error: insertError } = await supabaseAdmin
      .from("sessions")
      .insert({
        special_educator_id: user.id,
        child_id,
        parent_id: grant.parent_id,
        consent_grant_id: grant.id,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        subject: subject || null,
        session_type: session_type || "1:1",
        participant_count: participant_count || 1,
        status: "proposed",
      })
      .select("id, status, start_time, end_time")
      .single();

    if (insertError) {
      return Response.json(
        { success: false, message: "Failed to propose session", detail: insertError.message },
        { status: 500 }
      );
    }

    // TODO: Send notification to parent about the proposed session

    return Response.json({
      success: true,
      session_id: session.id,
      status: session.status,
      scheduled_start: session.start_time,
      scheduled_end: session.end_time,
      message: "Session proposed. Awaiting parent acceptance.",
    });

  } catch (_err) {
    return Response.json({ success: false, message: "Server error" }, { status: 500 });
  }
});
