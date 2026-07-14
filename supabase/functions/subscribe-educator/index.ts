import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// Educator subscription via Razorpay Payment Links (one-time annual payment).
// Flow: educator selects plan → creates Payment Link → educator pays in browser →
// webhook (payment.captured) confirms payment → subscription activates.

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
    const planId = body.plan_id || "basic";

    if (!["basic", "premium"].includes(planId)) {
      return Response.json(
        { success: false, message: "plan_id must be 'basic' or 'premium'" },
        { status: 400 }
      );
    }

    // --- 3. Verify educator profile ---
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("educator_profiles")
      .select("id, is_verified, subscription_status")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return Response.json(
        { success: false, message: "Educator profile not found" },
        { status: 404 }
      );
    }

    if (!profile.is_verified) {
      return Response.json(
        { success: false, message: "RCI verification required before subscribing" },
        { status: 403 }
      );
    }

    if (profile.subscription_status === "active") {
      return Response.json({
        success: true,
        already_active: true,
        message: "You already have an active subscription.",
      });
    }

    // --- 4. Get plan details ---
    const { data: plan } = await supabaseAdmin
      .from("subscription_plans")
      .select("*")
      .eq("id", planId)
      .eq("active", true)
      .single();

    if (!plan) {
      return Response.json(
        { success: false, message: "Plan not found or inactive" },
        { status: 404 }
      );
    }

    // --- 5. Create Razorpay Payment Link (one-time payment) ---
    const amountPaise = plan.price_inr * 100;

    const paymentLinkPayload: Record<string, unknown> = {
      amount: amountPaise,
      currency: "INR",
      description: `V-SPED ${plan.name} — Annual Subscription`,
      customer: {},
      notify: { sms: false, email: false },
      notes: {
        educator_id: user.id,
        plan_id: planId,
        type: "subscription",
        platform: "v-sped",
      },
      // No callback_url — Razorpay shows its own success page
      // User returns to app manually and refreshes to see active status
    };

    // Add contact info if available
    if (user.phone) {
      (paymentLinkPayload.customer as Record<string, string>).contact = user.phone;
    }
    if (user.email) {
      (paymentLinkPayload.customer as Record<string, string>).email = user.email;
    }

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

    // --- 6. Store pending subscription state ---
    await supabaseAdmin
      .from("educator_profiles")
      .update({
        subscription_status: "pending",
        subscription_plan: planId,
      })
      .eq("id", user.id);

    // Record the pending payment
    await supabaseAdmin
      .from("subscription_payments")
      .insert({
        educator_id: user.id,
        plan_id: planId,
        amount_inr: plan.price_inr,
        status: "pending",
        razorpay_payment_id: paymentLink.id,
      });

    // --- 7. Return checkout URL ---
    return Response.json({
      success: true,
      checkout_url: paymentLink.short_url,
      payment_link_id: paymentLink.id,
      plan: planId,
      amount_inr: plan.price_inr,
      message: "Complete payment at the checkout URL to activate your subscription.",
    });

  } catch (err) {
    console.error("Server error:", err);
    return Response.json({ success: false, message: "Server error" }, { status: 500 });
  }
});
