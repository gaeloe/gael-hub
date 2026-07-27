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

// Translate "column does not exist" into something actionable: it means the
// second-brain migration hasn't been applied to the database yet, so tell the
// user exactly what to run instead of echoing a cryptic SQL error. Postgres
// reports this as 42703 on reads; PostgREST reports it as PGRST204 on writes.
export function friendlyDbError(error) {
  if (error.code === "42703" || error.code === "PGRST204") {
    return "The database is missing newer columns — run supabase-migrate-second-brain.sql in the Supabase SQL editor, then retry.";
  }
  return error.message;
}
