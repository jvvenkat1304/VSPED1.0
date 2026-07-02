import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Starts Supabase's native phone OTP. Supabase generates the code and calls the
// Send SMS Hook (send-sms-hook), which delivers it via MSG91. Verification is
// handled by verify-otp using supabase.auth.verifyOtp.
Deno.serve(async (req) => {
  try {
    const { phone } = await req.json();

    if (!phone) {
      return Response.json(
        { success: false, message: "Phone number is required" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    // Supabase expects E.164 format with a leading +.
    const e164 = phone.startsWith("+") ? phone : `+${phone}`;

    const { error } = await supabase.auth.signInWithOtp({ phone: e164 });

    if (error) {
      return Response.json(
        { success: false, message: "Failed to send OTP", detail: error.message },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      message: "OTP sent successfully",
    });

  } catch (_err) {
    return Response.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
});
