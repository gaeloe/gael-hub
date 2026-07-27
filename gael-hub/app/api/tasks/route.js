import { NextResponse } from "next/server";
import { getSupabase, friendlyDbError } from "../../../lib/supabase";
import { DEFAULT_STAGE, STAGE_KEYS, isValidStage } from "../../../lib/stages";

export async function GET() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tasks: data });
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const title = (body.title || "").trim();
  const stage = body.stage || DEFAULT_STAGE;

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  if (!isValidStage(stage)) {
    return NextResponse.json(
      { error: `Unknown stage "${stage}". Must be one of: ${STAGE_KEYS.join(", ")}` },
      { status: 400 }
    );
  }

  const row = { title, stage };
  // Second-brain fields — only sent when provided, so a plain add still works
  // even if the database migration hasn't been applied yet.
  for (const key of ["project", "notes", "next_step"]) {
    if (typeof body[key] === "string" && body[key].trim()) {
      row[key] = body[key].trim();
    }
  }

  if (body.priority !== undefined) {
    const priority = Number(body.priority);
    if (!Number.isInteger(priority) || priority < 1 || priority > 5) {
      return NextResponse.json({ error: "priority must be an integer 1–5" }, { status: 400 });
    }
    row.priority = priority;
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("tasks")
    .insert([row])
    .select()
    .single();

  if (error) return NextResponse.json({ error: friendlyDbError(error) }, { status: 500 });
  return NextResponse.json({ task: data });
}
