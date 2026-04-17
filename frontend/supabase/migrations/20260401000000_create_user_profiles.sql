create table public.user_profiles (
  id uuid references auth.users not null primary key,
  display_name text,
  city text,
  health_sensitivities text[],
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.user_profiles enable row level security;

create policy "Users can view own profile"
  on public.user_profiles for select
  using ( auth.uid() = id );

create policy "Users can update own profile"
  on public.user_profiles for update
  using ( auth.uid() = id );

create policy "Users can insert own profile"
  on public.user_profiles for insert
  with check ( auth.uid() = id );
