import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Parent responds to a proposed session: accept, reject, or cancel.
// Only the parent of the child involved can respond.

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

    const { session_id, action, reason } = await req.json();

    if (!session_id || !action) {
      return Response.json(
        { success: false, message: "session_id and action (accept/reject/cancel) are required" },
        { status: 400 }
      );
    }

    if (!["accept", "reject", "cancel"].includes(action)) {
      return Response.json(
        { success: false, message: "action must be 'accept', 'reject', or 'cancel'" },
        { status: 400 }
      );
    }

    // Fetch session — must belong to this parent
    const { data: session, error: fetchError } = await supabaseAdmin
      .from("sessions")
      .select("*")
      .eq("id", session_id)
      .eq("parent_id", user.id)
      .single();

    if (fetchError || !session) {
      return Response.json(
        { success: false, message: "Session not found or not yours" },
        { status: 404 }
      );
    }

    // Validate state transitions
    if (action === "accept" && session.status !== "proposed") {
      return Response.json(
        { success: false, message: "Can only accept a proposed session" },
        { status: 400 }
      );
    }
    if (action === "reject" && session.status !== "proposed") {
      return Response.json(
        { success: false, message: "Can only reject a proposed session" },
        { status: 400 }
      );
    }
    if (action === "cancel" && !["proposed", "accepted"].includes(session.status)) {
      return Response.json(
        { success: false, message: "Can only cancel a proposed or accepted session" },
        { status: 400 }
      );
    }

    // Apply the action
    const updateData: Record<string, unknown> = {};

    if (action === "accept") {
      updateData.status = "accepted";
      updateData.accepted_at = new Date().toISOString();
    } else if (action === "reject") {
      updateData.status = "rejected";
      updateData.cancelled_by = user.id;
      updateData.cancellation_reason = reason || "Parent rejected the proposed time";
    } else if (action === "cancel") {
      updateData.status = "cancelled";
      updateData.cancelled_by = user.id;
      updateData.cancellation_reason = reason || "Cancelled by parent";
    }

    const { error: updateError } = await supabaseAdmin
      .from("sessions")
      .update(updateData)
      .eq("id", session_id);

    if (updateError) {
      return Response.json(
        { success: false, message: "Failed to update session", detail: updateError.message },
        { status: 500 }
      );
    }

    // TODO: Notify educator about the parent's response

    return Response.json({
      success: true,
      session_id,
      new_status: updateData.status,
      message: action === "accept"
        ? "Session accepted. It's now confirmed."
        : action === "reject"
          ? "Session rejected."
          : "Session cancelled.",
    });

  } catch (_err) {
    return Response.json({ success: false, message: "Server error" }, { status: 500 });
  }
});
