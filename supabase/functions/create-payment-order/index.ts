import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// Creates a Razorpay Payment Link for parent session payments (one-time).
// Uses Payment Links API so the parent can complete payment in their browser
// (works with Expo Go without native SDK).

const RAZORPAY_BASE = "https://api.razorpay.com/v1";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

function getRazorpayAuth(): string {
  const keyId = Deno.env.get("RAZORPAY_KEY_ID")!;
  const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET")!;
  return "Basic " + btoa(`${keyId}:${keySecret}`);
}

Deno.serve(async (req) => {
  try {
    // --- 1. Auth: verify JWT ---
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

    // --- 2. Parse request ---
    const body = await req.json();
    const { proposal_id } = body;

    if (!proposal_id) {
      return Response.json(
        { success: false, message: "proposal_id is required" },
        { status: 400 }
      );
    }

    // --- 3. Fetch proposal and verify ownership ---
    const { data: proposal, error: proposalError } = await supabaseAdmin
      .from("session_proposals")
      .select("id, parent_id, educator_id, total_sessions, proposed_rate_inr, status")
      .eq("id", proposal_id)
      .single();

    if (proposalError || !proposal) {
      return Response.json(
        { success: false, message: "Proposal not found" },
        { status: 404 }
      );
    }

    if (proposal.parent_id !== user.id) {
      return Response.json(
        { success: false, message: "You are not authorized to pay for this proposal" },
        { status: 403 }
      );
    }

    // Only allow payment for accepted proposals
    if (proposal.status !== "accepted") {
      return Response.json(
        { success: false, message: "Proposal must be accepted before payment" },
        { status: 422 }
      );
    }

    // --- 4. Check/create proposal_payments record ---
    let { data: payment } = await supabaseAdmin
      .from("proposal_payments")
      .select("*")
      .eq("proposal_id", proposal_id)
      .single();

    // Calculate amounts
    const subtotal = proposal.total_sessions * proposal.proposed_rate_inr;
    const gst = Math.round(subtotal * 0.18);
    const totalInr = subtotal + gst;
    const totalPaise = totalInr * 100;

    if (!payment) {
      // Create payment record
      const { data: newPayment, error: createError } = await supabaseAdmin
        .from("proposal_payments")
        .insert({
          proposal_id: proposal_id,
          parent_id: user.id,
          educator_id: proposal.educator_id,
          subtotal_inr: subtotal,
          gst_inr: gst,
          total_inr: totalInr,
          status: "pending",
        })
        .select()
        .single();

      if (createError || !newPayment) {
        console.error("Failed to create payment record:", createError?.message);
        return Response.json(
          { success: false, message: "Failed to create payment record" },
          { status: 500 }
        );
      }
      payment = newPayment;
    }

    // If already paid, don't create another link
    if (payment.status === "captured") {
      return Response.json(
        { success: false, message: "This proposal has already been paid" },
        { status: 409 }
      );
    }

    // If there's already a payment link that's not expired, return it
    if (payment.razorpay_payment_link_url && payment.status === "pending") {
      return Response.json({
        success: true,
        checkout_url: payment.razorpay_payment_link_url,
        order_id: payment.razorpay_order_id || null,
        amount_paise: totalPaise,
        amount_inr: totalInr,
        currency: "INR",
      });
    }

    // --- 5. Create Razorpay Payment Link ---
    const customerDetails: Record<string, string> = {};
    if (user.phone) customerDetails.contact = user.phone;
    if (user.email) customerDetails.email = user.email;
    if (user.user_metadata?.full_name) customerDetails.name = user.user_metadata.full_name;

    const paymentLinkPayload: Record<string, unknown> = {
      amount: totalPaise,
      currency: "INR",
      description: `V-SPED: ${proposal.total_sessions} session package`,
      customer: Object.keys(customerDetails).length > 0 ? customerDetails : undefined,
      notify: {
        sms: !!user.phone,
        email: !!user.email,
      },
      notes: {
        proposal_id: proposal_id,
        parent_id: user.id,
        educator_id: proposal.educator_id,
        platform: "v-sped",
      },
      // No callback_url — Razorpay shows its own success page
    };

    const linkResponse = await fetch(`${RAZORPAY_BASE}/payment_links`, {
      method: "POST",
      headers: {
        "Authorization": getRazorpayAuth(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paymentLinkPayload),
    });

    if (!linkResponse.ok) {
      const error = await linkResponse.text();
      console.error("Razorpay payment link creation failed:", error);
      return Response.json(
        { success: false, message: "Failed to create payment link" },
        { status: 502 }
      );
    }

    const paymentLink = await linkResponse.json();

    // --- 6. Update payment record with Razorpay details ---
    await supabaseAdmin
      .from("proposal_payments")
      .update({
        razorpay_order_id: paymentLink.order_id || null,
        razorpay_payment_link_id: paymentLink.id,
        razorpay_payment_link_url: paymentLink.short_url,
      })
      .eq("id", payment.id);

    // --- 7. Return checkout URL ---
    return Response.json({
      success: true,
      checkout_url: paymentLink.short_url,
      payment_link_id: paymentLink.id,
      order_id: paymentLink.order_id || null,
      amount_paise: totalPaise,
      amount_inr: totalInr,
      currency: "INR",
      key_id: Deno.env.get("RAZORPAY_KEY_ID")!,
    });

  } catch (err) {
    console.error("Server error:", err);
    return Response.json({ success: false, message: "Server error" }, { status: 500 });
  }
});
