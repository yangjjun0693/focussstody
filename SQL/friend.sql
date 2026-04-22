-- ── Friends system ──────────────────────────────────────────────
create table public.friendships (
    id          uuid default gen_random_uuid() primary key,
    sender_id   uuid references auth.users(id) on delete cascade,
    receiver_id uuid references auth.users(id) on delete cascade,
    status      text default 'pending', -- 'pending', 'accepted', 'declined'
    created_at  timestamptz default now(),
    unique(sender_id, receiver_id)
);

alter table public.friendships enable row level security;

-- Anyone can send a request
create policy "Users can send friend requests"
    on friendships for insert with check (auth.uid() = sender_id);

-- Users can see their own friendships
create policy "Users can view their friendships"
    on friendships for select using (
        auth.uid() = sender_id or auth.uid() = receiver_id
    );

-- Users can update (accept/decline) requests sent to them
create policy "Users can respond to friend requests"
    on friendships for update using (auth.uid() = receiver_id);

-- Users can delete their own friendships
create policy "Users can delete friendships"
    on friendships for delete using (
        auth.uid() = sender_id or auth.uid() = receiver_id
    );

-- ── Daily challenges ─────────────────────────────────────────────
create table public.daily_challenges (
    id          uuid default gen_random_uuid() primary key,
    date        text unique not null,         -- '2025-03-06'
    type        text not null,                -- 'study_time', 'streak', 'sessions'
    target      int not null,                 -- e.g. 7200 (seconds), 3 (streak days)
    reward      int not null,                 -- bonus $STUDY tokens worth in seconds of exp
    description text not null
);

alter table public.daily_challenges enable row level security;

create policy "Anyone can read daily challenges"
    on daily_challenges for select using (true);

-- ── Challenge completions ────────────────────────────────────────
create table public.challenge_completions (
    id           uuid default gen_random_uuid() primary key,
    user_id      uuid references auth.users(id) on delete cascade,
    challenge_id uuid references public.daily_challenges(id) on delete cascade,
    completed_at timestamptz default now(),
    unique(user_id, challenge_id)
);

alter table public.challenge_completions enable row level security;

create policy "Users can view own completions"
    on challenge_completions for select using (auth.uid() = user_id);

create policy "Users can insert own completions"
    on challenge_completions for insert with check (auth.uid() = user_id);

-- ── Seed today's challenge ───────────────────────────────────────
-- Run this daily or set up a cron. For now seed a few days manually.
insert into public.daily_challenges (date, type, target, reward, description)
values
    (to_char(now(), 'YYYY-MM-DD'),        'study_time', 3600,  500,  'Study for 1 hour today'),
    (to_char(now() + interval '1 day', 'YYYY-MM-DD'), 'study_time', 7200,  1000, 'Study for 2 hours today'),
    (to_char(now() + interval '2 days', 'YYYY-MM-DD'), 'sessions',   3,     600,  'Complete 3 study sessions'),
    (to_char(now() + interval '3 days', 'YYYY-MM-DD'), 'study_time', 5400,  800,  'Study for 90 minutes today'),
    (to_char(now() + interval '4 days', 'YYYY-MM-DD'), 'streak',     3,     1200, 'Maintain a 3 day streak'),
    (to_char(now() + interval '5 days', 'YYYY-MM-DD'), 'study_time', 10800, 2000, 'Study for 3 hours today'),
    (to_char(now() + interval '6 days', 'YYYY-MM-DD'), 'sessions',   5,     1000, 'Complete 5 study sessions')
on conflict (date) do nothing;