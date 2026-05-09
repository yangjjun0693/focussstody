-- Allow anyone to read study_data for leaderboard (only public fields)
create policy "Public leaderboard read"
    on study_data for select using (true);