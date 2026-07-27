-- Migration 2: session coordination.
-- Run in Supabase: Project > SQL Editor > New query > paste this > Run.
-- Safe to re-run: every statement is a no-op if already applied.

-- Tasks flagged for the scheduled Claude "autopilot" routine to pick up.
alter table tasks add column if not exists autopilot boolean not null default false;

-- One row per work session / handoff, from any source: the hub UI, a pasted
-- HANDOFF block, a Claude session calling /api/handoff, or the autopilot
-- routine. This is the "what actually happened" journal.
create table if not exists worklog (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete set null,
  summary text not null,
  details text not null default '',
  next_step text not null default '',
  source text not null default '',
  created_at timestamptz not null default now()
);
