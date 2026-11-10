// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { TeamOkrSnapshot } from "@/lib/team-okr";

const db = new PGlite();
const id = (n: number) => "00000000-0000-4000-8000-" + String(n).padStart(12, "0");
const signup = "2026-11-01T12:00:00Z";
const asOf = "2026-11-10T12:00:00Z";
let eventId = 100;

async function event(
  user: number,
  type: string,
  at: string,
  metadata: Record<string, unknown> = {},
  device = "phone",
) {
  await db.query(
    "insert into public.user_activity_logs(id,user_id,device_id,event_type,created_at,metadata) values ($1,$2,$3,$4,$5,$6)",
    [id(++eventId), id(user), device, type, at, JSON.stringify(metadata)],
  );
}
async function snapshot() {
  const result = await db.query<{ snapshot: TeamOkrSnapshot }>(
    "select app_okr_private.snapshot($1,$2,$3)",
    ["2026-11-01T00:00:00Z", "2026-11-11T00:00:00Z", asOf],
  );
  return result.rows[0].snapshot;
}
beforeAll(async () => {
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create table auth.users(id uuid primary key, created_at timestamptz not null);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create table public.user_activity_logs(id uuid primary key, user_id uuid, device_id text, event_type text, metadata jsonb, created_at timestamptz);
  `);
  await db.exec(
    readFileSync(
      new URL("../../supabase/migrations/20261110000100_team_okr_dashboard.sql", import.meta.url),
      "utf8",
    ),
  );
}, 30_000);
beforeEach(async () => {
  await db.exec(
    "reset role; truncate public.team_analytics_members, public.user_activity_logs, auth.users cascade;",
  );
  eventId = 100;
  for (const n of [1, 2, 3, 4]) {
    const at = n === 4 ? "2026-11-09T12:00:00Z" : signup;
    await db.query("insert into auth.users values ($1,$2)", [id(n), at]);
    await event(n, "signup", at, { session_id: "initial-" + n });
  }
});
afterAll(async () => {
  await db.close();
});

describe("Authoritative SQL OKR calculations", () => {
  it("measures actual signup-to-save timing, distinct users, later sessions and mature seven-day cohorts", async () => {
    await event(1, "deal_saved", "2026-11-01T12:04:00Z", {
      session_id: "initial-1",
      outcome: "success",
    });
    await event(2, "deal_saved", "2026-11-01T12:08:00Z", {
      session_id: "initial-2",
      outcome: "success",
    });
    await event(4, "deal_saved", "2026-11-09T12:02:00Z", {
      session_id: "initial-4",
      outcome: "success",
    });
    await event(1, "session_start", "2026-11-02T12:00:00Z", { session_id: "later-1" }, "laptop");
    await event(
      1,
      "deal_saved",
      "2026-11-02T12:01:00Z",
      { session_id: "later-1", outcome: "success" },
      "laptop",
    );
    await event(1, "deal_redeemed", "2026-11-02T12:02:00Z", {
      session_id: "later-1",
      outcome: "success",
    });
    await event(2, "deal_redeemed", "2026-11-01T12:09:00Z", {
      session_id: "initial-2",
      outcome: "success",
    });
    await event(2, "return_visit", "2026-11-02T12:00:00Z");
    const result = await snapshot();
    expect(result.totalUsers).toBe(4);
    expect(result.firstSave).toMatchObject({
      meanMinutes: 4.7,
      medianMinutes: 4,
      sampleSize: 3,
      targetMinutes: null,
    });
    expect(result.noSaveUsers).toBe(1);
    expect(result.save).toMatchObject({ numerator: 3, denominator: 4, percent: 75 });
    expect(result.reportedUse).toMatchObject({ numerator: 1, denominator: 4, percent: 25 });
    expect(result.sevenDaySave).toMatchObject({ numerator: 1, denominator: 3, percent: 33.3 });
    expect(result.pendingUsers).toBe(1);
    expect(result.quality.complete).toBe(true);
  });

  it("excludes simulations, failed actions and retry duplicates without combining devices into users", async () => {
    await event(1, "deal_saved", "2026-11-01T12:04:00Z", {
      session_id: "initial-1",
      outcome: "success",
      request_id: "request-1",
    });
    await event(
      1,
      "deal_saved",
      "2026-11-01T12:04:01Z",
      { session_id: "initial-1", outcome: "success", request_id: "request-1" },
      "laptop",
    );
    await event(2, "deal_saved", "2026-11-01T12:01:00Z", {
      simUser: "fake",
      session_id: "initial-2",
      outcome: "success",
    });
    await event(3, "deal_saved", "2026-11-01T12:01:00Z", {
      session_id: "initial-3",
      outcome: "failure",
    });
    const result = await snapshot();
    expect(result.save.numerator).toBe(1);
    expect(result.firstSave.meanMinutes).toBe(4);
    expect(result.quality).toMatchObject({
      complete: true,
      excludedDuplicates: 1,
      excludedSimulations: 1,
    });
  });

  it("does not certify legacy or incomplete tracking as zero engagement", async () => {
    await event(1, "deal_saved", "2026-11-01T12:04:00Z");
    await event(2, "deal_saved", "2026-11-01T12:04:00Z", { outcome: "success" });
    const result = await snapshot();
    expect(result.quality).toMatchObject({
      complete: false,
      missingOutcomes: 1,
      missingActionSessions: 1,
    });
    expect(result.save.percent).toBeNull();
    expect(result.reportedUse.percent).toBeNull();
    expect(result.sevenDaySave.percent).toBeNull();
    expect(result.firstSave.meanMinutes).toBeNull();
    expect(result.noSaveUsers).toBeNull();
  });

  it("requires a recorded signup session and does not invent it from a device or username", async () => {
    await db.exec("delete from public.user_activity_logs");
    await event(1, "session_start", "2026-11-02T12:00:00Z", {
      username: "same-name",
      session_id: "unknown-first",
    });
    const result = await snapshot();
    expect(result.totalUsers).toBe(4);
    expect(result.quality.missingSignupSessions).toBe(4);
    expect(result.save.percent).toBeNull();
  });

  it("excludes a save at exactly 168 hours and actions before signup or before the later session starts", async () => {
    await event(1, "session_start", "2026-11-02T12:00:00Z", { session_id: "later-1" });
    await event(1, "deal_saved", "2026-11-01T11:00:00Z", {
      session_id: "initial-1",
      outcome: "success",
    });
    await event(1, "deal_saved", "2026-11-02T11:59:00Z", {
      session_id: "later-1",
      outcome: "success",
    });
    await event(1, "deal_saved", "2026-11-08T12:00:00Z", {
      session_id: "later-1",
      outcome: "success",
    });
    const result = await snapshot();
    expect(result.sevenDaySave.numerator).toBe(0);
    expect(result.save.numerator).toBe(1);
  });

  it("excludes team accounts and returns null rather than fabricating an empty-cohort percentage", async () => {
    for (const n of [1, 2, 3, 4])
      await db.query("insert into public.team_analytics_members(user_id) values ($1)", [id(n)]);
    const result = await snapshot();
    expect(result.totalUsers).toBe(0);
    expect(result.save).toMatchObject({ numerator: 0, denominator: 0, percent: null });
    expect(result.firstSave.meanMinutes).toBeNull();
  });

  it("does not truncate at 500 events", async () => {
    await db.query(
      `insert into public.user_activity_logs
      select gen_random_uuid(),$1,'phone','session_start','{}'::jsonb,'2026-11-02T12:00:00Z'::timestamptz
      from generate_series(1,510)`,
      [id(1)],
    );
    await event(1, "deal_saved", "2026-11-03T12:00:00Z", {
      session_id: "initial-1",
      outcome: "success",
    });
    expect((await snapshot()).save.numerator).toBe(1);
  });

  it("rejects public/raw access and allows only an approved account to read aggregate results", async () => {
    await db.query("insert into public.team_analytics_members(user_id) values ($1)", [id(1)]);
    const from = new Date(Date.now() - 86400000).toISOString(),
      to = new Date().toISOString();
    await db.exec("set role anon");
    await expect(db.query("select public.team_okr_snapshot($1,$2)", [from, to])).rejects.toThrow(
      /permission denied/,
    );
    await db.exec("reset role; set role authenticated");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id(2)]);
    await expect(db.query("select public.team_okr_snapshot($1,$2)", [from, to])).rejects.toThrow(
      /Team analytics access required/,
    );
    await expect(db.query("select * from public.team_analytics_members")).rejects.toThrow(
      /permission denied/,
    );
    await expect(
      db.query("select app_okr_private.snapshot($1,$2,now())", [from, to]),
    ).rejects.toThrow(/permission denied/);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id(1)]);
    const allowed = await db.query<{ team_okr_snapshot: TeamOkrSnapshot }>(
      "select public.team_okr_snapshot($1,$2)",
      [from, to],
    );
    expect(allowed.rows[0].team_okr_snapshot.version).toBe(1);
    expect(JSON.stringify(allowed.rows)).not.toContain("device_id");
    await expect(db.query("select public.team_okr_snapshot($1,$2)", [to, from])).rejects.toThrow(
      /valid signup period/,
    );
    await db.exec("reset role");
  });
});
