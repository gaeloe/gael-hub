import crypto from "crypto";
import { NextResponse } from "next/server";
import { getSupabase } from "../../../lib/supabase";

const BLOG_ENDPOINT = "https://benorth.app/api/blog-posts";

// Relay: Claude sessions (cloud autopilot included) deliver finished articles
// here with the hub key they already hold; the hub signs and forwards to the
// benorth blog intake using BLOG_WEBHOOK_SECRET, which lives only in Vercel
// env / runtime — never in any prompt, source default, or config file.
//
// DRAFTS ONLY, structurally: status is hard-forced to "draft" with no
// override. Gaël approves every article before it goes live; publishing is
// done outside this relay (re-send the same id with status "published",
// directly against the benorth API, by someone holding the secret locally).
export async function POST(request) {
  const secret = process.env.BLOG_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "BLOG_WEBHOOK_SECRET is not configured on the hub" },
      { status: 503 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const event = body.event || "post.published";
  body.event = event;

  if (event !== "test") {
    const slug = (body.slug || "").trim();
    if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
      return NextResponse.json(
        { error: "slug is required: lowercase words separated by hyphens" },
        { status: 400 }
      );
    }
    // Stable id derived from the slug when the sender doesn't provide one —
    // re-sending the same slug then updates the same article (retry-safe).
    if (body.id === undefined) {
      const hash = crypto.createHash("md5").update(slug).digest("hex");
      body.id = 100000 + (parseInt(hash.slice(0, 12), 16) % 1900000000);
    }
    body.status = "draft"; // the approval gate — no exceptions via this relay
  }

  const payload = JSON.stringify(body);
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");

  const upstream = await fetch(BLOG_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
      "X-Signature": `sha256=${signature}`,
    },
    body: payload,
    cache: "no-store",
  });
  const data = await upstream.json().catch(() => ({}));

  // Journal successful article deliveries so drafts surface on Claude's desk.
  if (event !== "test" && upstream.ok) {
    const supabase = getSupabase();
    await supabase.from("worklog").insert([
      {
        summary: `Blog draft staged on benorth.app: "${body.title || body.slug}" — awaiting Gaël's approval`,
        details: `slug: ${body.slug}\nid: ${body.id}\npreview only — status is draft, not visible on /blog until approved and re-sent as published.\n\n${(body.metaDescription || "").slice(0, 300)}`,
        next_step: "Review the draft; tell Claude to publish it (or bin it)",
        source: "blog",
      },
    ]);
  }

  return NextResponse.json(
    { relayed: true, draft_enforced: event !== "test", upstream_status: upstream.status, ...data },
    { status: upstream.ok ? 200 : upstream.status }
  );
}
