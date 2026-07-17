import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// GET /functions/v1/get-proposals
// Lists proposals for the authenticated user (parent or educator).
// Query params: ?role=parent|educator&status=pending,countered,accepted (comma-separated, optional)

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

/**
 * Determine the user's role from query param or DB lookup.
 */
async function resolveUserRole(
  userId: string,
  roleParam: string | null
): Promise<{ role: "parent" | "educator"; error?: Response }> {
  if (roleParam === "parent" || roleParam === "educator") {
    return { role: roleParam };
  }

  const { data: userRecord, error: userError } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", userId)
    .single();

  if (userError || !userRecord) {
    return {
      role: "parent",
      error: Response.json({ success: false, message: "User not found" }, { status: 404 }),
    };
  }

  return { role: userRecord.role === "parent" ? "parent" : "educator" };
}

/**
 * Fetch payment statuses for a list of proposal IDs.
 */
async function fetchPaymentMap(proposalIds: string[]): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  const { data: payments } = await supabaseAdmin
    .from("proposal_payments")
    .select("proposal_id, status")
    .in("proposal_id", proposalIds);

  if (payments) {
    for (const pay of payments) {
      map[pay.proposal_id] = pay.status;
    }
  }
  return map;
}

/**
 * Format a single proposal for the API response.
 * Applies privacy rules: educators never see child data without consent.
 */
function formatProposal(
  p: Record<string, unknown>,
  role: "parent" | "educator",
  nameMap: Record<string, string>,
  paymentMap: Record<string, string>
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    id: p.id,
    status: p.status,
    sessions_per_week: p.sessions_per_week,
    total_sessions: p.total_sessions,
    proposed_rate_inr: p.proposed_rate_inr,
    created_at: p.created_at,
    expires_at: p.expires_at,
  };

  // Include counter fields if present
  if (p.counter_rate_inr !== null) base.counter_rate_inr = p.counter_rate_inr;
  if (p.counter_sessions_per_week !== null) base.counter_sessions_per_week = p.counter_sessions_per_week;
  if (p.counter_total_sessions !== null) base.counter_total_sessions = p.counter_total_sessions;
  if (p.counter_notes) base.counter_notes = p.counter_notes;
  if (p.notes) base.notes = p.notes;

  // Payment status
  if (paymentMap[p.id as string]) {
    base.payment_status = paymentMap[p.id as string];
  }

  if (role === "parent") {
    base.educator_name = nameMap[p.educator_id as string] || "Unknown";
  } else {
    base.parent_name = nameMap[p.parent_id as string] || "Unknown";
    // CRITICAL PRIVACY RULE: Educators NEVER see child data before consent.
    base.child_name = p.consent_grant_id
      ? "Child profile available"
      : "Child (consent pending)";
  }

  return base;
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "GET") {
      return Response.json({ success: false, message: "Method not allowed" }, { status: 405 });
    }

    // Authenticate user
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

    // Resolve role
    const url = new URL(req.url);
    const { role, error: roleError } = await resolveUserRole(user.id, url.searchParams.get("role"));
    if (roleError) return roleError;

    // Parse status filter
    const statusParam = url.searchParams.get("status");
    const statusFilter = statusParam
      ? statusParam.split(",").map((s) => s.trim()).filter(Boolean)
      : null;

    // Build and execute query
    let query = supabaseAdmin
      .from("session_proposals")
      .select(
        `id, status, sessions_per_week, total_sessions, proposed_rate_inr,
         counter_rate_inr, counter_sessions_per_week, counter_total_sessions,
         counter_notes, notes, created_at, expires_at,
         parent_id, educator_id, consent_grant_id`
      )
      .eq(role === "parent" ? "parent_id" : "educator_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (statusFilter && statusFilter.length > 0) {
      query = query.in("status", statusFilter);
    }

    const { data: proposals, error: queryError } = await query;

    if (queryError) {
      return Response.json({ success: false, message: "Failed to fetch proposals" }, { status: 500 });
    }

    if (!proposals || proposals.length === 0) {
      return Response.json({ success: true, proposals: [] });
    }

    // Fetch counterparty names
    const counterpartyIds = [...new Set(
      proposals.map((p) => role === "parent" ? p.educator_id : p.parent_id)
    )];
    const { data: counterpartyUsers } = await supabaseAdmin
      .from("users")
      .select("id, full_name")
      .in("id", counterpartyIds);

    const nameMap: Record<string, string> = {};
    if (counterpartyUsers) {
      for (const u of counterpartyUsers) {
        nameMap[u.id] = u.full_name || "Unknown";
      }
    }

    // Fetch payment statuses (same logic for both roles)
    const paymentMap = await fetchPaymentMap(proposals.map((p) => p.id));

    // Format response
    const result = proposals.map((p) => formatProposal(p, role, nameMap, paymentMap));

    return Response.json({ success: true, proposals: result });
  } catch (err) {
    console.error('[get-proposals] error:', err);
    return Response.json({ success: false, message: "Server error" }, { status: 500 });
  }
});
