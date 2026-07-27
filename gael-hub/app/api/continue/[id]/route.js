import { NextResponse } from "next/server";
import { getSupabase, friendlyDbError } from "../../../../lib/supabase";
import { buildHandoffPrompt } from "../../../../lib/prompt";

// The "▶ Continue in Claude" button. Builds a handoff prompt for the task and
// redirects to claude.ai with it pre-filled — on a phone this opens the Claude
// app ready to work, already knowing where things stand. `?copy=1` returns the
// prompt as plain text instead, for the Copy button / manual pasting.
export async function GET(request, { params }) {
  const supabase = getSupabase();

  const [taskRes, logRes] = await Promise.all([
    supabase.from("tasks").select("*").eq("id", params.id),
    supabase
      .from("worklog")
      .select("summary, created_at")
      .eq("task_id", params.id)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  if (taskRes.error) {
    return NextResponse.json({ error: friendlyDbError(taskRes.error) }, { status: 500 });
  }
  if (!taskRes.data || taskRes.data.length === 0) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const baseUrl = new URL(request.url).origin;
  const prompt = buildHandoffPrompt(taskRes.data[0], logRes.data || [], baseUrl);

  if (new URL(request.url).searchParams.get("copy")) {
    return new NextResponse(prompt, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return NextResponse.redirect(`https://claude.ai/new?q=${encodeURIComponent(prompt)}`);
}
