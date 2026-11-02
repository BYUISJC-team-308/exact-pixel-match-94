-- Extend the team's existing ss_deals table for the verified catalog.
-- Preserve UUID IDs so used_ss_deals foreign keys continue to work.
alter type public.ss_deal_category add value if not exists 'Freebies';
alter type public.ss_deal_category add value if not exists 'Treats & Drinks';
alter type public.ss_deal_category add value if not exists 'Burgers & Sandwiches';
alter type public.ss_deal_category add value if not exists 'Pizza';
alter type public.ss_deal_category add value if not exists 'Restaurants';
alter type public.ss_deal_category add value if not exists 'Retail, Auto, & More';
alter type public.ss_deal_category add value if not exists 'Health & Beauty';

alter table public.ss_deals add column if not exists source_key text;
alter table public.ss_deals add column if not exists source_url text;
alter table public.ss_deals add column if not exists captured_at date;
alter table public.ss_deals add column if not exists locations jsonb not null default '[]'::jsonb;
create unique index if not exists ss_deals_source_key_idx on public.ss_deals (source_key);
