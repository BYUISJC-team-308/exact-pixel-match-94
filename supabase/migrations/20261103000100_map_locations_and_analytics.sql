-- Map-ready locations for regular discounts and off-campus food events.
alter table public.deals add column if not exists address text;
alter table public.deals add column if not exists city text;
alter table public.deals add column if not exists latitude double precision;
alter table public.deals add column if not exists longitude double precision;

alter table public.food_events add column if not exists address text;
alter table public.food_events add column if not exists latitude double precision;
alter table public.food_events add column if not exists longitude double precision;
alter table public.food_events add column if not exists location_note text;

create index if not exists deals_map_coordinates_idx
  on public.deals (latitude, longitude)
  where latitude is not null and longitude is not null;

create index if not exists food_events_map_coordinates_idx
  on public.food_events (latitude, longitude)
  where latitude is not null and longitude is not null;

-- Allow the browser analytics logger to record non-sensitive product events.
alter table public.user_activity_logs enable row level security;
drop policy if exists "public can insert activity events" on public.user_activity_logs;
create policy "public can insert activity events"
  on public.user_activity_logs for insert
  to anon, authenticated
  with check (event_type in (
    'session_start', 'signup', 'deal_saved', 'deal_redeemed', 'event_saved', 'return_visit',
    'map_opened', 'map_location_enabled', 'map_pin_selected', 'map_offer_viewed', 'map_directions_opened'
  ));
