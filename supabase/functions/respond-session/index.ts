import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// Parent responds to a proposed session: accept, reject, or cancel.
// Only the parent of the child involved can respond.

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

/** Valid state transitions: action → allowed current statuses */
const VALID_TRANSITIONS: Record<string, string[]> = {
  accept: ["proposed"],
  reject: ["proposed"],
  cancel: ["proposed", "accepted"],
};

/**
 * Validate that the action is allowed for the current session status.
 */
function validateStateTransition(action: string, currentStatus: string): string | null {
  const allowed = VALID_TRANSITIONS[action];
  if (!allowed?.includes(currentStatus)) {
    return `Can only ${action} a ${allowed?.join(' or ')} session`;
  }
  return null;
}

/**
 * Build the DB update payload based on action.
 */
function buildUpdateData(action: string, userId: string, reason?: string): Record<string, unknown> {
  if (action === "accept") {
    return { status: "accepted", accepted_at: new Date().toISOString() };
  }
  if (action === "reject") {
    return { status: "rejected", cancelled_by: userId, cancellation_reason: reason || "Parent rejected the proposed time" };
  }
  return { status: "cancelled", cancelled_by: userId, cancellation_reason: reason || "Cancelled by parent" };
}

/**
 * Get notification text for the action.
 */
function getNotification(action: string): { title: string; body: string } {
  if (action === "accept") return { title: "Session Accepted", body: "The parent accepted your proposed session." };
  if (action === "reject") return { title: "Session Declined", body: "The parent declined your proposed session." };
  return { title: "Session Cancelled", body: "The parent cancelled the session." };
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
    const { session_id, action, reason } = await req.json();

    if (!session_id || !action) {
      return Response.json({ success: false, message: "session_id and action (accept/reject/cancel) are required" }, { status: 400 });
    }
    if (!["accept", "reject", "cancel"].includes(action)) {
      return Response.json({ success: false, message: "action must be 'accept', 'reject', or 'cancel'" }, { status: 400 });
    }

    // --- Fetch session ---
    const { data: session, error: fetchError } = await supabaseAdmin
      .from("sessions")
      .select("*")
      .eq("id", session_id)
      .eq("parent_id", user.id)
      .single();

    if (fetchError || !session) {
      return Response.json({ success: false, message: "Session not found or not yours" }, { status: 404 });
    }

    // --- Validate state transition ---
    const transitionError = validateStateTransition(action, session.status);
    if (transitionError) {
      return Response.json({ success: false, message: transitionError }, { status: 400 });
    }

    // --- Apply update ---
    const updateData = buildUpdateData(action, user.id, reason);

    const { error: updateError } = await supabaseAdmin
      .from("sessions")
      .update(updateData)
      .eq("id", session_id);

    if (updateError) {
      return Response.json({ success: false, message: "Failed to update session", detail: updateError.message }, { status: 500 });
    }

    // --- Notify educator ---
    const notif = getNotification(action);
    await supabaseAdmin.from("notifications").insert({
      user_id: session.special_educator_id,
      type: `session_${action}ed`,
      title: notif.title,
      body: notif.body,
      metadata: { session_id },
    });

    return Response.json({
      success: true,
      session_id,
      new_status: updateData.status,
      message: notif.body,
    });
  } catch (err) {
    console.error('[respond-session] error:', err);
    return Response.json({ success: false, message: "Server error" }, { status: 500 });
  }
});
