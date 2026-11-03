-- Run once in the team Supabase project's SQL Editor.
-- Requires public.app_activity_events from the earlier Feature 10 setup.
-- Save a copy of this file in the repository so the dashboard change is reviewable.

begin;

create table if not exists public.saved_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null check (item_type in ('discount', 'food_event')),
  item_id text not null,
  saved_at timestamptz not null default now(),
  primary key (user_id, item_type, item_id)
);

alter table public.saved_items enable row level security;
revoke all on public.saved_items from anon, authenticated;
grant select, delete on public.saved_items to authenticated;
grant insert (user_id, item_type, item_id) on public.saved_items to authenticated;

drop policy if exists "Users read their saved items" on public.saved_items;
create policy "Users read their saved items"
  on public.saved_items for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users save their own items" on public.saved_items;
create policy "Users save their own items"
  on public.saved_items for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users remove their saved items" on public.saved_items;
create policy "Users remove their saved items"
  on public.saved_items for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Activity is written by a database trigger, so browsers cannot forge its time.
alter table public.app_activity_events enable row level security;
revoke all on public.app_activity_events from anon, authenticated;
grant select on public.app_activity_events to authenticated;

drop policy if exists "Users can record their own activity" on public.app_activity_events;
drop policy if exists "Users can read their own activity" on public.app_activity_events;
create policy "Users can read their own activity"
  on public.app_activity_events for select to authenticated
  using ((select auth.uid()) = user_id);

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.record_saved_item()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is distinct from new.user_id then
    raise exception 'Cannot record an item for another user';
  end if;
  insert into public.app_activity_events (user_id, event_type, item_id, created_at)
  values (
    new.user_id,
    case new.item_type
      when 'discount' then 'discount_saved'
      when 'food_event' then 'food_event_saved'
    end,
    new.item_id,
    new.saved_at
  );
  return new;
end;
$$;

revoke all on function private.record_saved_item() from public, anon, authenticated;
drop trigger if exists record_saved_item on public.saved_items;
create trigger record_saved_item
after insert on public.saved_items
for each row execute function private.record_saved_item();

commit;
