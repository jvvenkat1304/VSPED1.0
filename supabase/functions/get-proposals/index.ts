import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// GET /functions/v1/get-proposals
// Lists proposals for the authenticated user (parent or educator).
// Query params: ?role=parent|educator&status=pending,countered,accepted (comma-separated, optional)

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  try {
    // Only allow GET requests
    if (req.method !== "GET") {
      return Response.json(
        { success: false, message: "Method not allowed" },
        { status: 405 }
      );
    }

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
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
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse query params
    const url = new URL(req.url);
    const roleParam = url.searchParams.get("role");
    const statusParam = url.searchParams.get("status");

    // Determine role: use query param or look up from users table
    let role: "parent" | "educator";
    if (roleParam === "parent" || roleParam === "educator") {
      role = roleParam;
    } else {
      const { data: userRecord, error: userError } = await supabaseAdmin
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (userError || !userRecord) {
        return Response.json(
          { success: false, message: "User not found" },
          { status: 404 }
        );
      }

      role =
        userRecord.role === "parent" ? "parent" : "educator";
    }

    // Parse status filter
    const statusFilter: string[] | null = statusParam
      ? statusParam.split(",").map((s) => s.trim()).filter(Boolean)
      : null;

    // Build query based on role
    let query = supabaseAdmin
      .from("session_proposals")
      .select(
        `id, status, sessions_per_week, total_sessions, proposed_rate_inr,
         counter_rate_inr, counter_sessions_per_week, counter_total_sessions,
         counter_notes, notes, created_at, expires_at,
         parent_id, educator_id, consent_grant_id`
      );

    if (role === "parent") {
      query = query.eq("parent_id", user.id);
    } else {
      query = query.eq("educator_id", user.id);
    }

    // Apply status filter if provided
    if (statusFilter && statusFilter.length > 0) {
      query = query.in("status", statusFilter);
    }

    // Order by most recent first, limit 50
    query = query.order("created_at", { ascending: false }).limit(50);

    const { data: proposals, error: queryError } = await query;

    if (queryError) {
      return Response.json(
        { success: false, message: "Failed to fetch proposals" },
        { status: 500 }
      );
    }

    if (!proposals || proposals.length === 0) {
      return Response.json({ success: true, proposals: [] });
    }

    // Gather counterparty user IDs for name lookup
    const counterpartyIds = proposals.map((p) =>
      role === "parent" ? p.educator_id : p.parent_id
    );
    const uniqueIds = [...new Set(counterpartyIds)];

    const { data: counterpartyUsers } = await supabaseAdmin
      .from("users")
      .select("id, full_name")
      .in("id", uniqueIds);

    const nameMap: Record<string, string> = {};
    if (counterpartyUsers) {
      for (const u of counterpartyUsers) {
        nameMap[u.id] = u.full_name || "Unknown";
      }
    }

    // For parent view: fetch payment statuses
    let paymentMap: Record<string, string> = {};
    if (role === "parent") {
      const proposalIds = proposals.map((p) => p.id);
      const { data: payments } = await supabaseAdmin
        .from("proposal_payments")
        .select("proposal_id, status")
        .in("proposal_id", proposalIds);

      if (payments) {
        for (const pay of payments) {
          paymentMap[pay.proposal_id] = pay.status;
        }
      }
    }

    // For educator view: also fetch payment statuses
    if (role === "educator") {
      const proposalIds = proposals.map((p) => p.id);
      const { data: payments } = await supabaseAdmin
        .from("proposal_payments")
        .select("proposal_id, status")
        .in("proposal_id", proposalIds);

      if (payments) {
        for (const pay of payments) {
          paymentMap[pay.proposal_id] = pay.status;
        }
      }
    }

    // Build response
    const result = proposals.map((p) => {
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
      if (p.counter_rate_inr !== null) {
        base.counter_rate_inr = p.counter_rate_inr;
      }
      if (p.counter_sessions_per_week !== null) {
        base.counter_sessions_per_week = p.counter_sessions_per_week;
      }
      if (p.counter_total_sessions !== null) {
        base.counter_total_sessions = p.counter_total_sessions;
      }
      if (p.counter_notes) {
        base.counter_notes = p.counter_notes;
      }
      if (p.notes) {
        base.notes = p.notes;
      }

      // Payment status
      if (paymentMap[p.id]) {
        base.payment_status = paymentMap[p.id];
      }

      if (role === "parent") {
        // Parent sees educator name and their own child's name (they own the data)
        base.educator_name = nameMap[p.educator_id] || "Unknown";
        // Parent always sees child_name — they own the child data.
        // We don't fetch it here; the frontend already knows their children.
        // But for API completeness, we could include it. For MVP, omit to keep simple.
      } else {
        // Educator view
        base.parent_name = nameMap[p.parent_id] || "Unknown";

        // CRITICAL PRIVACY RULE: Educators NEVER see child data before consent.
        // Even after acceptance, child info is accessed via get-child endpoint separately.
        // Show placeholder text only.
        if (p.consent_grant_id) {
          // Consent grant exists (proposal was accepted)
          base.child_name = "Child profile available";
        } else {
          // No consent yet — hide child identity completely
          base.child_name = "Child (consent pending)";
        }
      }

      // Never include min_rate_inr in any response
      return base;
    });

    return Response.json({ success: true, proposals: result });
  } catch (_err) {
    return Response.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
});
