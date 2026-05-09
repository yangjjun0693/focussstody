-- Add email column to profiles for login-by-username lookup
alter table public.profiles add column if not exists email text;

-- Allow profiles to be read by anyone for username lookup during login
create policy "Anyone can look up profile by username"
    on profiles for select using (true);