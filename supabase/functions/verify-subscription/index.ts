import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// Verify subscription payment status by checking with Razorpay directly.
// Called when educator refreshes subscription screen — checks if payment link was paid.
// This is a fallback for when the webhook doesn't fire.

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
    // Auth
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

    // Get educator profile
    const { data: profile } = await supabaseAdmin
      .from("educator_profiles")
      .select("id, subscription_status")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return Response.json({ success: false, message: "Profile not found" }, { status: 404 });
    }

    // If already active, just return
    if (profile.subscription_status === "active") {
      return Response.json({ success: true, status: "active" });
    }

    // If not pending, nothing to verify
    if (profile.subscription_status !== "pending") {
      return Response.json({ success: true, status: profile.subscription_status });
    }

    // Find the most recent pending subscription payment for this educator
    const { data: payment } = await supabaseAdmin
      .from("subscription_payments")
      .select("id, razorpay_payment_id, status")
      .eq("educator_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!payment?.razorpay_payment_id) {
      return Response.json({ success: true, status: "pending", message: "No payment link found" });
    }

    // Check the payment link status with Razorpay
    const linkResponse = await fetch(
      `${RAZORPAY_BASE}/payment_links/${payment.razorpay_payment_id}`,
      {
        headers: { "Authorization": getRazorpayAuth() },
      }
    );

    if (!linkResponse.ok) {
      console.error("Failed to fetch payment link status:", await linkResponse.text());
      return Response.json({ success: true, status: "pending", message: "Could not verify with Razorpay" });
    }

    const linkData = await linkResponse.json();

    // Check if payment link is paid
    if (linkData.status === "paid") {
      // Activate subscription!
      const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

      await supabaseAdmin
        .from("educator_profiles")
        .update({
          subscription_status: "active",
          subscription_expires_at: expiresAt,
        })
        .eq("id", user.id);

      // Update payment record
      await supabaseAdmin
        .from("subscription_payments")
        .update({
          status: "captured",
          paid_at: new Date().toISOString(),
        })
        .eq("id", payment.id);

      return Response.json({ success: true, status: "active", message: "Subscription activated!" });
    }

    // Not yet paid
    return Response.json({ success: true, status: linkData.status || "pending" });

  } catch (err) {
    console.error("Server error:", err);
    return Response.json({ success: false, message: "Server error" }, { status: 500 });
  }
});
