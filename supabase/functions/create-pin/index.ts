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

    if (!/^\d{4}$/.test(pin)) {
      return Response.json(
        { success: false, message: "PIN must be exactly 4 digits" },
        { status: 400 }
      );
    }

    const pin_hash = await hashPin(pin);

    const { error } = await supabase
      .from("users")
      .update({ pin_hash: pin_hash })
      .eq("id", user_id);

    if (error) {
      return Response.json(
        { success: false, message: "Failed to save PIN" },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      message: "PIN created successfully",
    });

  } catch (err) {
    console.error('[create-pin] error:', err);
    return Response.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
});