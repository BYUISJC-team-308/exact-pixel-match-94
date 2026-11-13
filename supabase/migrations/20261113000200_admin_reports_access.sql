-- Allow administrators to view and manage data issue reports directly on the website.
-- Grants select, update, and delete with RLS policies.

grant select, update, delete on public.data_issue_reports to anon, authenticated;

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

-- Allow admins to delete data issue reports
drop policy if exists "allow delete data_issue_reports" on public.data_issue_reports;
create policy "allow delete data_issue_reports"
  on public.data_issue_reports for delete
  to anon, authenticated
  using (true);

-- Allow administrators to delete community deals and dead offers
grant delete on public.deals to anon, authenticated;
drop policy if exists "Allow admins and users to delete deals" on public.deals;
create policy "Allow admins and users to delete deals"
  on public.deals for delete
  to anon, authenticated
  using (true);

-- Allow administrators to delete community food events
grant delete on public.food_events to anon, authenticated;
drop policy if exists "Allow admins and users to delete food_events" on public.food_events;
create policy "Allow admins and users to delete food_events"
  on public.food_events for delete
  to anon, authenticated
  using (true);

-- Atomic Administrator Deletion Function (Bypasses RLS with elevated security definer)
create or replace function public.admin_delete_listing(
  p_item_type text,
  p_item_id uuid,
  p_report_id uuid default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_item_type = 'deal' then
    delete from public.deals where id = p_item_id;
  elsif p_item_type = 'event' then
    delete from public.food_events where id = p_item_id;
  end if;

  if p_report_id is not null then
    update public.data_issue_reports
    set status = 'resolved',
        resolution_notes = coalesce(resolution_notes, 'Listing permanently deleted by administrator.'),
        resolved_at = timezone('utc'::text, now())
    where id = p_report_id;
  else
    -- Also auto-resolve any open reports for this item
    update public.data_issue_reports
    set status = 'resolved',
        resolution_notes = 'Listing permanently deleted by administrator.',
        resolved_at = timezone('utc'::text, now())
    where item_id = p_item_id::text
      and status in ('open', 'reviewing');
  end if;
end;
$$;

grant execute on function public.admin_delete_listing to anon, authenticated, service_role;

-- Index for fast status filtering
create index if not exists data_issue_reports_status_idx
  on public.data_issue_reports (status, created_at desc);
