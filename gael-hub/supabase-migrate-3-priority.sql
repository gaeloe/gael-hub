-- Migration 3: priority scoring (1 = do first … 5 = someday).
-- Run in Supabase: Project > SQL Editor. Safe to re-run.
alter table tasks add column if not exists priority int not null default 3;

-- Loops: standing jobs Claude re-does every morning (added 2026-07-28).
alter table tasks add column if not exists is_loop boolean not null default false;
