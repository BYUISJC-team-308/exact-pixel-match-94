// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, expect, it } from "vitest";
const db = new PGlite();
const owner = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
beforeAll(async () => {
  await db.exec(`
    create role authenticated; create schema auth; create schema storage;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function storage.foldername(text) returns text[] language sql immutable as $$ select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1] $$;
    create function storage.extension(text) returns text language sql immutable as $$ select reverse(split_part(reverse($1),'.',1)) $$;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(bucket_id text,name text);
    alter table storage.objects enable row level security;
    grant usage on schema auth, storage to authenticated;
    grant select,insert,update,delete on storage.objects to authenticated;
  `);
  const migration = readFileSync(
    new URL("../../supabase/migrations/20261113000400_profile_avatar_storage.sql", import.meta.url),
    "utf8",
  );
  await db.exec(migration);
  await db.exec(migration); // deployment replays safely
  await db.exec(
    `insert into storage.objects values ('profile-avatars','${owner}/old.jpg'),('profile-avatars','${other}/private.jpg');`,
  );
}, 30_000);
afterAll(() => db.close());
it("configures a private bucket and enforces owner read/insert/delete with no overwrite", async () => {
  const bucket = await db.query(
    "select public,file_size_limit,allowed_mime_types from storage.buckets",
  );
  expect(bucket.rows[0]).toMatchObject({
    public: false,
    file_size_limit: 2097152,
    allowed_mime_types: ["image/jpeg", "image/png", "image/webp"],
  });
  await db.exec(
    `set role authenticated; select set_config('request.jwt.claim.sub','${owner}',false);`,
  );
  const visible = await db.query("select name from storage.objects");
  expect(visible.rows).toEqual([{ name: `${owner}/old.jpg` }]);
  await db.exec(`insert into storage.objects values ('profile-avatars','${owner}/new.webp')`);
  await expect(
    db.exec(`insert into storage.objects values ('profile-avatars','${other}/bad.png')`),
  ).rejects.toThrow(/row-level security/);
  await expect(
    db.exec(`insert into storage.objects values ('profile-avatars','${owner}/unsafe.svg')`),
  ).rejects.toThrow(/row-level security/);
  const changed = await db.query(
    `update storage.objects set name='${owner}/overwrite.jpg' where name='${owner}/old.jpg' returning name`,
  );
  expect(changed.rows).toHaveLength(0);
  expect(
    (await db.query(`delete from storage.objects where name='${other}/private.jpg' returning name`))
      .rows,
  ).toHaveLength(0);
  expect(
    (await db.query(`delete from storage.objects where name='${owner}/old.jpg' returning name`))
      .rows,
  ).toHaveLength(1);
  await db.exec("reset role");
});
