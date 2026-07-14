import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// Parent responds to an educator's counter-proposal: accept or withdraw.
// Only the parent who created the original proposal can respond.

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  try {
    // --- 1. Authenticate parent via auth header ---
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
    const { proposal_id, action } = body;

    if (!proposal_id || !action) {
      return Response.json(
        { success: false, message: "proposal_id and action are required" },
        { status: 400 }
      );
    }

    if (!["accept", "withdraw"].includes(action)) {
      return Response.json(
        { success: false, message: "action must be 'accept' or 'withdraw'" },
        { status: 400 }
      );
    }

    // --- 3. Fetch proposal where parent_id = auth.uid() ---
    const { data: proposal, error: fetchError } = await supabaseAdmin
      .from("session_proposals")
      .select("*")
      .eq("id", proposal_id)
      .eq("parent_id", user.id)
      .single();

    if (fetchError || !proposal) {
      return Response.json(
        { success: false, message: "Proposal not found or not yours" },
        { status: 403 }
      );
    }

    // --- 4. Check proposal status is 'countered' ---
    if (proposal.status !== "countered") {
      return Response.json(
        { success: false, message: "Can only respond to proposals with status 'countered'" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // --- 5. Handle "accept" action ---
    if (action === "accept") {
      // Update proposal status to parent_accepted with counter values as effective
      const { error: updateError } = await supabaseAdmin
        .from("session_proposals")
        .update({
          status: "parent_accepted",
          responded_at: now,
        })
        .eq("id", proposal_id);

      if (updateError) {
        console.error("Failed to update proposal:", updateError.message);
        return Response.json(
          { success: false, message: "Failed to update proposal" },
          { status: 500 }
        );
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
          proposal_id: proposal.id,
          granted_at: now,
        })
        .select("id")
        .single();

      if (consentError || !consentGrant) {
        console.error("Failed to create consent grant:", consentError?.message);
        return Response.json(
          { success: false, message: "Failed to create consent grant" },
          { status: 500 }
        );
      }

      // Create consent_request for audit trail
      const { error: consentReqError } = await supabaseAdmin
        .from("consent_requests")
        .insert({
          requestor_id: proposal.educator_id,
          child_id: proposal.child_id,
          reason: `Session package: ${proposal.counter_total_sessions} sessions at ₹${proposal.counter_rate_inr}/session`,
          status: "approved",
        });

      if (consentReqError) {
        console.error("Failed to create consent request:", consentReqError.message);
        // Non-fatal — consent grant already created
      }

      // Create payment record using counter values
      const subtotal = proposal.counter_total_sessions * proposal.counter_rate_inr;
      const gst = Math.round(subtotal * 0.18);
      const total = subtotal + gst;

      const { data: payment, error: paymentError } = await supabaseAdmin
        .from("proposal_payments")
        .insert({
          proposal_id: proposal.id,
          parent_id: proposal.parent_id,
          educator_id: proposal.educator_id,
          sessions_count: proposal.counter_total_sessions,
          rate_per_session: proposal.counter_rate_inr,
          subtotal_inr: subtotal,
          gst_inr: gst,
          total_inr: total,
          status: "pending",
        })
        .select("id")
        .single();

      if (paymentError || !payment) {
        console.error("Failed to create payment record:", paymentError?.message);
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
        .eq("id", proposal_id);

      if (linkError) {
        console.error("Failed to link consent/payment to proposal:", linkError.message);
      }

      // Insert notification for educator
      const { error: notifError } = await supabaseAdmin
        .from("notifications")
        .insert({
          user_id: proposal.educator_id,
          type: "counter_accepted",
          title: "Counter-Offer Accepted",
          body: "The parent accepted your counter-offer. Payment is pending.",
          metadata: { proposal_id: proposal.id, parent_id: user.id },
        });

      if (notifError) {
        console.error("Failed to insert notification:", notifError.message);
      }

      return Response.json({
        success: true,
        proposal_id: proposal.id,
        new_status: "parent_accepted",
        consent_grant_id: consentGrant.id,
        payment_id: payment.id,
      });
    }

    // --- 6. Handle "withdraw" action ---
    if (action === "withdraw") {
      const { error: updateError } = await supabaseAdmin
        .from("session_proposals")
        .update({
          status: "withdrawn",
          responded_at: now,
        })
        .eq("id", proposal_id);

      if (updateError) {
        console.error("Failed to update proposal:", updateError.message);
        return Response.json(
          { success: false, message: "Failed to update proposal" },
          { status: 500 }
        );
      }

      // Insert notification for educator
      const { error: notifError } = await supabaseAdmin
        .from("notifications")
        .insert({
          user_id: proposal.educator_id,
          type: "counter_withdrawn",
          title: "Proposal Withdrawn",
          body: "The parent has withdrawn from the session proposal.",
          metadata: { proposal_id: proposal.id, parent_id: user.id },
        });

      if (notifError) {
        console.error("Failed to insert notification:", notifError.message);
      }

      return Response.json({
        success: true,
        proposal_id: proposal.id,
        new_status: "withdrawn",
      });
    }

    // Should not reach here due to validation above
    return Response.json(
      { success: false, message: "Invalid action" },
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
