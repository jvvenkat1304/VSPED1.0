import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// Parent instantly revokes an active consent grant.
// Takes effect immediately — the grantee's next query will return nothing.

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

    const { grant_id } = await req.json();

    if (!grant_id) {
      return Response.json({ success: false, message: "grant_id is required" }, { status: 400 });
    }

    // Fetch the grant — must belong to this parent and not already revoked
    const { data: grant, error: fetchError } = await supabaseAdmin
      .from("consent_grants")
      .select("id, child_id, grantee_id, parent_id, revoked_at")
      .eq("id", grant_id)
      .eq("parent_id", user.id)
      .single();

    if (fetchError || !grant) {
      return Response.json(
        { success: false, message: "Grant not found or not yours" },
        { status: 404 }
      );
    }

    if (grant.revoked_at) {
      return Response.json(
        { success: false, message: "Grant already revoked" },
        { status: 400 }
      );
    }

    // Revoke it
    const { error: updateError } = await supabaseAdmin
      .from("consent_grants")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", grant_id);

    if (updateError) {
      return Response.json(
        { success: false, message: "Failed to revoke", detail: updateError.message },
        { status: 500 }
      );
    }

    // Audit log is handled by the trigger (trg_audit_consent_revoke)

    return Response.json({
      success: true,
      message: "Consent revoked immediately. The educator can no longer access this child's data.",
    });

  } catch (err) {
    console.error('[revoke-consent] error:', err);
    return Response.json({ success: false, message: "Server error" }, { status: 500 });
  }
});
