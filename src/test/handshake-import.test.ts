import { handshakeEventUrl } from "@/lib/event-source";
import { expect, it } from "vitest";
import snapshot from "../../data/imports/handshake-byu-2026-11-12.json";
// @ts-expect-error standalone Node import tool has no browser TypeScript declaration
import { validateSnapshot, sourceUuid, toRow } from "../../scripts/import-handshake-food.mjs";

it("accepts the reviewed three-event snapshot with stable, distinct source IDs", () => {
  const events = validateSnapshot(snapshot);
  expect(events).toHaveLength(3);
  expect(new Set(events.map((e: { source_id: string }) => sourceUuid(e.source_id))).size).toBe(3);
  expect(sourceUuid("2050605")).toBe(sourceUuid("2050605"));
});
it("rejects missing food evidence and invalid timing before any writes", () => {
  expect(() =>
    validateSnapshot({
      ...snapshot,
      events: [{ ...snapshot.events[0], food_evidence: "Networking opportunity" }],
    }),
  ).toThrow("food evidence");
  expect(() =>
    validateSnapshot({ ...snapshot, events: [{ ...snapshot.events[0], end_time: "13:00:00" }] }),
  ).toThrow("times");
  expect(() =>
    validateSnapshot({ ...snapshot, events: [snapshot.events[0], snapshot.events[0]] }),
  ).toThrow("source ID");
});
it("preserves provenance and unknown requirements and requires a real building", () => {
  const e = snapshot.events[0];
  expect(() => toRow(e, null, snapshot.checked_at)).toThrow("building");
  const row = toRow(
    e,
    {
      id: "building-id",
      campus_id: "byu-id",
      code: "JKB",
      name: "Jesse Knight Building",
      latitude: 40,
      longitude: -111,
    },
    snapshot.checked_at,
  );
  expect(row.details).toContain(e.source_url);
  expect(row.food).toContain("menu not specified");
  expect(row.details).toContain("Whether registration is required");
  expect(row.building_id).toBe("building-id");
  expect(row.room).toBe("2107");
});

it("only links canonical BYU Handshake source URLs", () => {
  expect(
    handshakeEventUrl(
      "Summary\n\nSource: https://byu.joinhandshake.com/stu/events/2056333\nChecked today",
    ),
  ).toBe("https://byu.joinhandshake.com/stu/events/2056333");
  expect(
    handshakeEventUrl("Source: https://byu.joinhandshake.com.evil.test/stu/events/1"),
  ).toBeUndefined();
  expect(handshakeEventUrl("Source: javascript:alert(1)")).toBeUndefined();
  expect(
    handshakeEventUrl("Source: https://byu.joinhandshake.com/stu/events/1/other"),
  ).toBeUndefined();
});
