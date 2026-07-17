import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// Parent-initiated session proposal creation endpoint.
// Allows a parent to propose a session package to an educator for their child.
// Rate-limited to 10 proposals per 60 minutes per user.

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

interface ProposalInput {
  child_id?: string;
  educator_id?: string;
  sessions_per_week?: number;
  total_sessions?: number;
  proposed_rate_inr?: number;
  notes?: string;
}

/**
 * Validate the proposal input fields. Returns an array of error messages (empty = valid).
 */
function validateProposalInput(body: ProposalInput): string[] {
  const errors: string[] = [];
  const { child_id, educator_id, sessions_per_week, total_sessions, proposed_rate_inr, notes } = body;

  if (!child_id) errors.push("child_id is required");
  if (!educator_id) errors.push("educator_id is required");
  if (sessions_per_week == null) errors.push("sessions_per_week is required");
  if (total_sessions == null) errors.push("total_sessions is required");
  if (proposed_rate_inr == null) errors.push("proposed_rate_inr is required");

  if (sessions_per_week != null && (!Number.isInteger(sessions_per_week) || sessions_per_week < 1 || sessions_per_week > 7)) {
    errors.push("sessions_per_week must be an integer between 1 and 7");
  }
  if (total_sessions != null && (!Number.isInteger(total_sessions) || total_sessions < 1)) {
    errors.push("total_sessions must be an integer >= 1");
  }
  if (proposed_rate_inr != null && (!Number.isInteger(proposed_rate_inr) || proposed_rate_inr < 1)) {
    errors.push("proposed_rate_inr must be an integer >= 1");
  }
  if (notes != null && (typeof notes !== "string" || notes.length > 500)) {
    errors.push("notes must be a string with maximum 500 characters");
  }

  return errors;
}

/**
 * Verify the educator is eligible to receive proposals (verified + subscribed).
 */
async function verifyEducatorEligibility(educatorId: string): Promise<{
  educator?: { min_rate_inr: number | null; session_rate_inr: number | null };
  error?: Response;
}> {
  const { data: educator, error } = await supabaseAdmin
    .from("educator_profiles")
    .select("id, verification_status, subscription_status, min_rate_inr, session_rate_inr")
    .eq("id", educatorId)
    .single();

  if (error || !educator) {
    return { error: Response.json({ success: false, message: "Educator not found" }, { status: 422 }) };
  }

  const eligible = ["provisionally_verified", "verified"].includes(educator.verification_status)
    && educator.subscription_status === "active";

  if (!eligible) {
    return { error: Response.json({ success: false, message: "This educator is not currently accepting proposals" }, { status: 422 }) };
  }

  return { educator: { min_rate_inr: educator.min_rate_inr, session_rate_inr: educator.session_rate_inr } };
}

Deno.serve(async (req) => {
  try {
    // --- 1. Auth ---
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

    // --- 2. Rate limiting ---
    const { data: allowed, error: rateLimitError } = await supabaseAdmin.rpc("check_rate_limit", {
      p_identifier: user.id,
      p_action: "create_proposal",
      p_max_requests: 10,
      p_window_minutes: 60,
    });

    if (rateLimitError || allowed === false) {
      return Response.json({ success: false, message: "Too many attempts. Please try again later." }, { status: 429 });
    }

    // --- 3. Validate input ---
    const body = await req.json();
    const errors = validateProposalInput(body);
    if (errors.length > 0) {
      return Response.json({ success: false, message: "Validation failed", errors }, { status: 400 });
    }

    const { child_id, educator_id, sessions_per_week, total_sessions, proposed_rate_inr, notes } = body;

    // --- 4. Verify child belongs to parent ---
    const { data: child, error: childError } = await supabaseAdmin
      .from("children")
      .select("id")
      .eq("id", child_id)
      .eq("parent_id", user.id)
      .single();

    if (childError || !child) {
      return Response.json({ success: false, message: "Child not found or does not belong to you" }, { status: 403 });
    }

    // --- 5. Verify educator eligibility ---
    const { educator, error: eligError } = await verifyEducatorEligibility(educator_id);
    if (eligError) return eligError;

    // --- 6. Rate validation ---
    const effectiveMinRate = educator!.min_rate_inr ?? educator!.session_rate_inr;
    if (proposed_rate_inr < effectiveMinRate) {
      return Response.json({ success: false, message: "This rate is below the educator's acceptable range" }, { status: 403 });
    }

    // --- 7. Calculate costs + insert ---
    const subtotal = total_sessions * proposed_rate_inr;
    const gst = Math.round(subtotal * 0.18);
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
      return Response.json({ success: false, message: "Failed to create proposal" }, { status: 500 });
    }

    // --- 8. Notify educator ---
    await supabaseAdmin.from("notifications").insert({
      user_id: educator_id,
      type: "proposal_received",
      title: "New Session Proposal",
      body: `A parent has proposed ${total_sessions} sessions at ₹${proposed_rate_inr}/session`,
      metadata: { proposal_id: proposal.id, parent_id: user.id },
    });

    // --- 9. Return ---
    return Response.json({
      success: true,
      proposal_id: proposal.id,
      status: proposal.status,
      total_cost: subtotal,
      gst_amount: gst,
      grand_total: subtotal + gst,
      expires_at: proposal.expires_at,
    }, { status: 201 });
  } catch (err) {
    console.error("[create-proposal] error:", err);
    return Response.json({ success: false, message: "Server error" }, { status: 500 });
  }
});
