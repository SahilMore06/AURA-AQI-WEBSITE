-- ─────────────────────────────────────────────────────────────────────────────
-- AURA: AQI Readings table — stores every live AQI fetch per user session
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.aqi_readings (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references auth.users(id) on delete cascade not null,
  captured_at   timestamp with time zone default now() not null,
  latitude      double precision,
  longitude     double precision,
  city          text,
  -- Core AQI
  aqi           integer not null,
  aqi_category  text,
  -- Pollutants (µg/m³)
  pm25          numeric,
  pm10          numeric,
  ozone         numeric,
  no2           numeric,
  so2           numeric,
  co            numeric,
  -- Source
  data_source   text default 'Google Air Quality API'
);

-- Row-level security
alter table public.aqi_readings enable row level security;

create policy "Users can insert own readings"
  on public.aqi_readings for insert
  with check ( auth.uid() = user_id );

create policy "Users can view own readings"
  on public.aqi_readings for select
  using ( auth.uid() = user_id );

-- Index for fast per-user time-series queries
create index if not exists aqi_readings_user_time 
  on public.aqi_readings (user_id, captured_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- AURA: user_profiles — add insert policy if missing (idempotent)
-- ─────────────────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'user_profiles'
      and policyname = 'Users can insert own profile'
  ) then
    execute '
      create policy "Users can insert own profile"
        on public.user_profiles for insert
        with check ( auth.uid() = id )
    ';
  end if;
end $$;
