import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// Educator responds to a parent-initiated session proposal.
// Actions: accept, reject, or counter.

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  try {
    // --- 1. Authenticate educator via auth header ---
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

    // --- 2. Parse and validate request body ---
    const body = await req.json();
    const {
      proposal_id,
      action,
      counter_rate_inr,
      counter_sessions_per_week,
      counter_total_sessions,
      counter_notes,
      rejection_reason,
    } = body;

    if (!proposal_id) {
      return Response.json(
        { success: false, message: "proposal_id is required" },
        { status: 400 }
      );
    }

    const validActions = ["accept", "reject", "counter"];
    if (!action || !validActions.includes(action)) {
      return Response.json(
        { success: false, message: "action must be one of: accept, reject, counter" },
        { status: 400 }
      );
    }

    // --- 3. Fetch proposal where educator_id = auth.uid() ---
    const { data: proposal, error: proposalError } = await supabaseAdmin
      .from("session_proposals")
      .select("*")
      .eq("id", proposal_id)
      .eq("educator_id", user.id)
      .single();

    if (proposalError || !proposal) {
      return Response.json(
        { success: false, message: "Proposal not found or you are not authorized" },
        { status: 403 }
      );
    }

    // --- 4. Check proposal status is 'pending' ---
    if (proposal.status !== "pending") {
      return Response.json(
        { success: false, message: `This proposal cannot be ${action}ed in its current state` },
        { status: 400 }
      );
    }

    // --- 5. Handle action ---
    if (action === "accept") {
      return await handleAccept(proposal, user.id);
    } else if (action === "reject") {
      return await handleReject(proposal, user.id, rejection_reason);
    } else if (action === "counter") {
      return await handleCounter(proposal, user.id, {
        counter_rate_inr,
        counter_sessions_per_week,
        counter_total_sessions,
        counter_notes,
      });
    }

    return Response.json(
      { success: false, message: "Unhandled action" },
      { status: 400 }
    );
  } catch (_err) {
    console.error("Server error:", _err);
    return Response.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
});


// --- Accept handler ---
// Creates consent_grant, consent_request (audit trail), payment record, and notifies parent.
async function handleAccept(
  proposal: Record<string, any>,
  educatorId: string
): Promise<Response> {
  const now = new Date().toISOString();

  // Update proposal status to 'accepted'
  const { error: updateError } = await supabaseAdmin
    .from("session_proposals")
    .update({ status: "accepted", responded_at: now })
    .eq("id", proposal.id);

  if (updateError) {
    console.error("Failed to update proposal:", updateError.message);
    return Response.json(
      { success: false, message: "Failed to accept proposal" },
      { status: 500 }
    );
  }

  // Create consent_request for audit trail
  const consentReason = `Session package: ${proposal.total_sessions} sessions at ₹${proposal.proposed_rate_inr}/session`;

  const { data: consentRequest, error: consentReqError } = await supabaseAdmin
    .from("consent_requests")
    .insert({
      requestor_id: educatorId,
      child_id: proposal.child_id,
      reason: consentReason,
      status: "approved",
    })
    .select("id")
    .single();

  if (consentReqError) {
    console.error("Failed to create consent_request:", consentReqError.message);
  }

  // Create consent_grant (auto-consent on acceptance)
  const { data: consentGrant, error: consentGrantError } = await supabaseAdmin
    .from("consent_grants")
    .insert({
      child_id: proposal.child_id,
      grantee_id: educatorId,
      parent_id: proposal.parent_id,
      scope: ["progress", "session_notes"],
      expires_at: null,
      proposal_id: proposal.id,
      granted_at: now,
      request_id: consentRequest?.id || null,
    })
    .select("id")
    .single();

  if (consentGrantError) {
    console.error("Failed to create consent_grant:", consentGrantError.message);
    return Response.json(
      { success: false, message: "Failed to create consent grant" },
      { status: 500 }
    );
  }

  // Create payment record in proposal_payments
  const subtotal = proposal.total_sessions * proposal.proposed_rate_inr;
  const gst = Math.round(subtotal * 0.18);
  const total = subtotal + gst;

  const { data: payment, error: paymentError } = await supabaseAdmin
    .from("proposal_payments")
    .insert({
      proposal_id: proposal.id,
      parent_id: proposal.parent_id,
      educator_id: educatorId,
      sessions_count: proposal.total_sessions,
      rate_per_session: proposal.proposed_rate_inr,
      subtotal_inr: subtotal,
      gst_inr: gst,
      total_inr: total,
      status: "pending",
    })
    .select("id")
    .single();

  if (paymentError) {
    console.error("Failed to create payment record:", paymentError.message);
    return Response.json(
      { success: false, message: "Failed to create payment record" },
      { status: 500 }
    );
  }

  // Update proposal with consent_grant_id and payment_id
  const { error: linkError } = await supabaseAdmin
    .from("session_proposals")
    .update({
      consent_grant_id: consentGrant.id,
      payment_id: payment.id,
    })
    .eq("id", proposal.id);

  if (linkError) {
    console.error("Failed to link consent/payment to proposal:", linkError.message);
  }

  // Insert notification for parent
  const { error: notifError } = await supabaseAdmin
    .from("notifications")
    .insert({
      user_id: proposal.parent_id,
      type: "proposal_accepted",
      title: "Proposal Accepted!",
      body: "The educator accepted your proposal. Complete payment to begin sessions.",
      metadata: { proposal_id: proposal.id, educator_id: educatorId },
    });

  if (notifError) {
    console.error("Failed to insert notification:", notifError.message);
  }

  // Insert notification for educator confirming consent was granted
  const { error: educatorNotifError } = await supabaseAdmin
    .from("notifications")
    .insert({
      user_id: educatorId,
      type: "consent_granted",
      title: "Consent Granted",
      body: "You now have time-bound access to the child's data for session planning and progress notes. View details in My Clients.",
      metadata: {
        proposal_id: proposal.id,
        child_id: proposal.child_id,
        consent_grant_id: consentGrant.id,
        consent_scope: ["progress", "session_notes"],
      },
    });

  if (educatorNotifError) {
    console.error("Failed to insert educator consent notification:", educatorNotifError.message);
  }

  return Response.json(
    {
      success: true,
      proposal_id: proposal.id,
      new_status: "accepted",
      consent_grant_id: consentGrant.id,
      payment_id: payment.id,
    },
    { status: 200 }
  );
}


// --- Reject handler ---
// Updates proposal to 'rejected' and notifies parent.
async function handleReject(
  proposal: Record<string, any>,
  educatorId: string,
  rejectionReason?: string
): Promise<Response> {
  const now = new Date().toISOString();

  // Update proposal status to 'rejected'
  const { error: updateError } = await supabaseAdmin
    .from("session_proposals")
    .update({ status: "rejected", responded_at: now })
    .eq("id", proposal.id);

  if (updateError) {
    console.error("Failed to update proposal:", updateError.message);
    return Response.json(
      { success: false, message: "Failed to reject proposal" },
      { status: 500 }
    );
  }

  // Insert notification for parent
  let notifBody = "The educator has declined your session proposal.";
  if (rejectionReason && typeof rejectionReason === "string" && rejectionReason.trim()) {
    notifBody += ` Reason: ${rejectionReason.trim()}`;
  }

  const { error: notifError } = await supabaseAdmin
    .from("notifications")
    .insert({
      user_id: proposal.parent_id,
      type: "proposal_rejected",
      title: "Proposal Declined",
      body: notifBody,
      metadata: { proposal_id: proposal.id, educator_id: educatorId },
    });

  if (notifError) {
    console.error("Failed to insert notification:", notifError.message);
  }

  return Response.json(
    {
      success: true,
      proposal_id: proposal.id,
      new_status: "rejected",
    },
    { status: 200 }
  );
}


// --- Counter handler ---
// Validates counter fields, updates proposal to 'countered', resets expiry, notifies parent.
async function handleCounter(
  proposal: Record<string, any>,
  educatorId: string,
  counterFields: {
    counter_rate_inr?: number;
    counter_sessions_per_week?: number;
    counter_total_sessions?: number;
    counter_notes?: string;
  }
): Promise<Response> {
  const {
    counter_rate_inr,
    counter_sessions_per_week,
    counter_total_sessions,
    counter_notes,
  } = counterFields;

  // Validate required counter fields
  const errors: string[] = [];

  if (counter_rate_inr === undefined || counter_rate_inr === null) {
    errors.push("counter_rate_inr is required for counter action");
  } else if (typeof counter_rate_inr !== "number" || !Number.isInteger(counter_rate_inr) || counter_rate_inr < 1) {
    errors.push("counter_rate_inr must be a positive integer");
  }

  if (counter_sessions_per_week === undefined || counter_sessions_per_week === null) {
    errors.push("counter_sessions_per_week is required for counter action");
  } else if (
    typeof counter_sessions_per_week !== "number" ||
    !Number.isInteger(counter_sessions_per_week) ||
    counter_sessions_per_week < 1 ||
    counter_sessions_per_week > 7
  ) {
    errors.push("counter_sessions_per_week must be an integer between 1 and 7");
  }

  if (counter_total_sessions === undefined || counter_total_sessions === null) {
    errors.push("counter_total_sessions is required for counter action");
  } else if (
    typeof counter_total_sessions !== "number" ||
    !Number.isInteger(counter_total_sessions) ||
    counter_total_sessions < 1
  ) {
    errors.push("counter_total_sessions must be an integer >= 1");
  }

  if (
    counter_notes !== undefined &&
    counter_notes !== null &&
    (typeof counter_notes !== "string" || counter_notes.length > 500)
  ) {
    errors.push("counter_notes must be a string with maximum 500 characters");
  }

  if (errors.length > 0) {
    return Response.json(
      { success: false, message: "Validation failed", errors },
      { status: 400 }
    );
  }

  // Fetch educator's min_rate_inr to validate counter rate
  const { data: educator, error: educatorError } = await supabaseAdmin
    .from("educator_profiles")
    .select("min_rate_inr, session_rate_inr")
    .eq("id", educatorId)
    .single();

  if (educatorError || !educator) {
    console.error("Failed to fetch educator profile:", educatorError?.message);
    return Response.json(
      { success: false, message: "Failed to validate counter rate" },
      { status: 500 }
    );
  }

  // Validate counter_rate_inr >= educator's min_rate_inr
  const effectiveMinRate =
    educator.min_rate_inr !== null && educator.min_rate_inr !== undefined
      ? educator.min_rate_inr
      : educator.session_rate_inr;

  if (counter_rate_inr! < effectiveMinRate) {
    return Response.json(
      { success: false, message: "Counter rate cannot be below your minimum acceptable rate" },
      { status: 400 }
    );
  }

  // Update proposal: status → 'countered', store counter fields, reset expires_at
  const now = new Date().toISOString();
  const newExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

  const { error: updateError } = await supabaseAdmin
    .from("session_proposals")
    .update({
      status: "countered",
      counter_rate_inr,
      counter_sessions_per_week,
      counter_total_sessions,
      counter_notes: counter_notes || null,
      responded_at: now,
      expires_at: newExpiresAt,
    })
    .eq("id", proposal.id);

  if (updateError) {
    console.error("Failed to update proposal:", updateError.message);
    return Response.json(
      { success: false, message: "Failed to counter proposal" },
      { status: 500 }
    );
  }

  // Insert notification for parent
  const { error: notifError } = await supabaseAdmin
    .from("notifications")
    .insert({
      user_id: proposal.parent_id,
      type: "proposal_countered",
      title: "Counter-Offer Received",
      body: "The educator has proposed different terms. Review their counter-offer.",
      metadata: { proposal_id: proposal.id, educator_id: educatorId },
    });

  if (notifError) {
    console.error("Failed to insert notification:", notifError.message);
  }

  return Response.json(
    {
      success: true,
      proposal_id: proposal.id,
      new_status: "countered",
    },
    { status: 200 }
  );
}
