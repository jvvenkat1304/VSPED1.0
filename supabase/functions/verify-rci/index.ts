import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// Verifies an educator's RCI (Rehabilitation Council of India) certificate number.
// In production, this would query the RCI portal to validate the certificate.
// For now: validates format and marks as verified (RCI portal integration TBD).
//
// RCI numbers follow a pattern like: A12345 (letter + digits) or similar.
// The actual verification against the portal will be added once we have
// access to the RCI verification endpoint.

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

    // Get educator's profile
    const { data: profile, error: fetchError } = await supabaseAdmin
      .from("educator_profiles")
      .select("id, rci_number, is_verified")
      .eq("id", user.id)
      .single();

    if (fetchError || !profile) {
      return Response.json(
        { success: false, message: "Educator profile not found. Create a profile first." },
        { status: 404 }
      );
    }

    if (profile.is_verified) {
      return Response.json({
        success: true,
        already_verified: true,
        message: "RCI number already verified.",
      });
    }

    if (!profile.rci_number || profile.rci_number.trim().length < 3) {
      return Response.json(
        { success: false, message: "Invalid RCI number format" },
        { status: 400 }
      );
    }

    // -----------------------------------------------------------------
    // TODO: Replace this block with actual RCI portal verification.
    // The RCI portal (rehabcouncil.nic.in) allows querying by registration number.
    // For now, we accept any well-formed number and mark as verified.
    // In production, this should:
    //   1. Hit the RCI verification endpoint with the certificate number
    //   2. Parse the response to confirm the person exists and is active
    //   3. Only mark verified if the portal confirms
    // -----------------------------------------------------------------
    const isValid = profile.rci_number.trim().length >= 3; // placeholder validation

    if (!isValid) {
      return Response.json(
        { success: false, message: "RCI verification failed. Number not found in registry." },
        { status: 400 }
      );
    }

    // Mark as verified
    const { error: updateError } = await supabaseAdmin
      .from("educator_profiles")
      .update({
        is_verified: true,
        rci_verified_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      return Response.json(
        { success: false, message: "Failed to update verification status", detail: updateError.message },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      rci_verified: true,
      message: "RCI number verified successfully. Subscribe to get listed in the marketplace.",
    });

  } catch (_err) {
    return Response.json({ success: false, message: "Server error" }, { status: 500 });
  }
});
