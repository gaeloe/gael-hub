-- Migration 3: priority scoring (1 = do first … 5 = someday).
-- Run in Supabase: Project > SQL Editor. Safe to re-run.
alter table tasks add column if not exists priority int not null default 3;
