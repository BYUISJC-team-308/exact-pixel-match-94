import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://zwygwfcaollyotvfwumx.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3eWd3ZmNhb2xseW90dmZ3dW14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2NzcxMjcsImV4cCI6MjEwNzI1MzEyN30.h2BtQWvBJY103qKlxQwuKvhnjdzB_0b_CJD0ULvf0Cg";

const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkDatabase() {
  console.log("\n================ SUPABASE LIVE DATABASE SNAPSHOT ================\n");

  // 1. Community Deals
  const { data: communityDeals, error: dealsErr } = await client
    .from("deals")
    .select("id, title, company, upvotes_count, real_votes_count, fake_votes_count, created_at")
    .eq("verification_status", "community")
    .order("created_at", { ascending: false })
    .limit(5);

  if (dealsErr) {
    console.error("Error fetching deals:", dealsErr.message);
  } else {
    console.log(`📌 Latest Community Deals in 'deals' table (${communityDeals.length} shown):`);
    console.table(
      communityDeals.map((d) => ({
        Company: d.company,
        Title: d.title.length > 30 ? d.title.slice(0, 27) + "..." : d.title,
        "▲ Upvotes": d.upvotes_count,
        "👍 Real": d.real_votes_count,
        "👎 Fake": d.fake_votes_count,
        "Deal ID": d.id.slice(0, 8) + "...",
      }))
    );
  }

  // 2. Deal Votes
  const { data: votes, error: votesErr, count: totalVotes } = await client
    .from("deal_votes")
    .select("deal_id, user_id, vote_type, updated_at", { count: "exact" })
    .order("updated_at", { ascending: false })
    .limit(5);

  console.log(`\n🗳️ Total Rows in 'deal_votes': ${totalVotes ?? 0}`);
  if (votes && votes.length > 0) {
    console.table(
      votes.map((v) => ({
        "Vote Type": v.vote_type === "real" ? "👍 Real" : "👎 Fake",
        "Deal ID": v.deal_id.slice(0, 8) + "...",
        "User ID": v.user_id.slice(0, 8) + "...",
        "Updated At": v.updated_at,
      }))
    );
  } else {
    console.log("   (No votes cast yet. Sign in and vote on a deal to see rows appear here!)");
  }

  // 3. Deal Upvotes
  const { data: upvotes, error: upvotesErr, count: totalUpvotes } = await client
    .from("deal_upvotes")
    .select("deal_id, user_id, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(5);

  console.log(`\n▲ Total Rows in 'deal_upvotes': ${totalUpvotes ?? 0}`);
  if (upvotes && upvotes.length > 0) {
    console.table(
      upvotes.map((u) => ({
        "Deal ID": u.deal_id.slice(0, 8) + "...",
        "User ID": u.user_id.slice(0, 8) + "...",
        "Created At": u.created_at,
      }))
    );
  } else {
    console.log("   (No upvotes yet. Sign in and click ▲ on any deal to see rows appear here!)");
  }

  // 4. Free Food Events
  const { data: foodEvents, error: foodErr } = await client
    .from("food_events")
    .select("id, title, host, food, building, location_note")
    .order("event_date", { ascending: false })
    .limit(5);

  if (foodErr) {
    console.error("Error fetching food events:", foodErr.message);
  } else {
    console.log(`\n🍕 Latest Free Food Events in 'food_events' (${foodEvents.length} shown):`);
    console.table(
      foodEvents.map((f) => ({
        Title: f.title.length > 25 ? f.title.slice(0, 22) + "..." : f.title,
        Food: f.food,
        Host: f.host,
        Building: f.building,
        Type: f.location_note?.toLowerCase().includes("community") ? "👥 Community" : "✓ Verified",
        "Event ID": f.id.slice(0, 8) + "...",
      }))
    );
  }

  // 5. Food Event Votes & Upvotes
  const { count: foodVotes } = await client
    .from("food_event_votes")
    .select("id", { count: "exact", head: true });
  console.log(`\n🗳️ Total Rows in 'food_event_votes': ${foodVotes ?? 0}`);

  const { count: foodUpvotes } = await client
    .from("food_event_upvotes")
    .select("id", { count: "exact", head: true });
  console.log(`▲ Total Rows in 'food_event_upvotes': ${foodUpvotes ?? 0}`);

  // 6. Data Issue Reports
  const { data: reports, count: issueCount, error: reportsErr } = await client
    .from("data_issue_reports")
    .select("id, item_type, item_label, issue_type, status, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(5);

  console.log(`\n📝 Total Rows in 'data_issue_reports': ${issueCount ?? 0}`);
  if (reports && reports.length > 0) {
    console.table(
      reports.map((r) => ({
        Type: r.item_type,
        Item: r.item_label.length > 25 ? r.item_label.slice(0, 22) + "..." : r.item_label,
        Issue: r.issue_type,
        Status: r.status,
        Reported: r.created_at,
      }))
    );
  } else {
    console.log("   (No reports found or RLS policy pending. Apply migration 20261113000200_admin_reports_access.sql in Supabase)");
  }

  console.log("\n=================================================================\n");
}

checkDatabase().catch(console.error);
