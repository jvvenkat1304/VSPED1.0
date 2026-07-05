import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Creates or updates an educator's profile.
// The educator must already have a user account (signed up via phone OTP).
// This sets their role to 'special_educator' and populates their profile.

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

    const { full_name, rci_number, subjects, languages, bio, city, session_rate_inr, max_group_size } = await req.json();

    if (!full_name || !rci_number) {
      return Response.json(
        { success: false, message: "full_name and rci_number are required" },
        { status: 400 }
      );
    }

    // Update user role to special_educator
    await supabaseAdmin
      .from("users")
      .update({ role: "special_educator", full_name })
      .eq("id", user.id);

    // Upsert educator profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("educator_profiles")
      .upsert({
        user_id: user.id,
        rci_number,
        subjects: subjects || [],
        languages: languages || [],
        bio: bio || null,
        city: city || null,
        session_rate_inr: session_rate_inr || null,
        max_group_size: max_group_size || 1,
        // rci_verified remains false until verify-rci is called
      }, { onConflict: "user_id" })
      .select("user_id, rci_number, rci_verified, subscription_status")
      .single();

    if (profileError) {
      return Response.json(
        { success: false, message: "Failed to create profile", detail: profileError.message },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      profile: {
        user_id: profile.user_id,
        rci_number: profile.rci_number,
        rci_verified: profile.rci_verified,
        subscription_status: profile.subscription_status,
      },
      message: "Educator profile created. Please verify your RCI number to get listed.",
    });

  } catch (_err) {
    return Response.json({ success: false, message: "Server error" }, { status: 500 });
  }
});
