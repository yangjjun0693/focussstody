-- Enable Realtime for the study room presence channel
-- Presence channels don't need table replication, but we need Realtime enabled

-- If you have any broadcast/presence issues, run this:
alter publication supabase_realtime add table profiles;