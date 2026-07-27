import { NextResponse } from "next/server";
import { getSupabase, friendlyDbError } from "../../../../lib/supabase";
import { STAGE_KEYS, isValidStage } from "../../../../lib/stages";
import { PROJECTS, isValidProject } from "../../../../lib/projects";

export async function PATCH(request, { params }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updates = {};

  if (body.stage !== undefined) {
    // Reject unknown stages rather than writing them. A task stored with a
    // stage the UI doesn't render matches no column and vanishes from the hub.
    if (!isValidStage(body.stage)) {
      return NextResponse.json(
        { error: `Unknown stage "${body.stage}". Must be one of: ${STAGE_KEYS.join(", ")}` },
        { status: 400 }
      );
    }
    updates.stage = body.stage;
  }

  if (body.title !== undefined) {
    const title = String(body.title).trim();
    if (!title) {
      return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 });
    }
    updates.title = title;
  }

  for (const key of ["project", "notes", "next_step"]) {
    if (body[key] !== undefined) {
      updates[key] = String(body[key]).trim();
    }
  }

  if (updates.project !== undefined && !isValidProject(updates.project)) {
    return NextResponse.json(
      { error: `Unknown project "${updates.project}". Must be one of: ${PROJECTS.join(", ")} (or empty)` },
      { status: 400 }
    );
  }

  if (body.autopilot !== undefined) {
    updates.autopilot = Boolean(body.autopilot);
  }

  if (body.priority !== undefined) {
    const priority = Number(body.priority);
    if (!Number.isInteger(priority) || priority < 1 || priority > 5) {
      return NextResponse.json({ error: "priority must be an integer 1–5" }, { status: 400 });
    }
    updates.priority = priority;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  // Every edit refreshes the "last touched" timestamp that drives the
  // "Where I left off" panel and its staleness colors.
  updates.updated_at = new Date().toISOString();

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", params.id)
    .select();

  if (error) return NextResponse.json({ error: friendlyDbError(error) }, { status: 500 });
  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  return NextResponse.json({ task: data[0] });
}

export async function DELETE(request, { params }) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", params.id)
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
