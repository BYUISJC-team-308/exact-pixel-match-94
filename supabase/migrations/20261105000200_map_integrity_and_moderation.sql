-- Data integrity and moderation support for the multi-campus vertical slice.
alter table public.data_issue_reports add column if not exists status text not null default 'open'
  check (status in ('open','reviewing','resolved','dismissed'));
alter table public.data_issue_reports add column if not exists resolution_notes text;
alter table public.data_issue_reports add column if not exists resolved_at timestamptz;

create or replace function public.validate_food_event_campus()
returns trigger language plpgsql set search_path=public as $$
declare building_campus uuid;
begin
  if new.building_id is not null then
    select campus_id into building_campus from public.campus_buildings where id=new.building_id and active=true;
    if building_campus is null then raise exception 'The selected building is unavailable.'; end if;
    if new.campus_id is null then new.campus_id := building_campus; end if;
    if new.campus_id <> building_campus then raise exception 'The selected building does not belong to this campus.'; end if;
  end if;
  if new.latitude is not null and (new.latitude < -90 or new.latitude > 90) then raise exception 'Invalid latitude.'; end if;
  if new.longitude is not null and (new.longitude < -180 or new.longitude > 180) then raise exception 'Invalid longitude.'; end if;
  return new;
end $$;

drop trigger if exists validate_food_event_campus on public.food_events;
create trigger validate_food_event_campus before insert or update of campus_id, building_id, latitude, longitude
on public.food_events for each row execute function public.validate_food_event_campus();

create or replace view public.map_admin_summary as
select c.slug, c.name,
 count(distinct b.id) filter (where b.active) as buildings,
 count(distinct b.id) filter (where b.active and b.latitude is not null and b.longitude is not null) as mapped_buildings,
 count(distinct e.id) as events,
 max(b.verified_at) as last_location_verification
from public.campuses c
left join public.campus_buildings b on b.campus_id=c.id
left join public.food_events e on e.campus_id=c.id
group by c.id, c.slug, c.name;

-- Deliberately no anon/authenticated grant: the summary and issue-review fields
-- are available to project administrators through Supabase/Table Editor only.
