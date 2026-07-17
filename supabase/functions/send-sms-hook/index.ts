import "@supabase/functions-js/edge-runtime.d.ts";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

// Supabase Send SMS Auth Hook.
// Supabase calls this function whenever it needs to deliver an auth SMS (e.g. the
// phone OTP). Supabase GENERATES and VERIFIES the OTP itself; this function only
// delivers the provided code through MSG91 using the existing OTP template.
Deno.serve(async (req) => {
  try {
    const payload = await req.text();
    const headers = Object.fromEntries(req.headers);

    // Verify the request really came from Supabase (Standard Webhooks signature).
    const rawSecret = Deno.env.get("SEND_SMS_HOOK_SECRET") ?? "";
    const base64Secret = rawSecret.replace("v1,whsec_", "");

    let data: { user?: { phone?: string }; sms?: { otp?: string } };
    try {
      const wh = new Webhook(base64Secret);
      data = wh.verify(payload, headers) as typeof data;
    } catch (err) {
      console.error('[send-sms-hook] signature verification error:', err);
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const phone = data.user?.phone;
    const otp = data.sms?.otp;
    if (!phone || !otp) {
      return new Response(
        JSON.stringify({ error: "Missing phone or otp in payload" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const authKey = Deno.env.get("MSG91_AUTH_KEY")!;
    const templateId = Deno.env.get("MSG91_TEMPLATE_ID")!;

    // MSG91 wants digits only (no leading +). Pass our own `otp` so MSG91 sends
    // the exact code Supabase generated rather than generating a new one.
    const mobile = phone.replace(/^\+/, "");

    const resp = await fetch("https://control.msg91.com/api/v5/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json", "authkey": authKey },
      body: JSON.stringify({ template_id: templateId, mobile, otp }),
    });

    const result = await resp.json();
    if (!resp.ok) {
      return new Response(
        JSON.stringify({ error: "MSG91 send failed", detail: result }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Supabase expects a 200 with an (optionally empty) JSON body on success.
    return new Response(
      JSON.stringify({}),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error('[send-sms-hook] error:', err);
    return new Response(
      JSON.stringify({ error: "Server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
