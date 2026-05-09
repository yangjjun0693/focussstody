create table if not exists invites (
  id uuid primary key default uuid_generate_v4(),
  workspace_id text not null,
  created_by uuid not null references profiles(id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

alter table invites enable row level security;

create policy "Anyone can read invites"
  on invites for select
  using (true);

create policy "Workspace members can create invites"
  on invites for insert
  with check (auth.uid() = created_by);