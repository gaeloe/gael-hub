-- Run this in Supabase: Project > SQL Editor > New query > paste this > Run.
-- Safe to re-run: the tables are created only if missing and the seed below
-- skips ideas that are already there.

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  stage text not null default 'idea'
    check (stage in ('idea', 'in_dev', 'review', 'live')),
  project text not null default '',
  notes text not null default '',
  next_step text not null default '',
  autopilot boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per work session / handoff (hub UI, pasted HANDOFF block, a Claude
-- session calling /api/handoff, or the autopilot routine).
create table if not exists worklog (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete set null,
  summary text not null,
  details text not null default '',
  next_step text not null default '',
  source text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists ideas (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  notes text default '',
  source text default '',
  created_at timestamptz not null default now()
);

-- Seed the starting ideas so nothing gets lost in the move. Wrapped so that
-- re-running this file doesn't insert a second copy of every idea.

insert into ideas (title, notes, source)
select * from (values
(
  'Reddit "buying intent" lead source — email people minutes after they publicly ask for your service',
  'Monitor 5-10 subreddits where our buyers hang out for posts like "anyone got recommendations for X", "alternative to [competitor]", "looking for a good X", "got burned by X - where do I go now". These are public, timestamped declarations of buying intent.

Process: (1) pick the subreddits, (2) search those phrases every morning, (3) filter to posts under ~4 hours old with clear intent, (4) find the poster''s identity (e.g. via LinkedIn) and email, (5) send a short 2-line email referencing their exact post, (6) call any positive reply within 30 minutes.

Reported result from the source post: ~23% reply rate vs ~0.3% for average cold email; one operator did 187 posts scraped -> 164 emails found -> 38 replies -> 24 calls -> 11 closes -> ~$50.6K revenue in a month, alongside a normal cold email pipeline (not replacing it). Unverified third-party claim - worth testing small before trusting the numbers.',
  'Shared by Gaël, 26 Jul 2026 (social media post)'
),
(
  'Pre-launch security checklist for any "vibe coded" / AI-built app before it goes live',
  'Most fast-built AI apps ship with weak security (open databases, exposed API keys, no rate limits). A ~30-minute checklist before every launch:

1. Protect yourself legally - real privacy policy, know where user data is stored, nothing shady with it.
2. Lock down the database - turn on Row Level Security (e.g. Supabase), validate form data server-side (not just frontend), generic error messages.
3. Test the failure cases on login/signup - wrong password 5x, password reset on fake email, clicking verification link twice, signing up with existing email.
4. Run 4 quick AI security prompts before launch (security posture check, OWASP check, leaked credentials/data check, exposed API key check).
5. Protect infrastructure/wallet - rate limits on every endpoint, hard daily spending caps + alerts on paid APIs, CAPTCHA on public forms, restrict which domains can call the API (CORS).

Also flagged: as of 2026, AI-only-written code can''t be copyrighted in the US, and open-source code under certain licenses (GPL) can force you to open-source your whole app if used without knowing it - worth checking before launch.

Action for us: run this checklist before shipping anything with user data or a database.',
  'Shared by Gaël, 26 Jul 2026 (references a Reddit thread)'
),
(
  '"Citation Gap Method" — getting our brand recommended by AI tools (ChatGPT, Perplexity, Gemini, Google AI)',
  'Work backwards from the exact questions buyers ask AI tools before they buy, find where we''re missing from the AI''s answer (the "Citation Gap"), and fix it on purpose.

1. Turn real buying decisions into "frozen" prompts - pull actual questions from search data, sales calls, support, lost deals; write each as a short Google-style query and a natural AI prompt; freeze 10-25 high-intent ones.
2. Map who gets recommended and cited - for each prompt/AI tool, record which products get recommended and which sources get cited, kept as separate lists.
3. Name the exact gap - decision gap, entity gap, evidence gap, or distribution gap.
4. Study what the pages AI actually cites have in common - direct answers, named shortlists, comparison tables, honest limitations, real prices, named author + date.
5. Build a page worth citing, matching that pattern for our own product/use case.
6. Get placed on the third-party pages AI already reads - pitch a specific missing use case with proof, not just "add us."
7. Re-run the same frozen prompts later and track whether we moved from "not cited" to "cited."',
  '"Citation Gap Method" article by @borjafat, shared by Gaël, 26 Jul 2026'
),
(
  'Content checklist to get picked up by AI search (ChatGPT, Google AI Overviews, Perplexity, Gemini)',
  'Companion to the Citation Gap Method - how to format a page so AI tools can easily pull an answer from it.

1. Structure content in small, self-contained ~375-word blocks. Each key point/definition/answer fully understandable in one chunk, under a clear question-style heading. Open with a direct 2-3 sentence answer, add a short summary at the top of major sections, prefer lists/tables over dense paragraphs.
2. Match how people actually ask - exact phrasing/intent of target questions, clear definitions and "best for" language, explicit checkable claims.
3. Add structured data - FAQ schema, product schema, clean HTML.
4. Keep it fresh and credible - update periodically, consistent brand/topic mentions, quality backlinks from trusted sites.
5. Test it - could an AI pull one clean, complete answer from a single ~375-word section?
6. Track results - watch traffic/citations from AI Overviews, ChatGPT, Perplexity, Gemini, Copilot; double down on formats that get quoted.

Suggested order: (1) restructure best existing pages into direct-answer/chunked format, (2) add schema + summaries + comparisons, (3) publish new comparison articles, (4) build backlinks and brand consistency.',
  'Article on optimizing content for AI search traffic, shared by Gaël, 26 Jul 2026 (references Google Cloud Discovery Engine signals - treat specifics as claims to verify)'
)) as seed(title, notes, source)
where not exists (select 1 from ideas where ideas.title = seed.title);
