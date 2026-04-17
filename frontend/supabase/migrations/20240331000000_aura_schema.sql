-- AURA Web Application Schema

-- Create extension for UUID generation if not exists
create extension if not exists "uuid-ossp";

-- Table: profiles
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  avatar_url text,
  theme text default 'system',
  alerts_enabled boolean default false,
  aqi_threshold integer default 100,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for profiles
alter table public.profiles enable row level security;

-- Policies for profiles
create policy "Users can view their own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can insert their own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Trigger to automatically create a profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Table: stations
create table if not exists public.stations (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  latitude double precision not null,
  longitude double precision not null,
  location_type text default 'urban',
  status text default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for stations
alter table public.stations enable row level security;

-- Policies for stations
create policy "Anyone can view active stations" on public.stations
  for select using (status = 'active');

-- Table: readings
create table if not exists public.readings (
  id uuid default uuid_generate_v4() primary key,
  station_id uuid references public.stations(id) on delete cascade not null,
  aqi integer not null,
  pm25 numeric not null,
  pm10 numeric not null,
  o3 numeric,
  no2 numeric,
  so2 numeric,
  co numeric,
  temperature numeric,
  humidity numeric,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for readings
alter table public.readings enable row level security;

-- Policies for readings
create policy "Anyone can view readings" on public.readings
  for select using (true);

-- Insert demo stations
insert into public.stations (id, name, latitude, longitude, location_type)
values
  ('550e8400-e29b-41d4-a716-446655440000', 'Downtown Seattle (Pioneer Square)', 47.602, -122.332, 'urban'),
  ('550e8400-e29b-41d4-a716-446655440001', 'Bellevue (Downtown Park)', 47.611, -122.204, 'suburban'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Redmond (Marymoor Park)', 47.662, -122.115, 'suburban'),
  ('550e8400-e29b-41d4-a716-446655440003', 'Renton (The Landing)', 47.498, -122.203, 'urban')
on conflict (id) do nothing;

-- Insert demo readings
insert into public.readings (station_id, aqi, pm25, pm10, temperature, humidity)
values
  ('550e8400-e29b-41d4-a716-446655440000', 42, 12.5, 18.2, 72.1, 45.0),
  ('550e8400-e29b-41d4-a716-446655440001', 35, 9.1, 14.5, 73.5, 43.2),
  ('550e8400-e29b-41d4-a716-446655440002', 28, 7.2, 11.8, 71.8, 46.5),
  ('550e8400-e29b-41d4-a716-446655440003', 55, 15.8, 22.1, 74.2, 42.1);
