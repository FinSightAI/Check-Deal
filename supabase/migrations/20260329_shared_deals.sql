-- shared_deals table for collaborative deal sharing
create table if not exists shared_deals (
  id          uuid primary key default gen_random_uuid(),
  token       uuid unique not null default gen_random_uuid(),
  deal_data   jsonb not null,
  allow_edit  boolean not null default false,
  pin         text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Anyone can read shared deals by token (no auth required)
alter table shared_deals enable row level security;

create policy "Public read by token"
  on shared_deals for select
  using (true);

create policy "Public insert"
  on shared_deals for insert
  with check (true);

create policy "Public update by token"
  on shared_deals for update
  using (true);
