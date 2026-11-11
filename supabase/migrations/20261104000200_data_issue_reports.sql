create table if not exists public.data_issue_reports (
  id uuid primary key default gen_random_uuid(),
  item_type text not null check (item_type in ('deal', 'starving_student', 'event')),
  item_id text not null,
  item_label text not null,
  issue_type text not null,
  details text,
  page_url text,
  created_at timestamptz not null default now()
);

alter table public.data_issue_reports enable row level security;
grant insert on public.data_issue_reports to anon, authenticated;
drop policy if exists "public can submit data issues" on public.data_issue_reports;
create policy "public can submit data issues"
  on public.data_issue_reports for insert
  to anon, authenticated
  with check (char_length(item_label) <= 300 and char_length(coalesce(details, '')) <= 2000);

create index if not exists data_issue_reports_created_at_idx
  on public.data_issue_reports (created_at desc);
