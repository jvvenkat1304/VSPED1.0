import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

interface ScheduleConfig {
  available_days: string[];
  session_start_time: string;
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function generateSessionDates(
  totalSessions: number,
  sessionsPerWeek: number,
  availableDays: string[],
  sessionStartTime: string,
  startAfter: Date
): { start_time: string; end_time: string }[] {
  const DAY_MAP: Record<string, number> = {
    'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
    'Thursday': 4, 'Friday': 5, 'Saturday': 6
  };

  const sortedDays = availableDays
    .map(d => DAY_MAP[d])
    .filter(d => d !== undefined)
    .sort((a, b) => a - b);

  if (sortedDays.length === 0) return [];

  const sessions: { start_time: string; end_time: string }[] = [];
  const currentDate = new Date(startAfter);
  currentDate.setHours(0, 0, 0, 0);
  currentDate.setDate(currentDate.getDate() + 1); // Start from next day

  const [hours, minutes] = sessionStartTime.split(':').map(Number);
  let sessionsThisWeek = 0;
  let currentWeekStart = getWeekStart(currentDate);

  while (sessions.length < totalSessions) {
    const dayOfWeek = currentDate.getDay();

    const thisWeekStart = getWeekStart(currentDate);
    if (thisWeekStart.getTime() !== currentWeekStart.getTime()) {
      currentWeekStart = thisWeekStart;
      sessionsThisWeek = 0;
    }

    if (sortedDays.includes(dayOfWeek) && sessionsThisWeek < sessionsPerWeek) {
      const startTime = new Date(currentDate);
      startTime.setHours(hours, minutes, 0, 0);

      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + 45);

      sessions.push({
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
      });
      sessionsThisWeek++;
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return sessions;
}

Deno.serve(async (req) => {
  try {
    // Auth: only accept calls with service role key
    const authHeader = req.headers.get("Authorization");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!authHeader?.includes(serviceRoleKey)) {
      return Response.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { proposal_id } = await req.json();
    if (!proposal_id) {
      return Response.json({ success: false, message: "proposal_id required" }, { status: 400 });
    }

    // 1. Fetch proposal details
    const { data: proposal, error: pErr } = await supabaseAdmin
      .from("session_proposals")
      .select("id, educator_id, parent_id, child_id, total_sessions, sessions_per_week, status")
      .eq("id", proposal_id)
      .eq("status", "paid")
      .single();

    if (pErr || !proposal) {
      return Response.json({ success: false, message: "Paid proposal not found" }, { status: 404 });
    }

    // Guard: don't create sessions if total_sessions <= 0
    if (!proposal.total_sessions || proposal.total_sessions <= 0) {
      return Response.json({ success: false, message: "No sessions to create" }, { status: 400 });
    }

    // 2. Fetch educator schedule
    const { data: educator } = await supabaseAdmin
      .from("educator_profiles")
      .select("schedule_config")
      .eq("id", proposal.educator_id)
      .single();

    const scheduleConfig = educator?.schedule_config as ScheduleConfig | null;
    const hasValidSchedule = !!(scheduleConfig?.available_days && scheduleConfig?.available_days.length > 0);

    // 3. Generate session rows
    interface SessionRow {
      proposal_id: string;
      special_educator_id: string;
      parent_id: string;
      child_id: string;
      start_time: string | null;
      end_time: string | null;
      status: string;
    }

    let sessionRows: SessionRow[];

    if (hasValidSchedule) {
      const dates = generateSessionDates(
        proposal.total_sessions,
        proposal.sessions_per_week || proposal.total_sessions,
        scheduleConfig!.available_days,
        scheduleConfig!.session_start_time || "10:00",
        new Date()
      );
      sessionRows = dates.map((d) => ({
        proposal_id: proposal.id,
        special_educator_id: proposal.educator_id,
        parent_id: proposal.parent_id,
        child_id: proposal.child_id,
        start_time: d.start_time,
        end_time: d.end_time,
        status: 'accepted',
      }));
    } else {
      // No schedule — create placeholder sessions
      sessionRows = Array.from({ length: proposal.total_sessions }, () => ({
        proposal_id: proposal.id,
        special_educator_id: proposal.educator_id,
        parent_id: proposal.parent_id,
        child_id: proposal.child_id,
        start_time: null,
        end_time: null,
        status: 'proposed',
      }));
    }

    // 4. Bulk insert sessions
    const { error: insertErr } = await supabaseAdmin
      .from("sessions")
      .insert(sessionRows);

    if (insertErr) {
      console.error("Failed to insert sessions:", insertErr.message);
      return Response.json({ success: false, message: "Failed to create sessions" }, { status: 500 });
    }

    // 5. Notify educator if schedule was missing
    if (!hasValidSchedule) {
      await supabaseAdmin.from("notifications").insert({
        user_id: proposal.educator_id,
        type: "schedule_needed",
        title: "Set Your Schedule",
        body: "Sessions were booked but you haven't set your availability. Please set your schedule so sessions can be scheduled.",
        metadata: { proposal_id: proposal.id },
      });
    }

    return Response.json({
      success: true,
      sessions_created: sessionRows.length,
      scheduled: hasValidSchedule,
    });
  } catch (err) {
    console.error("generate-sessions error:", err);
    return Response.json({ success: false, message: "Server error" }, { status: 500 });
  }
});
