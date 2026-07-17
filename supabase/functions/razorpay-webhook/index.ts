import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// Razorpay webhook handler.
// Receives payment events from Razorpay and updates subscription/payment status.
// No JWT auth — verified via HMAC-SHA256 signature instead.

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

/**
 * Verify Razorpay webhook signature using HMAC-SHA256.
 * Compares the computed signature against X-Razorpay-Signature header.
 */
async function verifyWebhookSignature(
  body: string,
  signature: string
): Promise<boolean> {
  const secret = Deno.env.get("RAZORPAY_KEY_SECRET")!;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signed = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const computed = Array.from(new Uint8Array(signed))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Constant-time comparison
  if (computed.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < computed.length; i++) {
    mismatch |= computed.codePointAt(i)! ^ signature.codePointAt(i)!;
  }
  return mismatch === 0;
}

Deno.serve(async (req) => {
  // Always return 200 to Razorpay (they retry on non-200)
  try {
    const signature = req.headers.get("X-Razorpay-Signature") || "";
    const rawBody = await req.text();

    // Verify signature
    if (!signature || !(await verifyWebhookSignature(rawBody, signature))) {
      console.error("Webhook signature verification failed");
      // Still return 200 to avoid retries on invalid calls
      return Response.json({ status: "signature_invalid" }, { status: 200 });
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    const entity = payload.payload;

    console.log(`Razorpay webhook received: ${event}`);

    switch (event) {
      case "subscription.charged": {
        await handleSubscriptionCharged(entity);
        break;
      }
      case "subscription.activated": {
        await handleSubscriptionCharged(entity);
        break;
      }
      case "subscription.authenticated": {
        // Auth payment made — subscription is being set up, no action needed yet
        console.log("Subscription authenticated — awaiting activation");
        break;
      }
      case "subscription.cancelled": {
        await handleSubscriptionCancelled(entity);
        break;
      }
      case "payment.captured": {
        await handlePaymentCaptured(entity);
        break;
      }
      case "payment_link.paid": {
        await handlePaymentLinkPaid(entity);
        break;
      }
      case "order.paid": {
        await handlePaymentCaptured(entity);
        break;
      }
      default: {
        console.log(`Unhandled webhook event: ${event}`);
      }
    }

    return Response.json({ status: "ok" }, { status: 200 });
  } catch (err) {
    console.error("Webhook processing error:", err);
    // Always return 200 so Razorpay doesn't keep retrying
    return Response.json({ status: "error_logged" }, { status: 200 });
  }
});

/**
 * Handle subscription.charged event.
 * Activates the educator's subscription and records payment.
 */
async function handleSubscriptionCharged(entity: Record<string, unknown>) {
  const subscription = (entity.subscription as Record<string, unknown>)?.entity as Record<string, unknown>;
  if (!subscription) {
    console.error("No subscription entity in payload");
    return;
  }

  const subscriptionId = subscription.id as string;
  const notes = subscription.notes as Record<string, string> | undefined;
  const educatorId = notes?.educator_id;

  if (!educatorId) {
    console.error("No educator_id in subscription notes");
    return;
  }

  // Set expiry to 1 year from now
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  // Activate subscription
  const { error: updateError } = await supabaseAdmin
    .from("educator_profiles")
    .update({
      subscription_status: "active",
      subscription_expires_at: expiresAt,
      razorpay_subscription_id: subscriptionId,
    })
    .eq("id", educatorId);

  if (updateError) {
    console.error("Failed to activate subscription:", updateError.message);
    return;
  }

  // Update payment record
  const payment = (entity.payment as Record<string, unknown>)?.entity as Record<string, unknown>;
  await supabaseAdmin
    .from("subscription_payments")
    .update({
      status: "captured",
      paid_at: new Date().toISOString(),
      razorpay_payment_id: payment?.id || null,
    })
    .eq("razorpay_subscription_id", subscriptionId)
    .eq("status", "pending");

  console.log(`Subscription activated for educator: ${educatorId}`);
}

/**
 * Handle subscription.cancelled event.
 * Marks the educator's subscription as cancelled.
 */
async function handleSubscriptionCancelled(entity: Record<string, unknown>) {
  const subscription = (entity.subscription as Record<string, unknown>)?.entity as Record<string, unknown>;
  if (!subscription) {
    console.error("No subscription entity in payload");
    return;
  }

  const subscriptionId = subscription.id as string;
  const notes = subscription.notes as Record<string, string> | undefined;
  const educatorId = notes?.educator_id;

  if (!educatorId) {
    // Fallback: find by subscription ID
    const { data: profile } = await supabaseAdmin
      .from("educator_profiles")
      .select("id")
      .eq("razorpay_subscription_id", subscriptionId)
      .single();

    if (profile) {
      await supabaseAdmin
        .from("educator_profiles")
        .update({ subscription_status: "cancelled" })
        .eq("id", profile.id);
      console.log(`Subscription cancelled for educator: ${profile.id}`);
    }
    return;
  }

  await supabaseAdmin
    .from("educator_profiles")
    .update({ subscription_status: "cancelled" })
    .eq("id", educatorId);

  console.log(`Subscription cancelled for educator: ${educatorId}`);
}

/**
 * Handle payment.captured event.
 * For both subscription payments (educator) and session payments (parent).
 * Differentiates by checking notes.educator_id (subscription) or notes.proposal_id (session).
 */
async function handlePaymentCaptured(entity: Record<string, unknown>) {
  const payment = (entity.payment as Record<string, unknown>)?.entity as Record<string, unknown>;
  if (!payment) {
    console.error("No payment entity in payload");
    return;
  }

  const paymentId = payment.id as string;
  const notes = payment.notes as Record<string, string> | undefined;

  // Check if this is a subscription payment (has educator_id in notes but no proposal_id)
  if (notes?.educator_id && !notes?.proposal_id) {
    await handleSubscriptionPayment(paymentId, notes.educator_id, notes.plan_id);
    return;
  }

  // Check if this is a session/proposal payment (has proposal_id in notes or matching order)
  const orderId = payment.order_id as string | undefined;

  // Try to match by payment link notes first
  if (notes?.proposal_id) {
    await handleProposalPayment(paymentId, notes.proposal_id);
    return;
  }

  // Fallback: try to match by order_id
  if (!orderId) {
    console.log(`Payment ${paymentId} captured — no matching context (no notes or order)`);
    return;
  }

  // Check proposal_payments by order_id
  const { data: proposalPayment, error } = await supabaseAdmin
    .from("proposal_payments")
    .select("id, proposal_id")
    .eq("razorpay_order_id", orderId)
    .eq("status", "pending")
    .single();

  if (error || !proposalPayment) {
    console.log(`Payment captured for order ${orderId} — no matching proposal payment`);
    return;
  }

  await handleProposalPayment(paymentId, proposalPayment.proposal_id);
}

/**
 * Handle a subscription payment capture — activate the educator's subscription.
 */
async function handleSubscriptionPayment(paymentId: string, educatorId: string, planId?: string) {
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  const { error: updateError } = await supabaseAdmin
    .from("educator_profiles")
    .update({
      subscription_status: "active",
      subscription_expires_at: expiresAt,
      subscription_plan: planId || 'basic',
    })
    .eq("id", educatorId);

  if (updateError) {
    console.error("Failed to activate subscription:", updateError.message);
    return;
  }

  // Update subscription_payments record
  await supabaseAdmin
    .from("subscription_payments")
    .update({
      status: "captured",
      paid_at: new Date().toISOString(),
      razorpay_payment_id: paymentId,
    })
    .eq("educator_id", educatorId)
    .eq("status", "pending");

  console.log(`Subscription activated for educator: ${educatorId}`);
}

/**
 * Handle a proposal/session payment capture.
 */
async function handleProposalPayment(paymentId: string, proposalId: string) {
  // Update proposal payment status
  await supabaseAdmin
    .from("proposal_payments")
    .update({
      status: "captured",
      razorpay_payment_id: paymentId,
      paid_at: new Date().toISOString(),
    })
    .eq("proposal_id", proposalId)
    .eq("status", "pending");

  // Update the proposal status to 'paid'
  await supabaseAdmin
    .from("session_proposals")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
    })
    .eq("id", proposalId);

  // Notify the educator that payment was received
  const { data: proposal } = await supabaseAdmin
    .from("session_proposals")
    .select("educator_id, total_sessions, proposed_rate_inr")
    .eq("id", proposalId)
    .single();

  if (proposal) {
    await supabaseAdmin
      .from("notifications")
      .insert({
        user_id: proposal.educator_id,
        type: "payment_received",
        title: "Payment Received",
        body: `Payment confirmed for ${proposal.total_sessions} sessions. Sessions are now active.`,
        metadata: {
          proposal_id: proposalId,
          payment_id: paymentId,
        },
      });
  }

  console.log(`Payment captured for proposal: ${proposalId}`);

  // Trigger session generation after payment is captured
  try {
    await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ proposal_id: proposalId }),
    });
  } catch (genErr) {
    console.error("Failed to trigger session generation:", genErr);
  }
}

/**
 * Handle payment_link.paid event.
 * Fires when a payment link (used for session payments) is completed.
 */
async function handlePaymentLinkPaid(entity: Record<string, unknown>) {
  const paymentLink = (entity.payment_link as Record<string, unknown>)?.entity as Record<string, unknown>;
  if (!paymentLink) {
    console.error("No payment_link entity in payload");
    return;
  }

  const paymentLinkId = paymentLink.id as string;
  const notes = paymentLink.notes as Record<string, string> | undefined;
  const proposalId = notes?.proposal_id;

  if (!proposalId) {
    console.log(`Payment link paid but no proposal_id in notes: ${paymentLinkId}`);
    return;
  }

  // Find the proposal payment by payment link ID
  const { data: proposalPayment, error } = await supabaseAdmin
    .from("proposal_payments")
    .select("id, proposal_id")
    .eq("razorpay_payment_link_id", paymentLinkId)
    .eq("status", "pending")
    .single();

  if (error || !proposalPayment) {
    // Try finding by proposal_id from notes
    const { data: fallback } = await supabaseAdmin
      .from("proposal_payments")
      .select("id, proposal_id")
      .eq("proposal_id", proposalId)
      .eq("status", "pending")
      .single();

    if (!fallback) {
      console.log(`No pending proposal payment found for link: ${paymentLinkId}`);
      return;
    }

    // Use fallback
    await captureProposalPayment(fallback.id, fallback.proposal_id, paymentLinkId);
    return;
  }

  await captureProposalPayment(proposalPayment.id, proposalPayment.proposal_id, paymentLinkId);
}

/**
 * Shared logic to mark a proposal payment as captured.
 */
async function captureProposalPayment(paymentRecordId: string, proposalId: string, referenceId: string) {
  // Update proposal payment status
  await supabaseAdmin
    .from("proposal_payments")
    .update({
      status: "captured",
      razorpay_payment_id: referenceId,
      paid_at: new Date().toISOString(),
    })
    .eq("id", paymentRecordId);

  // Update the proposal status to 'paid'
  await supabaseAdmin
    .from("session_proposals")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
    })
    .eq("id", proposalId);

  // Notify the educator
  const { data: proposal } = await supabaseAdmin
    .from("session_proposals")
    .select("educator_id, total_sessions, proposed_rate_inr")
    .eq("id", proposalId)
    .single();

  if (proposal) {
    await supabaseAdmin
      .from("notifications")
      .insert({
        user_id: proposal.educator_id,
        type: "payment_completed",
        title: "Payment Received",
        body: `Payment confirmed for ${proposal.total_sessions} sessions. Sessions are now active.`,
        metadata: {
          proposal_id: proposalId,
        },
      });
  }

  console.log(`Payment link paid — proposal marked as paid: ${proposalId}`);

  // Trigger session generation after payment is captured
  try {
    await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ proposal_id: proposalId }),
    });
  } catch (genErr) {
    console.error("Failed to trigger session generation:", genErr);
  }
}
