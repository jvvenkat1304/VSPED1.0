import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Returns decrypted child data.
// - Parent: always has access to their own children
// - Others: only if they have an active, unexpired consent grant

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const ENCRYPTION_KEY = Deno.env.get("CHILD_DATA_ENCRYPTION_KEY")!;

async function decrypt(encryptedStr: string): Promise<string> {
  const [ivHex, ctHex] = encryptedStr.split(":");
  const iv = new Uint8Array(ivHex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
  const ciphertext = new Uint8Array(ctHex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
  const keyBytes = new Uint8Array(ENCRYPTION_KEY.match(/.{2}/g)!.map(b => parseInt(b, 16)));
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["decrypt"]);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

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

    const { child_id } = await req.json();
    if (!child_id) {
      return Response.json({ success: false, message: "child_id is required" }, { status: 400 });
    }

    // Fetch child record
    const { data: child, error: fetchError } = await supabaseAdmin
      .from("children")
      .select("id, parent_id, encrypted_name, encrypted_dob, encrypted_gender, child_uuid_public, created_at")
      .eq("id", child_id)
      .single();

    if (fetchError || !child) {
      return Response.json({ success: false, message: "Child not found" }, { status: 404 });
    }

    // Check access: is requester the parent?
    const isParent = child.parent_id === user.id;

    if (!isParent) {
      // Check for active consent grant
      const { data: grant } = await supabaseAdmin
        .from("consent_grants")
        .select("id")
        .eq("grantee_id", user.id)
        .eq("child_id", child_id)
        .is("revoked_at", null)
        .gt("expires_at", new Date().toISOString())
        .limit(1)
        .single();

      if (!grant) {
        // Log the denied access attempt
        await supabaseAdmin.from("consent_audit_log").insert({
          event_type: "data_access_denied",
          actor_id: user.id,
          child_id: child_id,
          details: { reason: "no_active_consent" },
        });
        return Response.json({ success: false, message: "Access denied — no active consent" }, { status: 403 });
      }

      // Log successful access
      await supabaseAdmin.from("consent_audit_log").insert({
        event_type: "data_accessed",
        actor_id: user.id,
        child_id: child_id,
        consent_grant_id: grant.id,
        details: { accessed_as: "grantee" },
      });
    }

    // Decrypt and return
    const name = await decrypt(child.encrypted_name);
    const dob = child.encrypted_dob ? await decrypt(child.encrypted_dob) : null;
    const gender = child.encrypted_gender ? await decrypt(child.encrypted_gender) : null;

    return Response.json({
      success: true,
      child: {
        id: child.id,
        name,
        dob,
        gender,
        child_uuid_public: child.child_uuid_public,
        created_at: child.created_at,
      },
    });

  } catch (_err) {
    return Response.json({ success: false, message: "Server error" }, { status: 500 });
  }
});
