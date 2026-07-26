import { NextResponse } from "next/server";
import { getSupabase } from "../../../../lib/supabase";

export async function PATCH(request, { params }) {
  const body = await request.json();
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("tasks")
    .update({ stage: body.stage })
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ task: data });
}

export async function DELETE(request, { params }) {
  const supabase = getSupabase();
  const { error } = await supabase.from("tasks").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
