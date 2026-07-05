import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// Creates a child profile for the authenticated parent.
// Child PII (name, dob, gender) is AES-256 encrypted before storage.
// Only the parent can read this data back (enforced by RLS + decryption key).

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const ENCRYPTION_KEY = Deno.env.get("CHILD_DATA_ENCRYPTION_KEY")!;

async function encrypt(plaintext: string): Promise<string> {
  const keyBytes = new Uint8Array(ENCRYPTION_KEY.match(/.{2}/g)!.map(b => parseInt(b, 16)));
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  // Store as: iv_hex:ciphertext_hex
  const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, "0")).join("");
  const ctHex = Array.from(new Uint8Array(ciphertext)).map(b => b.toString(16).padStart(2, "0")).join("");
  return `${ivHex}:${ctHex}`;
}

Deno.serve(async (req) => {
  try {
    // Get the parent's auth token from the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return Response.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    // Verify the parent's identity
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return Response.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { name, dob, gender } = await req.json();

    if (!name) {
      return Response.json({ success: false, message: "Child name is required" }, { status: 400 });
    }

    // Encrypt PII fields
    const encryptedName = await encrypt(name);
    const encryptedDob = dob ? await encrypt(dob) : null;
    const encryptedGender = gender ? await encrypt(gender) : null;

    // Insert using service role (bypasses RLS for INSERT since parent_id matches)
    const { data, error } = await supabaseAdmin
      .from("children")
      .insert({
        parent_id: user.id,
        encrypted_name: encryptedName,
        encrypted_dob: encryptedDob,
        encrypted_gender: encryptedGender,
      })
      .select("id, child_uuid_public, created_at")
      .single();

    if (error) {
      return Response.json({ success: false, message: "Failed to create child profile", detail: error.message }, { status: 500 });
    }

    return Response.json({
      success: true,
      child_id: data.id,
      child_uuid_public: data.child_uuid_public,
      message: "Child profile created successfully",
    });

  } catch (_err) {
    return Response.json({ success: false, message: "Server error" }, { status: 500 });
  }
});
