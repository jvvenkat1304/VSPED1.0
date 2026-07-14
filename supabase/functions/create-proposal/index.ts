import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// Parent-initiated session proposal creation endpoint.
// Allows a parent to propose a session package to an educator for their child.
// Rate-limited to 10 proposals per 60 minutes per user.

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

/**
 * Extract the client IP address from request headers.
 * Checks X-Forwarded-For first (takes first IP), then X-Real-IP, fallback to 'unknown'.
 */
function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "unknown";
}

Deno.serve(async (req) => {
  try {
    // --- 1. Auth: verify JWT, get user from auth header ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // --- 2. Rate limiting: 10 proposals per 60 minutes ---
    const { data: allowed, error: rateLimitError } = await supabaseAdmin.rpc(
      "check_rate_limit",
      {
        p_identifier: user.id,
        p_action: "create_proposal",
        p_max_requests: 10,
        p_window_minutes: 60,
      }
    );

    if (rateLimitError || allowed === false) {
      return Response.json(
        { success: false, message: "Too many attempts. Please try again later." },
        { status: 429 }
      );
    }

    // --- 3. Parse and validate request body ---
    const body = await req.json();
    const {
      child_id,
      educator_id,
      sessions_per_week,
      total_sessions,
      proposed_rate_inr,
      notes,
    } = body;

    const errors: string[] = [];

    if (!child_id) errors.push("child_id is required");
    if (!educator_id) errors.push("educator_id is required");
    if (sessions_per_week === undefined || sessions_per_week === null) {
      errors.push("sessions_per_week is required");
    }
    if (total_sessions === undefined || total_sessions === null) {
      errors.push("total_sessions is required");
    }
    if (proposed_rate_inr === undefined || proposed_rate_inr === null) {
      errors.push("proposed_rate_inr is required");
    }

    // Range validations (only if field is present)
    if (
      sessions_per_week !== undefined &&
      sessions_per_week !== null &&
      (typeof sessions_per_week !== "number" ||
        !Number.isInteger(sessions_per_week) ||
        sessions_per_week < 1 ||
        sessions_per_week > 7)
    ) {
      errors.push("sessions_per_week must be an integer between 1 and 7");
    }
    if (
      total_sessions !== undefined &&
      total_sessions !== null &&
      (typeof total_sessions !== "number" ||
        !Number.isInteger(total_sessions) ||
        total_sessions < 1)
    ) {
      errors.push("total_sessions must be an integer >= 1");
    }
    if (
      proposed_rate_inr !== undefined &&
      proposed_rate_inr !== null &&
      (typeof proposed_rate_inr !== "number" ||
        !Number.isInteger(proposed_rate_inr) ||
        proposed_rate_inr < 1)
    ) {
      errors.push("proposed_rate_inr must be an integer >= 1");
    }
    if (
      notes !== undefined &&
      notes !== null &&
      (typeof notes !== "string" || notes.length > 500)
    ) {
      errors.push("notes must be a string with maximum 500 characters");
    }

    if (errors.length > 0) {
      return Response.json(
        { success: false, message: "Validation failed", errors },
        { status: 400 }
      );
    }

    // --- 4. Verify child belongs to authenticated parent ---
    const { data: child, error: childError } = await supabaseAdmin
      .from("children")
      .select("id")
      .eq("id", child_id)
      .eq("parent_id", user.id)
      .single();

    if (childError || !child) {
      return Response.json(
        { success: false, message: "Child not found or does not belong to you" },
        { status: 403 }
      );
    }

    // --- 5. Verify educator eligibility ---
    const { data: educator, error: educatorError } = await supabaseAdmin
      .from("educator_profiles")
      .select("id, verification_status, subscription_status, min_rate_inr, session_rate_inr")
      .eq("id", educator_id)
      .single();

    if (educatorError || !educator) {
      return Response.json(
        { success: false, message: "Educator not found" },
        { status: 422 }
      );
    }

    const eligibleStatuses = ["provisionally_verified", "verified"];
    if (
      !eligibleStatuses.includes(educator.verification_status) ||
      educator.subscription_status !== "active"
    ) {
      return Response.json(
        { success: false, message: "This educator is not currently accepting proposals" },
        { status: 422 }
      );
    }

    // --- 6. Rate validation against educator's minimum ---
    // If min_rate_inr is NULL, treat it as session_rate_inr (no discount)
    const effectiveMinRate =
      educator.min_rate_inr !== null && educator.min_rate_inr !== undefined
        ? educator.min_rate_inr
        : educator.session_rate_inr;

    if (proposed_rate_inr < effectiveMinRate) {
      return Response.json(
        { success: false, message: "This rate is below the educator's acceptable range" },
        { status: 403 }
      );
    }

    // --- 7. Calculate costs ---
    const subtotal = total_sessions * proposed_rate_inr;
    const gst = Math.round(subtotal * 0.18);
    const grand_total = subtotal + gst;

    // --- 8. Insert into session_proposals ---
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

    const { data: proposal, error: insertError } = await supabaseAdmin
      .from("session_proposals")
      .insert({
        parent_id: user.id,
        child_id,
        educator_id,
        sessions_per_week,
        total_sessions,
        proposed_rate_inr,
        notes: notes || null,
        status: "pending",
        expires_at: expiresAt,
      })
      .select("id, status, expires_at")
      .single();

    if (insertError || !proposal) {
      console.error("Failed to insert proposal:", insertError?.message);
      return Response.json(
        { success: false, message: "Failed to create proposal" },
        { status: 500 }
      );
    }

    // --- 9. Insert notification for educator ---
    const { error: notifError } = await supabaseAdmin
      .from("notifications")
      .insert({
        user_id: educator_id,
        type: "proposal_received",
        title: "New Session Proposal",
        body: `A parent has proposed ${total_sessions} sessions at ₹${proposed_rate_inr}/session`,
        metadata: { proposal_id: proposal.id, parent_id: user.id },
      });

    if (notifError) {
      // Log but don't fail the request — the proposal itself was created successfully
      console.error("Failed to insert notification:", notifError.message);
    }

    // --- 10. Return success response ---
    return Response.json(
      {
        success: true,
        proposal_id: proposal.id,
        status: proposal.status,
        total_cost: subtotal,
        gst_amount: gst,
        grand_total: grand_total,
        expires_at: proposal.expires_at,
      },
      { status: 201 }
    );
  } catch (_err) {
    console.error("Server error:", _err);
    return Response.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
});
