import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

    const { full_name, rci_number, subjects, languages, bio, city, session_rate_inr, max_group_size, min_rate_inr } = await req.json();

    if (!full_name || !rci_number) {
      return Response.json(
        { success: false, message: "full_name and rci_number are required" },
        { status: 400 }
      );
    }

    // Determine effective min_rate_inr: default to session_rate_inr if not provided
    const effective_min_rate_inr = min_rate_inr ?? session_rate_inr ?? null;

    // Validate min_rate_inr if explicitly provided
    if (min_rate_inr !== undefined && min_rate_inr !== null) {
      if (min_rate_inr <= 0) {
        return Response.json(
          { success: false, message: "Minimum rate must be greater than zero" },
          { status: 400 }
        );
      }
      if (session_rate_inr && min_rate_inr < session_rate_inr - 100) {
        return Response.json(
          { success: false, message: "Minimum rate must be within ₹100 of your listed rate" },
          { status: 400 }
        );
      }
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
        id: user.id,
        rci_number,
        subjects: subjects || [],
        languages: languages || [],
        bio: bio || null,
        city: city || null,
        session_rate_inr: session_rate_inr || null,
        min_rate_inr: effective_min_rate_inr,
        max_group_size: max_group_size || 1,
        verification_status: 'pending',
        // is_verified remains false until verify-rci is called
      }, { onConflict: "id" })
      .select("id, rci_number, is_verified, verification_status, subscription_status, min_rate_inr, session_rate_inr")
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
        user_id: profile.id,
        rci_number: profile.rci_number,
        rci_verified: profile.is_verified,
        verification_status: profile.verification_status,
        subscription_status: profile.subscription_status,
        session_rate_inr: profile.session_rate_inr,
        min_rate_inr: profile.min_rate_inr,
      },
      message: "Educator profile created. Please verify your RCI number to get listed.",
    });

  } catch (err) {
    console.error('[create-educator-profile] error:', err);
    return Response.json({ success: false, message: "Server error" }, { status: 500 });
  }
});
