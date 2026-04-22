-- ── Drop existing ───────────────────────────────────────────────
drop table if exists public.study_data cascade;
drop table if exists public.profiles cascade;
drop function if exists public.handle_new_user cascade;

-- ── Users table (extends Supabase auth.users) ──────────────────
create table public.profiles (
    id          uuid references auth.users(id) on delete cascade primary key,
    username    text unique not null,
    is_pro      boolean default false,
    created_at  timestamptz default now()
);

-- ── Study data table ────────────────────────────────────────────
create table public.study_data (
    id          uuid default gen_random_uuid() primary key,
    user_id     uuid references auth.users(id) on delete cascade unique,
    sessions    jsonb default '{}'::jsonb,
    total_exp   bigint default 0,
    weekly_log  jsonb default '{}'::jsonb,
    streak      int default 0,
    last_study_date text,
    goal_hours  jsonb default '{}'::jsonb,
    notes       jsonb default '[]'::jsonb,
    subjects    jsonb default '["CODING","STUDY","MATH","DESIGN"]'::jsonb,
    store_items jsonb default '[]'::jsonb,
    active_theme text default 'default',
    updated_at  timestamptz default now()
);

-- ── RLS Policies ────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.study_data enable row level security;

-- Profiles: users can read/update their own
create policy "Users can view own profile"
    on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
    on profiles for update using (auth.uid() = id);

-- Study data: users can only access their own
create policy "Users can view own data"
    on study_data for select using (auth.uid() = user_id);

create policy "Users can insert own data"
    on study_data for insert with check (auth.uid() = user_id);

create policy "Users can update own data"
    on study_data for update using (auth.uid() = user_id);

-- ── Auto-create profile on signup ───────────────────────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, username)
    values (new.id, new.raw_user_meta_data->>'username');

    insert into public.study_data (user_id)
    values (new.id);

    return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();