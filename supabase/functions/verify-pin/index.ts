import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  try {
    const { user_id, pin } = await req.json();

    if (!user_id || !pin) {
      return Response.json(
        { success: false, message: "user_id and pin are required" },
        { status: 400 }
      );
    }

    // Get user's stored pin_hash, role, and failed attempt count
    const { data: userData, error: fetchError } = await supabase
      .from("users")
      .select("pin_hash, role, failed_pin_attempts, pin_locked_until")
      .eq("id", user_id)
      .single();

    if (fetchError || !userData) {
      return Response.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Check if account is locked
    if (userData.pin_locked_until) {
      const lockedUntil = new Date(userData.pin_locked_until);
      if (lockedUntil > new Date()) {
        return Response.json(
          { success: false, message: "Account locked. Try again in 15 minutes." },
          { status: 403 }
        );
      }
    }

    // Verify PIN
    const inputHash = await hashPin(pin);
    const isValid = inputHash === userData.pin_hash;

    if (!isValid) {
      const failedAttempts = (userData.failed_pin_attempts ?? 0) + 1;

      if (failedAttempts >= 5) {
        // Lock account for 15 minutes
        const lockUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        await supabase
          .from("users")
          .update({ failed_pin_attempts: failedAttempts, pin_locked_until: lockUntil })
          .eq("id", user_id);

        return Response.json(
          { success: false, message: "Too many attempts. Account locked for 15 minutes." },
          { status: 403 }
        );
      }

      await supabase
        .from("users")
        .update({ failed_pin_attempts: failedAttempts })
        .eq("id", user_id);

      return Response.json(
        { success: false, message: `Incorrect PIN. ${5 - failedAttempts} attempts remaining.` },
        { status: 401 }
      );
    }

    // PIN correct — reset failed attempts
    await supabase
      .from("users")
      .update({ failed_pin_attempts: 0, pin_locked_until: null })
      .eq("id", user_id);

    return Response.json({
      success: true,
      user_id: user_id,
      role: userData.role ?? "parent",
      message: "PIN verified successfully",
    });

  } catch (err) {
    console.error('[verify-pin] error:', err);
    return Response.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
});