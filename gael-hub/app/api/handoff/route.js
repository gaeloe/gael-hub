import { NextResponse } from "next/server";
import { getSupabase, friendlyDbError } from "../../../lib/supabase";
import { STAGE_KEYS, isValidStage } from "../../../lib/stages";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The single endpoint every work session reports through, whatever the source:
// the hub's Log button, a pasted HANDOFF block, a Claude session with shell
// access, or the autopilot routine. Writes a worklog entry and, when a task is
// identified, updates its next_step/stage and freshness in the same call.
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const summary = (body.summary || "").trim();
  if (!summary) {
    return NextResponse.json({ error: "summary is required" }, { status: 400 });
  }
  if (body.stage !== undefined && body.stage !== "" && !isValidStage(body.stage)) {
    return NextResponse.json(
      { error: `Unknown stage "${body.stage}". Must be one of: ${STAGE_KEYS.join(", ")}` },
      { status: 400 }
    );
  }

  const supabase = getSupabase();

  // Resolve the task: by id, or leniently by title fragment (so a pasted
  // handoff that says `task: north voice` still lands on the right task).
  let task = null;
  const ref = (body.task_id || body.task || "").trim();
  if (ref) {
    const query = supabase.from("tasks").select("*");
    const { data, error } = UUID_RE.test(ref)
      ? await query.eq("id", ref)
      : await query.ilike("title", `%${ref}%`);
    if (error) return NextResponse.json({ error: friendlyDbError(error) }, { status: 500 });
    if (!data || data.length === 0) {
      return NextResponse.json({ error: `No task matches "${ref}"` }, { status: 404 });
    }
    if (data.length > 1) {
      return NextResponse.json(
        { error: `"${ref}" matches ${data.length} tasks — be more specific`, matches: data.map((t) => t.title) },
        { status: 400 }
      );
    }
    task = data[0];
  }

  const { data: log, error: logError } = await supabase
    .from("worklog")
    .insert([
      {
        task_id: task ? task.id : null,
        summary,
        details: (body.details || "").trim(),
        next_step: (body.next_step || "").trim(),
        source: (body.source || "").trim(),
      },
    ])
    .select()
    .single();
  if (logError) return NextResponse.json({ error: friendlyDbError(logError) }, { status: 500 });

  let updatedTask = task;
  if (task) {
    const updates = { updated_at: new Date().toISOString() };
    if (body.next_step !== undefined) updates.next_step = String(body.next_step).trim();
    if (body.stage) updates.stage = body.stage;
    // A completed handoff means the autopilot request (if any) is served.
    if (task.autopilot) updates.autopilot = false;
    const { data, error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", task.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: friendlyDbError(error) }, { status: 500 });
    updatedTask = data;
  }

  return NextResponse.json({ log, task: updatedTask });
}
