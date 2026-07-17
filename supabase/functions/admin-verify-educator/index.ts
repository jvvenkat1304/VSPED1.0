import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// Admin endpoint for verifying or rejecting educators, and querying the verification queue.
// Implements: admin authentication, state transition validation, audit logging, and paginated queue listing.
// Requirements: 3.3, 3.4, 5.1, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 7.2, 9.3

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

/**
 * Allowed state transitions for admin actions.
 * Map of (current_status, action) → new_status
 */
const ALLOWED_TRANSITIONS: Record<string, Record<string, string>> = {
  provisionally_verified: {
    verify: "verified",
    reject: "rejected",
  },
  pending: {
    reject: "rejected",
  },
};

/**
 * Authenticate the request and verify admin role.
 * Returns the admin user or null with an error response.
 */
async function authenticateAdmin(
  req: Request
): Promise<{ user: { id: string } } | { error: Response }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return {
      error: Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  const supabaseUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const {
    data: { user },
    error: authError,
  } = await supabaseUser.auth.getUser();

  if (authError || !user) {
    return {
      error: Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  // Check admin role in public.users table
  const { data: userData, error: roleError } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (roleError || userData?.role !== "admin") {
    return {
      error: Response.json(
        { success: false, message: "Admin access required" },
        { status: 403 }
      ),
    };
  }

  return { user: { id: user.id } };
}


/**
 * Handle POST: Admin verifies or rejects an educator.
 */
/**
 * Build the update payload for educator profile based on admin action.
 */
function buildVerificationPayload(
  action: string,
  adminId: string,
  newStatus: string,
  reason?: string,
  notes?: string
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    verification_status: newStatus,
    verified_by: adminId,
  };

  if (action === "verify") {
    payload.is_verified = true;
  } else {
    payload.is_verified = false;
    payload.rejection_reason = reason?.trim() ?? null;
  }

  if (notes) payload.audit_notes = notes;
  return payload;
}

async function handlePost(req: Request, adminId: string): Promise<Response> {
  // Parse request body
  let body: {
    educator_id?: string;
    action?: string;
    reason?: string;
    notes?: string;
  };
  try {
    body = await req.json();
  } catch (err) {
    console.error('[admin-verify-educator] invalid request body:', err);
    return Response.json({ success: false, message: "Invalid request body" }, { status: 400 });
  }

  const { educator_id, action, reason, notes } = body;

  // Validate
  if (!educator_id || !action) {
    return Response.json({ success: false, message: "educator_id and action are required" }, { status: 400 });
  }
  if (action !== "verify" && action !== "reject") {
    return Response.json({ success: false, message: "action must be 'verify' or 'reject'" }, { status: 400 });
  }
  if (action === "reject" && !reason?.trim()) {
    return Response.json({ success: false, message: "Rejection reason is required" }, { status: 400 });
  }

  // Fetch educator
  const { data: profile, error: fetchError } = await supabaseAdmin
    .from("educator_profiles")
    .select("id, verification_status, is_verified")
    .eq("id", educator_id)
    .single();

  if (fetchError || !profile) {
    return Response.json({ success: false, message: "Educator profile not found" }, { status: 404 });
  }

  // Validate state transition
  const currentStatus = profile.verification_status;
  const newStatus = ALLOWED_TRANSITIONS[currentStatus]?.[action];

  if (!newStatus) {
    return Response.json({ success: false, message: "Invalid status transition" }, { status: 422 });
  }

  // Update profile
  const updatePayload = buildVerificationPayload(action, adminId, newStatus, reason, notes);

  const { error: updateError } = await supabaseAdmin
    .from("educator_profiles")
    .update(updatePayload)
    .eq("id", educator_id);

  if (updateError) {
    return Response.json({ success: false, message: "Failed to update educator profile" }, { status: 500 });
  }

  // Audit log
  const { error: auditError } = await supabaseAdmin
    .from("verification_audit_log")
    .insert({
      educator_id,
      previous_status: currentStatus,
      new_status: newStatus,
      actor_id: adminId,
      actor_type: "admin",
      reason: reason?.trim() ?? null,
      ip_address: getClientIp(req),
    });

  if (auditError) {
    console.error("Failed to insert audit log:", auditError.message);
  }

  return Response.json({
    success: true,
    verification_status: newStatus,
    message: `Educator ${action === "verify" ? "verified" : "rejected"} successfully.`,
  });
}


/**
 * Handle GET: Admin retrieves the verification queue with filtering and pagination.
 */
async function handleGet(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const params = url.searchParams;

  // Parse query parameters
  const status = params.get("status") || "provisionally_verified";
  const category = params.get("category");
  const city = params.get("city");
  const fromDate = params.get("from_date");
  const toDate = params.get("to_date");
  const limit = Math.min(Math.max(Number.parseInt(params.get("limit") || "20", 10) || 20, 1), 100);
  const offset = Math.max(Number.parseInt(params.get("offset") || "0", 10) || 0, 0);

  // Build query
  let query = supabaseAdmin
    .from("educator_profiles")
    .select(
      "id, rci_number, verification_status, subjects, city, self_attestation_at",
      { count: "exact" }
    )
    .eq("verification_status", status)
    .order("self_attestation_at", { ascending: true })
    .range(offset, offset + limit - 1);

  // Apply optional filters
  if (category) {
    query = query.contains("subjects", [category]);
  }

  if (city) {
    query = query.ilike("city", `%${city}%`);
  }

  if (fromDate) {
    query = query.gte("self_attestation_at", fromDate);
  }

  if (toDate) {
    query = query.lte("self_attestation_at", toDate);
  }

  const { data: educators, error: queryError, count } = await query;

  if (queryError) {
    return Response.json(
      { success: false, message: "Failed to fetch educator queue" },
      { status: 500 }
    );
  }

  // Format results
  const results = (educators || []).map((educator: Record<string, unknown>) => {
    return {
      id: educator.id,
      rci_number: educator.rci_number,
      verification_status: educator.verification_status,
      subjects: educator.subjects,
      city: educator.city,
      self_attestation_at: educator.self_attestation_at,
    };
  });

  return Response.json({
    success: true,
    data: results,
    pagination: {
      total: count || 0,
      limit,
      offset,
    },
  });
}


/**
 * Main request handler — routes to GET or POST based on method.
 */
Deno.serve(async (req) => {
  try {
    // Authenticate admin for all methods
    const authResult = await authenticateAdmin(req);
    if ("error" in authResult) {
      return authResult.error;
    }
    const adminId = authResult.user.id;

    const method = req.method.toUpperCase();

    if (method === "POST") {
      return await handlePost(req, adminId);
    }

    if (method === "GET") {
      return await handleGet(req);
    }

    return Response.json(
      { success: false, message: "Method not allowed" },
      { status: 405 }
    );
  } catch (err) {
    console.error('[admin-verify-educator] error:', err);
    return Response.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
});
