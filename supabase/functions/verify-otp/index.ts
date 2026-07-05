import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// Verifies the phone OTP that Supabase generated (and MSG91 delivered).
// Uses the ANON client for verifyOtp so a real session is returned, and a
// service-role client to read the user's profile row.
const supabaseAnon = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!
);

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  try {
    const { phone, otp_code } = await req.json();

    if (!phone || !otp_code) {
      return Response.json(
        { success: false, message: "Phone and OTP code are required" },
        { status: 400 }
      );
    }

    const e164 = phone.startsWith("+") ? phone : `+${phone}`;

    // Verify the OTP against Supabase Auth (returns a real session on success).
    const { data, error } = await supabaseAnon.auth.verifyOtp({
      phone: e164,
      token: otp_code,
      type: "sms",
    });

    if (error || !data.user) {
      return Response.json(
        { success: false, message: "Invalid or expired OTP" },
        { status: 401 }
      );
    }

    // Check if user already has a PIN set (new vs returning user).
    const { data: userData } = await supabaseAdmin
      .from("users")
      .select("pin_hash, full_name, role")
      .eq("id", data.user.id)
      .single();

    const isNewUser = !userData?.pin_hash;

    return Response.json({
      success: true,
      user_id: data.user.id,
      session_token: data.session?.access_token,
      refresh_token: data.session?.refresh_token,
      is_new_user: isNewUser,
      role: userData?.role ?? "parent",
      message: isNewUser ? "OTP verified - please create PIN" : "OTP verified",
    });

  } catch (_err) {
    return Response.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
});
