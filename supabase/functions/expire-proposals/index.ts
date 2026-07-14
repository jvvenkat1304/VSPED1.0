import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// Scheduled edge function: calls expire_stale_proposals() to transition
// stale pending/countered proposals to 'expired' and notify both parties.
// Designed to be invoked every 5 minutes via Supabase cron or external scheduler.

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (_req) => {
  try {
    const { data: expiredCount, error } = await supabaseAdmin.rpc(
      "expire_stale_proposals"
    );

    if (error) {
      console.error("Failed to run expire_stale_proposals:", error.message);
      return Response.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      expired_count: expiredCount,
      message: `Expired ${expiredCount} stale proposals`,
    });
  } catch (_err) {
    return Response.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
});
