import { createClient } from "@supabase/supabase-js";

// Server-side only client. Uses the SERVICE ROLE key so it can read/write
// the database directly from our API routes. This key must never be sent
// to the browser — it only lives in Vercel's environment variables.
export function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables."
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
