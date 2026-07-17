import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// Creates a VideoSDK room for a session and returns the join URL + token.
// Uses VideoSDK's prebuilt UI — participant opens meeting in browser (Expo Go compatible).

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

/**
 * Generate a VideoSDK JWT token using Web Crypto API (Deno-compatible).
 * No external JWT library needed.
 */
async function generateVideoSDKToken(): Promise<string> {
  const apiKey = Deno.env.get("VIDEOSDK_API_KEY")!;
  const secret = Deno.env.get("VIDEOSDK_SECRET")!;

  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    apikey: apiKey,
    permissions: ["allow_join"],
    version: 2,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 7200, // 2 hours
  };

  const encoder = new TextEncoder();

  const headerB64 = btoa(JSON.stringify(header))
    .replaceAll("=", "")
    .replaceAll("+", "-")
    .replaceAll("/", "_");
  const payloadB64 = btoa(JSON.stringify(payload))
    .replaceAll("=", "")
    .replaceAll("+", "-")
    .replaceAll("/", "_");

  const data = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  const sigB64 = btoa(String.fromCodePoint(...new Uint8Array(signature)))
    .replaceAll("=", "")
    .replaceAll("+", "-")
    .replaceAll("/", "_");

  return `${data}.${sigB64}`;
}

Deno.serve(async (req) => {
  try {
    // --- 1. Auth: verify Bearer token ---
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

    // --- 2. Parse request body ---
    const body = await req.json();
    const { session_id } = body;

    if (!session_id) {
      return Response.json(
        { success: false, message: "session_id is required" },
        { status: 400 }
      );
    }

    // --- 3. Fetch session and verify user is a participant ---
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("sessions")
      .select("id, special_educator_id, parent_id, child_id, status, videosdk_room_id, start_time")
      .eq("id", session_id)
      .single();

    if (sessionError || !session) {
      return Response.json(
        { success: false, message: "Session not found" },
        { status: 404 }
      );
    }

    // User must be either the educator or the parent on this session
    if (session.special_educator_id !== user.id && session.parent_id !== user.id) {
      return Response.json(
        { success: false, message: "You are not a participant of this session" },
        { status: 403 }
      );
    }

    // Session must be in 'accepted' or 'in_progress' status to start/join video
    if (!["accepted", "in_progress"].includes(session.status)) {
      return Response.json(
        {
          success: false,
          message: `Cannot start video for session with status: ${session.status}`,
        },
        { status: 422 }
      );
    }

    // --- 4. Generate VideoSDK token ---
    const token = await generateVideoSDKToken();

    // --- 5. Create or reuse room ---
    let roomId = session.videosdk_room_id;

    if (!roomId) {
      // Create a new VideoSDK room
      const roomResponse = await fetch("https://api.videosdk.live/v2/rooms", {
        method: "POST",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (!roomResponse.ok) {
        const errorText = await roomResponse.text();
        console.error("VideoSDK room creation failed:", errorText);
        return Response.json(
          { success: false, message: "Failed to create video room" },
          { status: 502 }
        );
      }

      const room = await roomResponse.json();
      roomId = room.roomId;

      // Store roomId on the session and update status to in_progress
      const { error: updateError } = await supabaseAdmin
        .from("sessions")
        .update({
          videosdk_room_id: roomId,
          status: "in_progress",
        })
        .eq("id", session_id);

      if (updateError) {
        console.error("Failed to update session with roomId:", updateError.message);
      }
    } else if (session.status === "accepted") {
      // Room already exists — if session is still 'accepted', mark as in_progress
      await supabaseAdmin
        .from("sessions")
        .update({ status: "in_progress" })
        .eq("id", session_id);
    }

    // --- 6. Return join details ---
    // The prebuilt meeting URL lets participants join in browser
    const meetingUrl = `https://app.videosdk.live/meeting/${roomId}`;

    return Response.json({
      success: true,
      roomId,
      token,
      meetingUrl,
    });
  } catch (err) {
    console.error("Server error:", err);
    return Response.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
});
