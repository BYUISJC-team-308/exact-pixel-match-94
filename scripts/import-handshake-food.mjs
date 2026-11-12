// Imports a reviewed browser snapshot, NOT a background Handshake login/scraper.
// Dry-run by default. Supply --apply only after checking the snapshot.
import fs from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

export function validateSnapshot(snapshot) {
  if (snapshot.timezone !== "America/Denver" || !/^\d{4}-\d{2}-\d{2}$/.test(snapshot.checked_at))
    throw new Error("Invalid snapshot date/timezone");
  const ids = new Set();
  for (const event of snapshot.events) {
    if (!/^\d+$/.test(event.source_id) || ids.has(event.source_id))
      throw new Error("Duplicate/invalid source ID");
    ids.add(event.source_id);
    if (event.source_url !== `https://byu.joinhandshake.com/stu/events/${event.source_id}`)
      throw new Error("Invalid source URL");
    for (const field of [
      "title",
      "host",
      "food",
      "food_evidence",
      "building_code",
      "room",
      "summary",
      "eligibility",
      "registration",
      "cost",
    ]) {
      if (typeof event[field] !== "string" || !event[field].trim())
        throw new Error(`Missing ${field}`);
    }
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(event.event_date) ||
      !Number.isFinite(Date.parse(`${event.event_date}T00:00:00Z`))
    )
      throw new Error("Invalid event date");
    if (
      ![event.start_time, event.end_time].every((t) =>
        /^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(t),
      ) ||
      event.end_time <= event.start_time
    )
      throw new Error("Invalid event times");
    if (
      !/\b(food|pizza|refreshments|snacks|lunch|dinner)\b.*\b(provided|served|included|free)\b/i.test(
        event.food_evidence,
      )
    )
      throw new Error("Missing explicit food evidence");
  }
  return snapshot.events;
}

export function sourceUuid(sourceId) {
  const hex = createHash("sha256").update(`byu-handshake-event:${sourceId}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function toRow(event, building, checkedAt) {
  if (!building?.id || !building.campus_id || building.code !== event.building_code)
    throw new Error(`Unresolved building ${event.building_code}`);
  return {
    id: sourceUuid(event.source_id),
    title: event.title,
    host: event.host,
    food: event.food,
    event_date: event.event_date,
    start_time: event.start_time,
    end_time: event.end_time,
    campus_id: building.campus_id,
    building_id: building.id,
    building: `${building.name} (${building.code})`,
    room: event.room,
    latitude: building.latitude,
    longitude: building.longitude,
    location_note: "Handshake organizer listing; building pin, not exact room",
    details: [
      event.summary,
      `Eligibility: ${event.eligibility}`,
      `Registration: ${event.registration}`,
      `Cost: ${event.cost}`,
      "Food serving time, quantities and dietary options are not stated.",
      `Source: ${event.source_url}`,
      `Checked ${checkedAt}. Times are America/Denver. Organizer statement: "${event.food_evidence}"`,
    ].join("\n\n"),
  };
}

async function main() {
  const file =
    process.argv.find((arg) => arg.endsWith(".json")) ||
    fileURLToPath(new URL("../data/imports/handshake-byu-2026-11-12.json", import.meta.url));
  const snapshot = JSON.parse(fs.readFileSync(file, "utf8"));
  const events = validateSnapshot(snapshot);
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key)
    throw new Error(
      "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or authorized service role key).",
    );
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
  async function request(path, options = {}) {
    const response = await fetch(`${url}/rest/v1/${path}`, {
      ...options,
      headers: { ...headers, ...options.headers },
    });
    const body = await response.text();
    if (!response.ok) throw new Error(`Supabase HTTP ${response.status}: ${body}`);
    return body ? JSON.parse(body) : [];
  }
  const campuses = await request("campuses?select=id,name&name=eq.BYU%20Provo");
  if (campuses.length !== 1) throw new Error("BYU campus is ambiguous/missing");
  const buildings = await request(
    `campus_buildings?select=id,campus_id,code,name,latitude,longitude&campus_id=eq.${campuses[0].id}`,
  );
  const existing = await request("food_events?select=id,title,event_date,details&limit=10000");
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Denver",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const rows = events
    .filter((e) => e.event_date >= today)
    .map((e) =>
      toRow(
        e,
        buildings.find((b) => b.code === e.building_code),
        snapshot.checked_at,
      ),
    );
  const pending = rows.filter(
    (row) =>
      !existing.some(
        (e) =>
          e.id === row.id ||
          e.details?.includes(row.details.match(/Source: (\S+)/)[1]) ||
          (norm(e.title) === norm(row.title) && e.event_date === row.event_date),
      ),
  );
  console.log(
    JSON.stringify(
      {
        mode: process.argv.includes("--apply") ? "apply" : "dry-run",
        reviewed: events.length,
        notPast: rows.length,
        duplicates: rows.length - pending.length,
        pending: pending.map((r) => ({ id: r.id, title: r.title, date: r.event_date })),
      },
      null,
      2,
    ),
  );
  if (process.argv.includes("--apply") && pending.length) {
    const inserted = await request("food_events?on_conflict=id&select=id,title,event_date", {
      method: "POST",
      headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
      body: JSON.stringify(pending),
    });
    console.log(JSON.stringify({ inserted }, null, 2));
  }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1])
  main().catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
