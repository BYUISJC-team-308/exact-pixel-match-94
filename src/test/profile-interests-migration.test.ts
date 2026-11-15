// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, expect, it } from "vitest";

const db = new PGlite();
const migration = readFileSync(
  new URL("../../supabase/migrations/20261115000100_profile_interests.sql", import.meta.url),
  "utf8",
);

beforeAll(async () => {
  await db.exec("create table public.profiles (id uuid primary key)");
  await db.exec(migration);
  await db.exec(migration);
  await db.exec("insert into public.profiles (id) values ('00000000-0000-4000-8000-000000000001')");
});

afterAll(() => db.close());

it("adds an idempotent empty interests array for existing profiles", async () => {
  const result = await db.query("select interests from public.profiles");
  expect(result.rows).toEqual([{ interests: [] }]);
});
