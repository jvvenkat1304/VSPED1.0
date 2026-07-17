import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// Parent responds to an educator's counter-proposal: accept or withdraw.
// Only the parent who created the original proposal can respond.

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

/**
 * Handle accept: create consent grant, payment record, notify educator.
 */
async function handleAcceptCounter(
  proposal: Record<string, unknown>,
  userId: string
): Promise<Response> {
  const now = new Date().toISOString();
  const proposalId = proposal.id as string;

  // Update proposal status
  const { error: updateError } = await supabaseAdmin
    .from("session_proposals")
    .update({ status: "parent_accepted", responded_at: now })
    .eq("id", proposalId);

  if (updateError) {
    console.error("Failed to update proposal:", updateError.message);
    return Response.json({ success: false, message: "Failed to update proposal" }, { status: 500 });
  }

  // Create consent_grant (auto-consent on acceptance)
  const { data: consentGrant, error: consentError } = await supabaseAdmin
    .from("consent_grants")
    .insert({
      child_id: proposal.child_id,
      grantee_id: proposal.educator_id,
      parent_id: proposal.parent_id,
      scope: ["progress", "session_notes"],
      expires_at: null,
      proposal_id: proposalId,
      granted_at: now,
    })
    .select("id")
    .single();

  if (consentError || !consentGrant) {
    console.error("Failed to create consent grant:", consentError?.message);
    return Response.json({ success: false, message: "Failed to create consent grant" }, { status: 500 });
  }

  // Audit trail consent request
  await supabaseAdmin.from("consent_requests").insert({
    requestor_id: proposal.educator_id,
    child_id: proposal.child_id,
    reason: `Session package: ${proposal.counter_total_sessions} sessions at ₹${proposal.counter_rate_inr}/session`,
    status: "approved",
  });

  // Create payment record
  const subtotal = (proposal.counter_total_sessions as number) * (proposal.counter_rate_inr as number);
  const gst = Math.round(subtotal * 0.18);

  const { data: payment, error: paymentError } = await supabaseAdmin
    .from("proposal_payments")
    .insert({
      proposal_id: proposalId,
      parent_id: proposal.parent_id,
      educator_id: proposal.educator_id,
      sessions_count: proposal.counter_total_sessions,
      rate_per_session: proposal.counter_rate_inr,
      subtotal_inr: subtotal,
      gst_inr: gst,
      total_inr: subtotal + gst,
      status: "pending",
    })
    .select("id")
    .single();

  if (paymentError || !payment) {
    console.error("Failed to create payment record:", paymentError?.message);
    return Response.json({ success: false, message: "Failed to create payment record" }, { status: 500 });
  }

  // Link consent + payment to proposal
  await supabaseAdmin
    .from("session_proposals")
    .update({ consent_grant_id: consentGrant.id, payment_id: payment.id })
    .eq("id", proposalId);

  // Notify educator
  await supabaseAdmin.from("notifications").insert({
    user_id: proposal.educator_id,
    type: "counter_accepted",
    title: "Counter-Offer Accepted",
    body: "The parent accepted your counter-offer. Payment is pending.",
    metadata: { proposal_id: proposalId, parent_id: userId },
  });

  return Response.json({
    success: true,
    proposal_id: proposalId,
    new_status: "parent_accepted",
    consent_grant_id: consentGrant.id,
    payment_id: payment.id,
  });
}

/**
 * Handle withdraw: mark proposal as withdrawn, notify educator.
 */
async function handleWithdraw(
  proposal: Record<string, unknown>,
  userId: string
): Promise<Response> {
  const now = new Date().toISOString();
  const proposalId = proposal.id as string;

  const { error: updateError } = await supabaseAdmin
    .from("session_proposals")
    .update({ status: "withdrawn", responded_at: now })
    .eq("id", proposalId);

  if (updateError) {
    console.error("Failed to update proposal:", updateError.message);
    return Response.json({ success: false, message: "Failed to update proposal" }, { status: 500 });
  }

  await supabaseAdmin.from("notifications").insert({
    user_id: proposal.educator_id,
    type: "counter_withdrawn",
    title: "Proposal Withdrawn",
    body: "The parent has withdrawn from the session proposal.",
    metadata: { proposal_id: proposalId, parent_id: userId },
  });

  return Response.json({
    success: true,
    proposal_id: proposalId,
    new_status: "withdrawn",
  });
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

    // --- 2. Validate input ---
    const { proposal_id, action } = await req.json();

    if (!proposal_id || !action) {
      return Response.json({ success: false, message: "proposal_id and action are required" }, { status: 400 });
    }
    if (!["accept", "withdraw"].includes(action)) {
      return Response.json({ success: false, message: "action must be 'accept' or 'withdraw'" }, { status: 400 });
    }

    // --- 3. Fetch proposal ---
    const { data: proposal, error: fetchError } = await supabaseAdmin
      .from("session_proposals")
      .select("*")
      .eq("id", proposal_id)
      .eq("parent_id", user.id)
      .single();

    if (fetchError || !proposal) {
      return Response.json({ success: false, message: "Proposal not found or not yours" }, { status: 403 });
    }

    if (proposal.status !== "countered") {
      return Response.json({ success: false, message: "Can only respond to proposals with status 'countered'" }, { status: 400 });
    }

    // --- 4. Dispatch action ---
    if (action === "accept") {
      return await handleAcceptCounter(proposal, user.id);
    }
    return await handleWithdraw(proposal, user.id);
  } catch (err) {
    console.error("[respond-counter] error:", err);
    return Response.json({ success: false, message: "Server error" }, { status: 500 });
  }
});
