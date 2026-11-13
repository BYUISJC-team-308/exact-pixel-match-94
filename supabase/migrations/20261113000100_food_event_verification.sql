-- Migration: 20261113000100_food_event_verification.sql
-- Purpose: Free food event verification, user attribution, real/fake votes, and upvote tracking

begin;

-- 1. Extend public.food_events table
alter table public.food_events
  add column if not exists user_id uuid references public.profiles(id) on delete set null,
  add column if not exists verification_status text not null default 'community',
  add column if not exists upvotes_count integer not null default 0,
  add column if not exists real_votes_count integer not null default 0,
  add column if not exists fake_votes_count integer not null default 0,
  add column if not exists created_at timestamptz not null default timezone('utc'::text, now()),
  add column if not exists updated_at timestamptz not null default timezone('utc'::text, now());

-- Indexes for lightning-fast event feed queries
create index if not exists idx_food_events_verification_status on public.food_events(verification_status);
create index if not exists idx_food_events_upvotes_count on public.food_events(upvotes_count desc);
create index if not exists idx_food_events_user_id on public.food_events(user_id);
create index if not exists idx_food_events_created_at on public.food_events(created_at desc);

-- 2. Table public.food_event_votes (Real & Active vs. Gone / Expired)
create table if not exists public.food_event_votes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.food_events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  vote_type text not null check (vote_type in ('real', 'fake')),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint food_event_votes_user_event_unique unique (event_id, user_id)
);

create index if not exists idx_food_event_votes_event_id on public.food_event_votes(event_id);
create index if not exists idx_food_event_votes_user_id on public.food_event_votes(user_id);

-- 3. Table public.food_event_upvotes (Upvote tracking)
create table if not exists public.food_event_upvotes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.food_events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint food_event_upvotes_user_event_unique unique (event_id, user_id)
);

create index if not exists idx_food_event_upvotes_event_id on public.food_event_upvotes(event_id);
create index if not exists idx_food_event_upvotes_user_id on public.food_event_upvotes(user_id);

-- 4. Trigger functions to maintain cached counts on public.food_events automatically
create or replace function public.sync_food_event_votes_summary()
returns trigger as $$
declare
  target_event_id uuid;
begin
  target_event_id := coalesce(new.event_id, old.event_id);
  update public.food_events
  set
    real_votes_count = (select count(*) from public.food_event_votes where event_id = target_event_id and vote_type = 'real'),
    fake_votes_count = (select count(*) from public.food_event_votes where event_id = target_event_id and vote_type = 'fake'),
    updated_at = timezone('utc'::text, now())
  where id = target_event_id;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_sync_food_event_votes on public.food_event_votes;
create trigger trg_sync_food_event_votes
after insert or update or delete on public.food_event_votes
for each row execute function public.sync_food_event_votes_summary();

create or replace function public.sync_food_event_upvotes_summary()
returns trigger as $$
declare
  target_event_id uuid;
begin
  target_event_id := coalesce(new.event_id, old.event_id);
  update public.food_events
  set
    upvotes_count = (select count(*) from public.food_event_upvotes where event_id = target_event_id),
    updated_at = timezone('utc'::text, now())
  where id = target_event_id;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_sync_food_event_upvotes on public.food_event_upvotes;
create trigger trg_sync_food_event_upvotes
after insert or delete on public.food_event_upvotes
for each row execute function public.sync_food_event_upvotes_summary();

-- 5. Row-Level Security (RLS)
alter table public.food_event_votes enable row level security;
alter table public.food_event_upvotes enable row level security;

-- Food event votes policies
create policy "Allow public read for food_event_votes"
  on public.food_event_votes for select
  to anon, authenticated
  using (true);

create policy "Allow authenticated users to vote on food events"
  on public.food_event_votes for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Allow users to update own food event votes"
  on public.food_event_votes for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Allow users to delete own food event votes"
  on public.food_event_votes for delete
  to authenticated
  using (auth.uid() = user_id);

-- Food event upvotes policies
create policy "Allow public read for food_event_upvotes"
  on public.food_event_upvotes for select
  to anon, authenticated
  using (true);

create policy "Allow authenticated users to upvote food events"
  on public.food_event_upvotes for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Allow users to delete own food event upvote"
  on public.food_event_upvotes for delete
  to authenticated
  using (auth.uid() = user_id);

-- Allow authenticated users to submit community food events
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where tablename = 'food_events' and policyname = 'Allow authenticated insert for community food events'
  ) then
    create policy "Allow authenticated insert for community food events"
      on public.food_events for insert
      to authenticated
      with check (auth.uid() = user_id or user_id is null);
  end if;
end $$;

-- Update existing records: default verified vs community
update public.food_events
set verification_status = 'verified'
where (details ilike '%handshake%' or host not ilike '%student%')
  and (location_note is null or location_note not ilike '%community%');

update public.food_events
set verification_status = 'community'
where location_note ilike '%community%' or host ilike '%student%';

commit;
