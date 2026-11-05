-- Make the campus map reusable for BYU, UVU, and future schools.
create table if not exists public.colleges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  short_name text not null,
  website_url text,
  primary_color text not null default '#163f33',
  secondary_color text not null default '#f3efe5',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.campuses (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  slug text not null unique,
  name text not null,
  city text not null,
  state text not null default 'UT',
  latitude double precision not null,
  longitude double precision not null,
  default_zoom double precision not null default 15.3,
  map_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.colleges enable row level security;
alter table public.campuses enable row level security;
drop policy if exists "colleges are publicly readable" on public.colleges;
create policy "colleges are publicly readable" on public.colleges for select to anon, authenticated using (active = true);
drop policy if exists "campuses are publicly readable" on public.campuses;
create policy "campuses are publicly readable" on public.campuses for select to anon, authenticated using (active = true);
grant select on public.colleges, public.campuses to anon, authenticated;

insert into public.colleges (slug, name, short_name, website_url, primary_color, secondary_color)
values
  ('byu', 'Brigham Young University', 'BYU', 'https://www.byu.edu/', '#082e4f', '#f8f4e8'),
  ('uvu', 'Utah Valley University', 'UVU', 'https://www.uvu.edu/', '#275d38', '#ffffff')
on conflict (slug) do update set name=excluded.name, short_name=excluded.short_name, website_url=excluded.website_url,
  primary_color=excluded.primary_color, secondary_color=excluded.secondary_color, active=true;

insert into public.campuses (college_id, slug, name, city, latitude, longitude, default_zoom, map_url)
select id, 'byu-provo', 'BYU Provo', 'Provo', 40.2487, -111.6502, 15.3, 'https://map.byu.edu/' from public.colleges where slug='byu'
on conflict (slug) do update set latitude=excluded.latitude, longitude=excluded.longitude, default_zoom=excluded.default_zoom, active=true;
insert into public.campuses (college_id, slug, name, city, latitude, longitude, default_zoom, map_url)
select id, 'uvu-orem', 'UVU Main Campus', 'Orem', 40.2774, -111.7169, 15.2, 'https://www.uvu.edu/maps/map.html?id=382' from public.colleges where slug='uvu'
on conflict (slug) do update set latitude=excluded.latitude, longitude=excluded.longitude, default_zoom=excluded.default_zoom, active=true;

alter table public.campus_buildings add column if not exists campus_id uuid references public.campuses(id) on delete cascade;
alter table public.campus_buildings alter column latitude drop not null;
alter table public.campus_buildings alter column longitude drop not null;
update public.campus_buildings set campus_id=(select id from public.campuses where slug='byu-provo') where campus_id is null;
create index if not exists campus_buildings_campus_idx on public.campus_buildings(campus_id, active);

alter table public.food_events add column if not exists campus_id uuid references public.campuses(id) on delete set null;
update public.food_events set campus_id=(select id from public.campuses where slug='byu-provo') where building_id is not null and campus_id is null;
create index if not exists food_events_campus_idx on public.food_events(campus_id, event_date);

-- Official UVU Main Campus directory. Coordinates remain null until a verified
-- GIS export/API is available; the official Concept3D location API is private.
with uvu as (select id from public.campuses where slug='uvu-orem'), directory(code, name) as (
  values ('AX','Auxiliary Services'),('BA','Browning Administration'),('BR','Business Resource Center'),
  ('CB','Clarke Building'),('CS','Computer Science'),('DX','Digital Transformation'),
  ('EC','UCCU Event Center'),('EN','Environmental Technology'),('EE','Extended Education'),
  ('FC','Facilities Complex'),('FA','Faculty Annex'),('FG','Fugal Gateway'),('FL','Fulton Library'),
  ('GT','Gunther Technology'),('HF','Hall of Flags'),('HP','Health Professions'),('KB','Keller School of Business'),
  ('LA','Liberal Arts'),('LC','Losee Center'),('ME','McKay Education'),('NB','Nellesen Center for Autism'),
  ('NC','Noorda Center for the Performing Arts'),('BC','NUVI Basketball Center'),('PS','Pope Science'),
  ('RL','Rebecca Lockhart Arena'),('SB','Science Building'),('SC','Sorensen Center'),
  ('SA','Sparks Automotive'),('SL','Student Life and Wellness Center'),('WE','Wee Care Center'),
  ('WS','Wolverine Service Center'),('WB','Woodbury Business')
)
insert into public.campus_buildings(source_key, campus_id, code, name, official_name, aliases, building_use, latitude, longitude, source)
select 'uvu-orem-' || lower(code), uvu.id, code, name, name, array[lower(name)], 'CAMPUS', null, null, 'UVU official campus directory'
from directory cross join uvu
on conflict(source_key) do update set campus_id=excluded.campus_id, code=excluded.code, name=excluded.name,
  official_name=excluded.official_name, aliases=excluded.aliases, active=true, verified_at=now(), updated_at=now();

create or replace view public.campus_directory as
select b.*, c.slug as campus_slug, c.name as campus_name, c.latitude as campus_latitude,
  c.longitude as campus_longitude, college.short_name as college_short_name,
  college.primary_color, college.secondary_color
from public.campus_buildings b
join public.campuses c on c.id=b.campus_id
join public.colleges college on college.id=c.college_id
where b.active=true and c.active=true and college.active=true;
grant select on public.campus_directory to anon, authenticated;
