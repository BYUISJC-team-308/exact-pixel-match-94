-- Review in the Supabase SQL Editor before applying.
-- Catalog content is imported separately and is never committed to this repository.
create table if not exists public.starving_student_offers (
  id text primary key,
  category text not null,
  company text not null,
  offer_text text not null,
  terms text,
  source_url text not null,
  captured_at date not null,
  locations jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists starving_student_offers_company_idx
  on public.starving_student_offers (company);

alter table public.starving_student_offers enable row level security;

-- Only signed-in users can view imported offers. Confirm redistribution rights
-- and your intended access model before importing catalog content.
create policy "Signed-in users can read card offers"
  on public.starving_student_offers for select to authenticated
  using (true);

grant select on public.starving_student_offers to authenticated;
