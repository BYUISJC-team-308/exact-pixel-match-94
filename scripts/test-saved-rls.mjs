import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://zwygwfcaollyotvfwumx.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3eWd3ZmNhb2xseW90dmZ3dW14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2NzcxMjcsImV4cCI6MjEwNzI1MzEyN30.h2BtQWvBJY103qKlxQwuKvhnjdzB_0b_CJD0ULvf0Cg";

const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verifySavedRls() {
  console.log("\n================ SUPABASE SAVED TABLES & RLS VERIFICATION ================\n");

  let passes = 0;
  let total = 0;

  function assert(condition, description) {
    total++;
    if (condition) {
      console.log(`  ✓ PASS: ${description}`);
      passes++;
    } else {
      console.error(`  ✗ FAIL: ${description}`);
    }
  }

  // 1. Check Table Existence
  const { data: dealsCheck, error: dealsErr } = await client
    .from("saved_deals")
    .select("user_id, deal_id")
    .limit(1);
  assert(!dealsErr, "saved_deals table is reachable via PostgREST API");

  const { data: eventsCheck, error: eventsErr } = await client
    .from("saved_events")
    .select("user_id, event_id")
    .limit(1);
  assert(!eventsErr, "saved_events table is reachable via PostgREST API");

  // 2. Verify Anon Insertion Blocked (RLS Enforcement)
  const dummyUser = "00000000-0000-0000-0000-000000000000";
  const dummyDeal = "b67cbe4f-ae16-4cc4-8bde-3ce806ab4965";
  const dummyEvent = "7ed14a29-298e-4244-8672-dfca29b90a24";

  const { error: anonDealInsertErr } = await client
    .from("saved_deals")
    .insert([{ user_id: dummyUser, deal_id: dummyDeal }]);
  assert(
    anonDealInsertErr && anonDealInsertErr.code === "42501",
    "RLS correctly blocks unauthenticated / unauthorized insert into saved_deals (Error 42501)"
  );

  const { error: anonEventInsertErr } = await client
    .from("saved_events")
    .insert([{ user_id: dummyUser, event_id: dummyEvent }]);
  assert(
    anonEventInsertErr && anonEventInsertErr.code === "42501",
    "RLS correctly blocks unauthenticated / unauthorized insert into saved_events (Error 42501)"
  );

  // 3. Verify Foreign Key UUID Schema Integrity
  const { error: badDealUuidErr } = await client
    .from("saved_deals")
    .select("*")
    .eq("deal_id", "malformed-not-uuid");
  assert(
    badDealUuidErr && badDealUuidErr.code === "22P02",
    "Postgres UUID type enforcement active on saved_deals.deal_id (Error 22P02 on bad format)"
  );

  const { error: badEventUuidErr } = await client
    .from("saved_events")
    .select("*")
    .eq("event_id", "malformed-not-uuid");
  assert(
    badEventUuidErr && badEventUuidErr.code === "22P02",
    "Postgres UUID type enforcement active on saved_events.event_id (Error 22P02 on bad format)"
  );

  // 4. Verify admin_delete_listing RPC is accessible and callable
  const { error: rpcErr } = await client.rpc("admin_delete_listing", {
    p_item_type: "deal",
    p_item_id: "test-non-existent-uuid-probe",
    p_report_id: null,
  });
  assert(
    !rpcErr,
    "admin_delete_listing RPC executes safely with text input without throwing 22P02 error"
  );

  console.log(`\nVerification Complete: ${passes}/${total} checks passed.\n`);
  console.log("==========================================================================\n");

  if (passes !== total) {
    process.exit(1);
  }
}

verifySavedRls().catch((err) => {
  console.error("Verification failed with exception:", err);
  process.exit(1);
});
