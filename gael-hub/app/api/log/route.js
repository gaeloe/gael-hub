import { NextResponse } from "next/server";
import { getSupabase, friendlyDbError } from "../../../lib/supabase";

// Never cache — the log must always show the latest sessions.
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("worklog")
    .select("*, tasks(title)")
    .order("created_at", { ascending: false })
    .limit(60);

  if (error) return NextResponse.json({ error: friendlyDbError(error) }, { status: 500 });
  return NextResponse.json({ log: data });
}
