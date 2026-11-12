-- Migration: 20261112000100_community_deal_verification.sql
-- Purpose: Community deal verification, user attribution, real/fake votes, and upvote tracking

begin;

-- 1. Create verification_status enum if not exists
do $$ begin
  create type deal_verification_status as enum ('verified', 'community', 'pending', 'expired', 'rejected');
exception
  when duplicate_object then null;
end $$;

-- 2. Extend public.deals table
alter table public.deals
  add column if not exists user_id uuid references public.profiles(id) on delete set null,
  add column if not exists verification_status deal_verification_status not null default 'verified',
  add column if not exists upvotes_count integer not null default 0,
  add column if not exists real_votes_count integer not null default 0,
  add column if not exists fake_votes_count integer not null default 0,
  add column if not exists created_at timestamptz not null default timezone('utc'::text, now()),
  add column if not exists updated_at timestamptz not null default timezone('utc'::text, now());

-- Indexes for lightning-fast feed sorting
create index if not exists idx_deals_verification_status on public.deals(verification_status);
create index if not exists idx_deals_upvotes_count on public.deals(upvotes_count desc);
create index if not exists idx_deals_user_id on public.deals(user_id);
create index if not exists idx_deals_created_at on public.deals(created_at desc);

-- 3. Table public.deal_votes (Real vs. Fake/Expired votes)
create table if not exists public.deal_votes (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  vote_type text not null check (vote_type in ('real', 'fake')),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint deal_votes_user_deal_unique unique (deal_id, user_id)
);

create index if not exists idx_deal_votes_deal_id on public.deal_votes(deal_id);
create index if not exists idx_deal_votes_user_id on public.deal_votes(user_id);

-- 4. Table public.deal_upvotes (Upvote tracking)
create table if not exists public.deal_upvotes (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint deal_upvotes_user_deal_unique unique (deal_id, user_id)
);

create index if not exists idx_deal_upvotes_deal_id on public.deal_upvotes(deal_id);
create index if not exists idx_deal_upvotes_user_id on public.deal_upvotes(user_id);

-- 5. Trigger functions to maintain cached counts on public.deals automatically
create or replace function public.sync_deal_votes_summary()
returns trigger as $$
declare
  target_deal_id uuid;
begin
  target_deal_id := coalesce(new.deal_id, old.deal_id);
  update public.deals
  set
    real_votes_count = (select count(*) from public.deal_votes where deal_id = target_deal_id and vote_type = 'real'),
    fake_votes_count = (select count(*) from public.deal_votes where deal_id = target_deal_id and vote_type = 'fake'),
    updated_at = timezone('utc'::text, now())
  where id = target_deal_id;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_sync_deal_votes on public.deal_votes;
create trigger trg_sync_deal_votes
after insert or update or delete on public.deal_votes
for each row execute function public.sync_deal_votes_summary();

create or replace function public.sync_deal_upvotes_summary()
returns trigger as $$
declare
  target_deal_id uuid;
begin
  target_deal_id := coalesce(new.deal_id, old.deal_id);
  update public.deals
  set
    upvotes_count = (select count(*) from public.deal_upvotes where deal_id = target_deal_id),
    updated_at = timezone('utc'::text, now())
  where id = target_deal_id;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_sync_deal_upvotes on public.deal_upvotes;
create trigger trg_sync_deal_upvotes
after insert or delete on public.deal_upvotes
for each row execute function public.sync_deal_upvotes_summary();

-- 6. Row-Level Security (RLS)
alter table public.deal_votes enable row level security;
alter table public.deal_upvotes enable row level security;

-- Deal votes policies
create policy "Allow public read for deal_votes"
  on public.deal_votes for select
  to anon, authenticated
  using (true);

create policy "Allow authenticated users to vote"
  on public.deal_votes for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Allow users to update own votes"
  on public.deal_votes for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Allow users to delete own votes"
  on public.deal_votes for delete
  to authenticated
  using (auth.uid() = user_id);

-- Deal upvotes policies
create policy "Allow public read for deal_upvotes"
  on public.deal_upvotes for select
  to anon, authenticated
  using (true);

create policy "Allow authenticated users to upvote"
  on public.deal_upvotes for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Allow users to delete own upvote"
  on public.deal_upvotes for delete
  to authenticated
  using (auth.uid() = user_id);

-- Allow authenticated users to submit community deals
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where tablename = 'deals' and policyname = 'Allow authenticated insert for community deals'
  ) then
    create policy "Allow authenticated insert for community deals"
      on public.deals for insert
      to authenticated
      with check (auth.uid() = user_id or user_id is null);
  end if;
end $$;

commit;
