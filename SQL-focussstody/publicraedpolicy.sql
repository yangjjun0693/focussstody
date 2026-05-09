-- ── Allow public profile reads (for friend search + leaderboard) ──
drop policy if exists "Anyone can look up profile by username" on profiles;
drop policy if exists "Public leaderboard read" on study_data;

create policy "Public profile read"
    on profiles for select using (true);

create policy "Public study data read"
    on study_data for select using (true);

-- ── Friendships: allow reading sender profile in join ─────────────
-- The joined profile query needs to read other users' profiles
-- Already covered by "Public profile read" above

-- ── Verify policies are set ───────────────────────────────────────
select tablename, policyname, cmd 
from pg_policies 
where tablename in ('profiles', 'study_data', 'friendships', 'challenge_completions')
order by tablename;