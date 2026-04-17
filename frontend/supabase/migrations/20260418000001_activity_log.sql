-- ─────────────────────────────────────────────────────────────────────────────
-- AURA: activity_log — tracks every user action fire-and-forget from the app
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.activity_log (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  user_email  text,
  event_type  text not null,
  event_data  jsonb default '{}',
  page        text,
  created_at  timestamp with time zone default now() not null
);

-- Row-level security
alter table public.activity_log enable row level security;

-- Users can insert their own log entries (the app writes these)
create policy "Users can insert own activity"
  on public.activity_log for insert
  with check ( auth.uid() = user_id );

-- Users can view their own activity history
create policy "Users can view own activity"
  on public.activity_log for select
  using ( auth.uid() = user_id );

-- No update or delete allowed — logs are immutable
create policy "No updates to activity log"
  on public.activity_log for update
  using ( false );

create policy "No deletes from activity log"
  on public.activity_log for delete
  using ( false );

-- Index for fast per-user chronological queries
create index if not exists activity_log_user_time
  on public.activity_log (user_id, created_at desc);

-- Index for filtering by event type
create index if not exists activity_log_event_type
  on public.activity_log (event_type);
