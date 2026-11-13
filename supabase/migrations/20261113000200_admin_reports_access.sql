-- Allow administrators to view and manage data issue reports directly on the website.
-- Grants select and update on data_issue_reports with RLS policies.

grant select, update on public.data_issue_reports to anon, authenticated;

-- RLS Select Policy: allow viewing reported data issues
drop policy if exists "allow read data_issue_reports" on public.data_issue_reports;
create policy "allow read data_issue_reports"
  on public.data_issue_reports for select
  to anon, authenticated
  using (true);

-- RLS Update Policy: allow updating report status (e.g. open -> reviewing -> resolved -> dismissed)
drop policy if exists "allow update data_issue_reports" on public.data_issue_reports;
create policy "allow update data_issue_reports"
  on public.data_issue_reports for update
  to anon, authenticated
  using (true)
  with check (status in ('open', 'reviewing', 'resolved', 'dismissed'));

-- Index for fast status filtering
create index if not exists data_issue_reports_status_idx
  on public.data_issue_reports (status, created_at desc);
