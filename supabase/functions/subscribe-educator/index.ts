import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Creates a Razorpay subscription for the educator.
// Flow: educator selects a plan → this function creates a Razorpay subscription
// → returns the subscription link/id for payment → webhook confirms payment.
//
// For now (pre-Razorpay integration): activates the subscription directly
// with a placeholder. Once Razorpay is set up, this will:
//   1. Create a Razorpay customer (if not exists)
//   2. Create a Razorpay subscription with the plan
//   3. Return the short_url for payment
//   4. A separate webhook handles payment confirmation

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

    const { plan_id } = await req.json();

    if (!plan_id || !["basic", "premium"].includes(plan_id)) {
      return Response.json(
        { success: false, message: "plan_id must be 'basic' or 'premium'" },
        { status: 400 }
      );
    }

    // Verify educator profile exists and is RCI-verified
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

    // Get the plan details
    const { data: plan } = await supabaseAdmin
      .from("subscription_plans")
      .select("*")
      .eq("id", plan_id)
      .eq("active", true)
      .single();

    if (!plan) {
      return Response.json(
        { success: false, message: "Plan not found or inactive" },
        { status: 404 }
      );
    }

    // -----------------------------------------------------------------
    // TODO: Razorpay integration
    // When Razorpay is configured:
    //   1. const razorpay = new Razorpay({ key_id, key_secret });
    //   2. Create customer: razorpay.customers.create(...)
    //   3. Create subscription: razorpay.subscriptions.create(...)
    //   4. Return subscription.short_url for the educator to pay
    //   5. Payment confirmation comes via webhook → activates subscription
    //
    // For now: directly activate (simulates successful payment)
    // -----------------------------------------------------------------

    const expiresAt = new Date(Date.now() + plan.duration_days * 24 * 60 * 60 * 1000).toISOString();

    // Activate subscription
    const { error: updateError } = await supabaseAdmin
      .from("educator_profiles")
      .update({
        subscription_status: "active",
        subscription_plan: plan_id,
        subscription_expires_at: expiresAt,
      })
      .eq("id", user.id);

    if (updateError) {
      return Response.json(
        { success: false, message: "Failed to activate subscription", detail: updateError.message },
        { status: 500 }
      );
    }

    // Record the payment
    await supabaseAdmin
      .from("subscription_payments")
      .insert({
        educator_id: user.id,
        plan_id: plan_id,
        amount_inr: plan.price_inr,
        status: "captured",  // placeholder — in production, starts as 'pending' until webhook confirms
        paid_at: new Date().toISOString(),
      });

    return Response.json({
      success: true,
      plan: plan_id,
      expires_at: expiresAt,
      amount_inr: plan.price_inr,
      message: `Subscription activated: ${plan.name} (₹${plan.price_inr}/year). You are now listed in the marketplace.`,
      // In production: would return { payment_url: subscription.short_url } for Razorpay checkout
    });

  } catch (_err) {
    return Response.json({ success: false, message: "Server error" }, { status: 500 });
  }
});
