// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, expect, test } from "vitest";
const db = new PGlite();
const migration = readFileSync(
  new URL("../../supabase/migrations/20261117000100_catalog_review.sql", import.meta.url),
  "utf8",
).split("-- Previously researched offers.")[0];
beforeAll(async () => {
  await db.exec(`
 create role anon; create role authenticated;
 create schema auth; create schema app_admin_private;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 create function public.current_user_is_admin() returns boolean language sql stable as $$ select current_setting('request.admin',true)='true' $$;
 create type public.deal_category as enum ('Food','Tech','Apparel','Subscription','Fitness','Travel','Groceries','AI','Print');
 create type public.deal_type as enum ('Free','Percent off','Fixed price');
 create table public.deals(id uuid primary key default gen_random_uuid(),company text,title text,category deal_category,deal_type deal_type,value text,description text,how_to_redeem text,url text,expires_at timestamptz,is_new boolean,verification_status text,updated_at timestamptz,upvotes_count integer default 0);
 insert into auth.users values('00000000-0000-4000-8000-000000000001');
 select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
 `);
  await db.exec(migration);
}, 30000);
afterAll(() => db.close());

test("ordinary users cannot read reviews or publish, while admins can read reviews", async () => {
  await db.exec("set role authenticated; select set_config('request.admin','false',false);");
  expect((await db.query("select * from public.catalog_sources")).rows).toHaveLength(0);
  await expect(
    db.query("select public.publish_catalog_offer(gen_random_uuid(),now())"),
  ).rejects.toThrow("Administrator access required");
  await db.exec("select set_config('request.admin','true',false);");
  expect((await db.query("select * from public.catalog_sources")).rows).toHaveLength(4);
  await db.exec("reset role");
});

test("publication is atomic, preserves a matched deal and rejects a stale retry", async () => {
  await db.exec("select set_config('request.admin','true',false);");
  const deal = (
    await db.query<{ id: string }>(
      "insert into public.deals(company,title,url,upvotes_count) values ('Example','Student offer','https://example.com/student',7) returning id",
    )
  ).rows[0];
  const review = (
    await db.query<{
      id: string;
      updated_at: string;
    }>(`insert into public.catalog_reviews(source,source_url,company,title,merchant_url,value,category,deal_type,description,eligibility,how_to_redeem,checked_on,status)
 values('SheerID','https://source.example/offer','Example','Student offer','https://example.com/student','20% off','Tech','Percent off','Student pricing','Current students','Verify with merchant',current_date,'ready') returning id,updated_at`)
  ).rows[0];
  const published = await db.query<{ id: string }>(
    "select public.publish_catalog_offer($1,$2) as id",
    [review.id, review.updated_at],
  );
  expect(published.rows[0].id).toBe(deal.id);
  expect(
    (await db.query("select value,upvotes_count from public.deals where id=$1", [deal.id])).rows[0],
  ).toEqual({ value: "20% off", upvotes_count: 7 });
  expect(
    (await db.query("select status,deal_id from public.catalog_reviews where id=$1", [review.id]))
      .rows[0],
  ).toEqual({ status: "published", deal_id: deal.id });
  await expect(
    db.query("select public.publish_catalog_offer($1,$2)", [review.id, review.updated_at]),
  ).rejects.toThrow("This review changed");
  expect((await db.query("select * from public.deals where company='Example'")).rows).toHaveLength(
    1,
  );
});

test("review decisions require evidence and covered listings require a link", async () => {
  await expect(
    db.query(
      `insert into public.catalog_reviews(source,source_url,company,title,status) values('ID.me','https://source.example/other','Other','Offer','ready')`,
    ),
  ).rejects.toThrow("Check the merchant terms");
  await expect(
    db.query(
      `insert into public.catalog_reviews(source,source_url,company,title,status) values('ID.me','https://source.example/other','Other','Offer','already_covered')`,
    ),
  ).rejects.toThrow("Link a dashboard listing");
  await expect(
    db.query(
      `insert into public.catalog_reviews(source,source_url,company,title,status) values('ID.me','https://source.example/other','Other','Offer','excluded')`,
    ),
  ).rejects.toThrow("Record why");
});

test("deleting a linked listing reopens review rather than losing coverage silently", async () => {
  const row = (
    await db.query<{ id: string; deal_id: string }>(
      "select id,deal_id from public.catalog_reviews where company='Example'",
    )
  ).rows[0];
  await db.query("delete from public.deals where id=$1", [row.deal_id]);
  expect(
    (await db.query("select status,deal_id from public.catalog_reviews where id=$1", [row.id]))
      .rows[0],
  ).toEqual({ status: "needs_review", deal_id: null });
});

test("seed loads all 80 candidates even if an earlier published listing was deleted", async () => {
  const seed = readFileSync(
    new URL("../../supabase/migrations/20261117000100_catalog_review.sql", import.meta.url),
    "utf8",
  ).split("-- Previously researched offers.")[1];
  await db.exec("-- Previously researched offers." + seed);
  expect(
    (await db.query("select * from public.catalog_reviews where company<>'Example'")).rows,
  ).toHaveLength(80);
  expect(
    (await db.query("select * from public.catalog_reviews where status='published'")).rows,
  ).toHaveLength(0);
});
