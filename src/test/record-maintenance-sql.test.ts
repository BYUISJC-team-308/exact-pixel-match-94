/* eslint-disable @typescript-eslint/no-explicit-any -- These fixtures model SDK query chains and generated router objects. */
// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, expect, test } from "vitest";
const db = new PGlite();
beforeAll(async () => {
  await db.exec(`create role anon;create role authenticated;create schema auth;
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.user',true),'')::uuid$$;
 create function public.current_user_is_admin() returns boolean language sql as $$select current_setting('request.admin',true)='true'$$;
 create type public.deal_category as enum('Food','Tech');
 create table public.deals(id uuid primary key default gen_random_uuid(),title text not null,category deal_category not null default 'Tech',description text,created_at timestamptz default now(),upvotes_count integer not null default 0);
 create table public.ss_deals(id uuid primary key default gen_random_uuid(),source_key text not null unique,item text not null);
 select set_config('request.user','00000000-0000-4000-8000-000000000001',false);select set_config('request.admin','true',false);`);
  await db.exec(
    readFileSync(
      new URL("../../supabase/migrations/20261117000200_record_maintenance.sql", import.meta.url),
      "utf8",
    ),
  );
}, 30000);
afterAll(() => db.close());
async function call(
  action: string,
  values: object = {},
  id: string | null = null,
  original: unknown = null,
  table = "deals",
) {
  return (
    await db.query<{ result: any }>(`select public.maintain_records($1,$2,$3,$4,$5) as result`, [
      table,
      action,
      id,
      JSON.stringify(values),
      original === null ? null : JSON.stringify(original),
    ])
  ).rows[0]!.result;
}
test("authenticated ordinary users and guests cannot read or mutate records", async () => {
  await db.exec("set role authenticated;select set_config('request.admin','false',false)");
  await expect(call("list")).rejects.toThrow("Administrator access required");
  await expect(call("create", { title: "No access" })).rejects.toThrow(
    "Administrator access required",
  );
  await db.exec("reset role;select set_config('request.admin','true',false)");
  await db.exec("set role anon");
  await expect(call("list")).rejects.toThrow("permission denied");
  await db.exec("reset role");
});
test("admin CRUD persists data, exposes actual schema and rejects concurrent overwrite", async () => {
  await db.exec("set role authenticated");
  const row = await call("create", { title: "Lunch", category: "Food" });
  expect(row.title).toBe("Lunch");
  expect(row.upvotes_count).toBe(0);
  const page = await call("list");
  expect(page.total).toBe(1);
  expect(page.fields.find((f: any) => f.name === "category").options).toEqual(["Food", "Tech"]);
  const updated = await call("update", { title: "Dinner" }, row.id, row);
  await expect(call("update", { title: "Stale" }, row.id, row)).rejects.toThrow(
    "This record changed",
  );
  await expect(call("delete", {}, row.id, row)).rejects.toThrow("This record changed");
  expect(updated.category).toBe("Food");
  await call("delete", {}, row.id, updated);
  expect((await call("list")).total).toBe(0);
  await db.exec("reset role");
});
test("arbitrary tables, fields, and managed counters cannot be changed", async () => {
  await expect(call("list", {}, null, null, "profiles")).rejects.toThrow("supported records table");
  await expect(call("list", {}, null, null, "deals;drop table deals")).rejects.toThrow(
    "supported records table",
  );
  await expect(call("create", { title: "Bad", upvotes_count: 999 })).rejects.toThrow(
    "managed by the system",
  );
  await expect(call("create", { title: "Bad", unknown: "bad" })).rejects.toThrow(
    "managed by the system",
  );
  await expect(call("create", { category: "Not an enum" })).rejects.toThrow();
  expect((await call("list")).total).toBe(0);
});
test("manual source keys are generated without blocking imported-table creation", async () => {
  const row = await call("create", { item: "A new card offer" }, null, null, "ss_deals");
  expect(row.source_key).toMatch(/^manual:/);
});
