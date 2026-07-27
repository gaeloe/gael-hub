import { NextResponse } from "next/server";
import { getSupabase, friendlyDbError } from "../../../lib/supabase";

// Never cache — a stale brief defeats the whole point of a second brain.
export const dynamic = "force-dynamic";

// Machine-readable snapshot of the whole hub. Any Claude session given the
// hub key can start with `curl -H 'x-hub-key: …' …/api/brief` and instantly
// know the full state of Gaël's work — no context lost between sessions.
export async function GET() {
  const supabase = getSupabase();

  const [tasksRes, logRes, ideasRes] = await Promise.all([
    supabase.from("tasks").select("*").order("updated_at", { ascending: false }),
    supabase
      .from("worklog")
      .select("*, tasks(title)")
      .order("created_at", { ascending: false })
      .limit(15),
    supabase.from("ideas").select("id, title, source, created_at").order("created_at", { ascending: false }),
  ]);

  const err = tasksRes.error || logRes.error || ideasRes.error;
  if (err) return NextResponse.json({ error: friendlyDbError(err) }, { status: 500 });

  const tasks = tasksRes.data || [];
  return NextResponse.json({
    generated_at: new Date().toISOString(),
    in_flight: tasks.filter((t) => t.stage === "in_dev" || t.stage === "review"),
    autopilot_queue: tasks.filter((t) => t.autopilot),
    tasks,
    recent_log: logRes.data || [],
    ideas: ideasRes.data || [],
    how_to_report_back:
      "POST /api/handoff with header x-hub-key and JSON {task_id?, summary, details?, next_step?, stage?, source?}",
  });
}
