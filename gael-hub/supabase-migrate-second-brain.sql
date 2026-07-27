-- Second-brain upgrade for an existing gael-hub database.
-- Run in Supabase: Project > SQL Editor > New query > paste this > Run.
-- Safe to re-run: every statement is a no-op if already applied.

alter table tasks add column if not exists project text not null default '';
alter table tasks add column if not exists notes text not null default '';
alter table tasks add column if not exists next_step text not null default '';
alter table tasks add column if not exists updated_at timestamptz not null default now();

-- Block the "invisible task" failure mode at the database level too: a task
-- stored with a stage the UI doesn't render matches no column and silently
-- disappears from the hub. The app validates this already; this closes the
-- gap for anything writing to the database directly.
alter table tasks drop constraint if exists tasks_stage_check;
alter table tasks add constraint tasks_stage_check
  check (stage in ('idea', 'in_dev', 'review', 'live'));
