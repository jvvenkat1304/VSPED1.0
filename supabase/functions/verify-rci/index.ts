import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { validateCrrFormat, ATTESTATION_TEXT } from "../_shared/crr-validator.ts";

// Verifies an educator's RCI (Rehabilitation Council of India) CRR number.
// Implements: format validation → attestation gate → uniqueness check → provisional verification.
// Rate-limited to 3 attempts per 60 minutes per user.

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

/**
 * Extract the client IP address from request headers.
 * Checks X-Forwarded-For first (takes first IP), then X-Real-IP, fallback to 'unknown'.
 */
function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "unknown";
}

Deno.serve(async (req) => {
  try {
    // --- Auth: verify JWT, get user from auth header ---
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

    // --- Rate limiting: 3 attempts per 60 minutes ---
    const { data: allowed, error: rateLimitError } = await supabaseAdmin.rpc("check_rate_limit", {
      p_identifier: user.id,
      p_action: "verify_rci",
      p_max_requests: 3,
      p_window_minutes: 60,
    });

    if (rateLimitError || allowed === false) {
      return Response.json(
        { success: false, message: "Too many attempts. Please try again later." },
        { status: 429 }
      );
    }

    // --- Fetch educator profile ---
    const { data: profile, error: fetchError } = await supabaseAdmin
      .from("educator_profiles")
      .select("id, rci_number, is_verified, verification_status")
      .eq("id", user.id)
      .single();

    if (fetchError || !profile) {
      return Response.json(
        { success: false, message: "Educator profile not found" },
        { status: 404 }
      );
    }

    // --- Check if educator is rejected → 403 generic error (no details leaked) ---
    if (profile.verification_status === "rejected") {
      return Response.json(
        { success: false, message: "This account cannot perform verification" },
        { status: 403 }
      );
    }

    // --- Check if already provisionally_verified or verified → return success ---
    if (
      profile.verification_status === "provisionally_verified" ||
      profile.verification_status === "verified"
    ) {
      return Response.json({
        success: true,
        verification_status: profile.verification_status,
        already_verified: true,
        message: "RCI number already verified.",
      });
    }

    // --- Validate request body: attestation_accepted must be exactly true ---
    const body = await req.json();
    if (body.attestation_accepted !== true) {
      return Response.json(
        { success: false, message: "Self-attestation must be accepted to proceed" },
        { status: 400 }
      );
    }

    // --- Validate CRR number format ---
    const validation = validateCrrFormat(profile.rci_number);
    if (!validation.valid) {
      return Response.json(
        {
          success: false,
          message: `Invalid CRR format: ${validation.error}`,
          errorComponent: validation.errorComponent,
        },
        { status: 400 }
      );
    }

    // --- Check uniqueness: same normalized CRR on a different user → 409 ---
    const { data: duplicates } = await supabaseAdmin
      .from("educator_profiles")
      .select("id")
      .eq("rci_number", validation.normalized!)
      .neq("id", user.id)
      .limit(1);

    if (duplicates && duplicates.length > 0) {
      return Response.json(
        { success: false, message: "This CRR number is already registered on the platform" },
        { status: 409 }
      );
    }

    // --- Update educator profile: set provisionally_verified ---
    const now = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from("educator_profiles")
      .update({
        verification_status: "provisionally_verified",
        is_verified: true,
        self_attestation_at: now,
        attestation_text: ATTESTATION_TEXT,
        rci_verified_at: now,
      })
      .eq("id", user.id);

    if (updateError) {
      return Response.json(
        { success: false, message: "Failed to update verification status" },
        { status: 500 }
      );
    }

    // --- Insert audit log entry ---
    const ipAddress = getClientIp(req);
    const { error: auditError } = await supabaseAdmin
      .from("verification_audit_log")
      .insert({
        educator_id: user.id,
        previous_status: "pending",
        new_status: "provisionally_verified",
        actor_id: user.id,
        actor_type: "educator",
        reason: null,
        ip_address: ipAddress,
      });

    if (auditError) {
      // Log but don't fail the request — the verification itself succeeded
      console.error("Failed to insert audit log:", auditError.message);
    }

    // --- Return success ---
    return Response.json({
      success: true,
      verification_status: "provisionally_verified",
      message:
        "RCI number verified. Your profile is now visible while we complete manual review.",
    });
  } catch (_err) {
    return Response.json({ success: false, message: "Server error" }, { status: 500 });
  }
});
