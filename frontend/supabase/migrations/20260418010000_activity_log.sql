-- ─────────────────────────────────────────────────────────────────────────────
-- AURA Activity Log Table
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/mnzmwhgrzhiemhgukwjk/sql
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.activity_log (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references auth.users(id) on delete cascade not null,
  user_email   text not null,
  event_type   text not null,
  event_data   jsonb default '{}',
  page         text,
  created_at   timestamptz default now() not null
);

-- Row Level Security: users only see/write their own rows
alter table public.activity_log enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'activity_log' and policyname = 'Users can insert own activity'
  ) then
    execute 'create policy "Users can insert own activity"
      on public.activity_log for insert
      with check ( auth.uid() = user_id )';
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'activity_log' and policyname = 'Users can view own activity'
  ) then
    execute 'create policy "Users can view own activity"
      on public.activity_log for select
      using ( auth.uid() = user_id )';
  end if;
end $$;

-- Index for fast per-user timeline queries
create index if not exists activity_log_user_time
  on public.activity_log (user_id, created_at desc);

-- Index for filtering by event type
create index if not exists activity_log_event_type
  on public.activity_log (event_type);
