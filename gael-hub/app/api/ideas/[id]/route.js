import { NextResponse } from "next/server";
import { getSupabase } from "../../../../lib/supabase";

export async function DELETE(request, { params }) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("ideas")
    .delete()
    .eq("id", params.id)
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Idea not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
