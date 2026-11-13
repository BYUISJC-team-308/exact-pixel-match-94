-- Migration: 20261113000300_user_saved_items.sql
-- Enables account persistence for saved deals (P03) and saved food events (P04).

-- 1. Saved Deals Table
create table if not exists public.saved_deals (
  user_id uuid not null references auth.users(id) on delete cascade,
  deal_id uuid not null references public.deals(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, deal_id)
);

alter table public.saved_deals add column if not exists created_at timestamptz not null default now();
create index if not exists idx_saved_deals_user_id on public.saved_deals(user_id);
create index if not exists idx_saved_deals_deal_id on public.saved_deals(deal_id);

-- 2. Saved Events Table
create table if not exists public.saved_events (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.food_events(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

alter table public.saved_events add column if not exists created_at timestamptz not null default now();
create index if not exists idx_saved_events_user_id on public.saved_events(user_id);
create index if not exists idx_saved_events_event_id on public.saved_events(event_id);

-- 3. Grants
grant select, insert, delete on public.saved_deals to authenticated;
grant select, insert, delete on public.saved_events to authenticated;

-- 4. Row Level Security Policies for saved_deals
alter table public.saved_deals enable row level security;

drop policy if exists "Users can view own saved deals" on public.saved_deals;
create policy "Users can view own saved deals"
  on public.saved_deals for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own saved deals" on public.saved_deals;
create policy "Users can insert own saved deals"
  on public.saved_deals for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own saved deals" on public.saved_deals;
create policy "Users can delete own saved deals"
  on public.saved_deals for delete
  to authenticated
  using (auth.uid() = user_id);

-- 5. Row Level Security Policies for saved_events
alter table public.saved_events enable row level security;

drop policy if exists "Users can view own saved events" on public.saved_events;
create policy "Users can view own saved events"
  on public.saved_events for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own saved events" on public.saved_events;
create policy "Users can insert own saved events"
  on public.saved_events for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own saved events" on public.saved_events;
create policy "Users can delete own saved events"
  on public.saved_events for delete
  to authenticated
  using (auth.uid() = user_id);
