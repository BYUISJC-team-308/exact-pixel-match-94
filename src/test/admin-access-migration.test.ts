// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const db = new PGlite();
const adminId = "00000000-0000-4000-8000-000000000001";
const studentId = "00000000-0000-4000-8000-000000000002";
const dealId = "00000000-0000-4000-8000-000000000003";
const reportId = "00000000-0000-4000-8000-000000000004";

beforeAll(async () => {
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role;
    create schema auth;
    create table auth.users(
      id uuid primary key,
      created_at timestamptz not null default now(),
      raw_user_meta_data jsonb
    );
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    create function auth.role() returns text language sql stable as $$
      select nullif(current_setting('request.jwt.claim.role', true), '')
    $$;

    create table public.profiles(
      id uuid primary key references auth.users(id),
      username text,
      full_name text,
      email text,
      school text,
      phone text,
      avatar_url text,
      interests text[]
    );
    alter table public.profiles enable row level security;
    grant select, insert, update on public.profiles to authenticated;
    create policy "Users can read their profile"
      on public.profiles for select to authenticated using (id = auth.uid());
    create policy "Users can update their profile"
      on public.profiles for update to authenticated using (id = auth.uid())
      with check (id = auth.uid());

    create table public.user_activity_logs(
      id uuid primary key,
      user_id uuid,
      device_id text,
      event_type text,
      metadata jsonb,
      created_at timestamptz
    );

    create table public.data_issue_reports(
      id uuid primary key,
      item_type text not null,
      item_id text not null,
      item_label text not null,
      issue_type text not null,
      details text,
      page_url text,
      created_at timestamptz not null default now(),
      status text not null default 'open',
      resolution_notes text,
      resolved_at timestamptz
    );
    alter table public.data_issue_reports enable row level security;
    grant insert on public.data_issue_reports to anon, authenticated;
    create policy "public can submit data issues"
      on public.data_issue_reports for insert
      to anon, authenticated
      with check (char_length(item_label) <= 300 and char_length(coalesce(details, '')) <= 2000);

    create table public.deals(id uuid primary key);
    create table public.food_events(id uuid primary key);
    grant delete on public.deals, public.food_events to anon, authenticated;
    alter table public.deals enable row level security;
    alter table public.food_events enable row level security;
    create policy "Allow admins and users to delete deals"
      on public.deals for delete to anon, authenticated using (true);
    create policy "Allow admins and users to delete food_events"
      on public.food_events for delete to anon, authenticated using (true);
  `);
  await db.exec(
    readFileSync(
      new URL("../../supabase/migrations/20261110000100_team_okr_dashboard.sql", import.meta.url),
      "utf8",
    ),
  );
  await db.exec(
    readFileSync(
      new URL("../../supabase/migrations/20261115000200_admin_only_access.sql", import.meta.url),
      "utf8",
    ),
  );
}, 30_000);

beforeEach(async () => {
  await db.exec(
    "reset role; truncate public.team_analytics_members, public.data_issue_reports, public.deals, public.food_events, public.profiles, public.user_activity_logs, auth.users;",
  );
});

afterAll(async () => {
  await db.close();
});

describe("Admin-only Supabase access migration", () => {
  it("limits admin status, report access, and listing deletion to ADMIN profiles", async () => {
    await db.query("insert into auth.users(id) values ($1), ($2)", [adminId, studentId]);
    await db.query(
      "insert into public.profiles(id, username, school) values ($1, 'admin', 'BYU'), ($2, 'student', 'BYU')",
      [adminId, studentId],
    );
    await db.query("update public.profiles set role = 'ADMIN' where id = $1", [adminId]);
    await db.query("insert into public.team_analytics_members(user_id) values ($1)", [studentId]);
    const defaultRole = await db.query<{ role: string }>(
      "select role from public.profiles where id = $1",
      [studentId],
    );
    expect(defaultRole.rows[0]?.role).toBe("USER");
    await db.query(
      `insert into public.data_issue_reports(id,item_type,item_id,item_label,issue_type)
       values ($1,'deal',$2,'Test deal','Incorrect terms')`,
      [reportId, dealId],
    );
    await db.query("insert into public.deals(id) values ($1)", [dealId]);

    await db.exec("set role anon");
    await expect(db.query("select * from public.data_issue_reports")).rejects.toThrow(
      /permission denied/,
    );
    await expect(db.query("select public.current_user_is_admin()")).rejects.toThrow(
      /permission denied/,
    );
    await db.exec("reset role; set role authenticated");
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [studentId]);
    const nonAdminCheck = await db.query<{ current_user_is_admin: boolean }>(
      "select public.current_user_is_admin()",
    );
    expect(nonAdminCheck.rows[0]?.current_user_is_admin).toBe(false);
    expect((await db.query("select * from public.data_issue_reports")).rows).toHaveLength(0);
    await expect(
      db.query(
        "select public.team_okr_snapshot($1, $2)",
        ["2026-11-01T00:00:00Z", "2026-11-11T00:00:00Z"],
      ),
    ).rejects.toThrow(/Administrator access required/);
    await expect(
      db.query("update public.profiles set role = 'ADMIN' where id = $1", [studentId]),
    ).rejects.toThrow(/permission denied/);
    await expect(
      db.query(
        "insert into public.profiles(id, username, school, role) values ($1, 'student', 'BYU', 'ADMIN')",
        [studentId],
      ),
    ).rejects.toThrow(/permission denied/);
    await db.query("update public.profiles set username = 'updated' where id = $1", [studentId]);
    await expect(db.query("delete from public.deals where id = $1", [dealId])).rejects.toThrow(
      /permission denied/,
    );
    await expect(
      db.query(
        "select public.admin_delete_listing('deal', $1, $2)",
        [dealId, reportId],
      ),
    ).rejects.toThrow(/Administrator access required/);

    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [adminId]);
    const adminCheck = await db.query<{ current_user_is_admin: boolean }>(
      "select public.current_user_is_admin()",
    );
    expect(adminCheck.rows[0]?.current_user_is_admin).toBe(true);
    expect((await db.query("select * from public.data_issue_reports")).rows).toHaveLength(1);
    const snapshot = await db.query<{ team_okr_snapshot: { version: number } }>(
      "select public.team_okr_snapshot($1, $2)",
      ["2026-11-01T00:00:00Z", "2026-11-11T00:00:00Z"],
    );
    expect(snapshot.rows[0]?.team_okr_snapshot.version).toBe(1);
    await db.query(
      "select public.admin_delete_listing('deal', $1, $2)",
      [dealId, reportId],
    );
    await db.exec("reset role");
    expect((await db.query("select * from public.deals")).rows).toHaveLength(0);
    const report = await db.query<{ status: string }>(
      "select status from public.data_issue_reports where id = $1",
      [reportId],
    );
    expect(report.rows[0]?.status).toBe("resolved");
  });

  it("preserves public issue submissions without allowing public report reads", async () => {
    await db.exec("set role anon");
    await db.query(
      `insert into public.data_issue_reports(id,item_type,item_id,item_label,issue_type)
       values ($1,'deal','public-deal','Reported deal','Incorrect terms')`,
      ["00000000-0000-4000-8000-000000000005"],
    );
    await db.exec("reset role");
    expect((await db.query("select * from public.data_issue_reports")).rows).toHaveLength(1);
  });
});
