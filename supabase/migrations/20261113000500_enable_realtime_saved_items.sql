-- Migration: 20261113000400_enable_realtime_saved_items.sql
-- Enables Supabase Realtime publication on saved_deals and saved_events
-- so multiple devices receive live INSERT and DELETE events over WebSockets.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'saved_deals'
  ) then
    alter publication supabase_realtime add table public.saved_deals;
  end if;

  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'saved_events'
  ) then
    alter publication supabase_realtime add table public.saved_events;
  end if;
end $$;
