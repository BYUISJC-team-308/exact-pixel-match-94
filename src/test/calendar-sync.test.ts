import { describe, it, expect } from "vitest";
import {
  buildCalendarFile,
  getGoogleCalendarUrl,
  type CalendarEventItem,
} from "@/lib/calendar-sync";
import { getRecurringSpecialsForDate } from "@/lib/calendar-deals";

describe("Calendar Sync & URL Generator", () => {
  it("generates a valid Google Calendar web intent URL with prefilled parameters", () => {
    const item: CalendarEventItem = {
      id: "test-cal-1",
      title: "BYU Free Pizza Social",
      details: "Free slices in TMCB",
      building: "TMCB",
      room: "Rm 1170",
      startDate: new Date(2026, 9, 30),
      startTime: "12:00 PM",
      endTime: "1:30 PM",
    };

    const url = getGoogleCalendarUrl(item);
    expect(url).toContain("https://calendar.google.com/calendar/render?action=TEMPLATE");
    expect(url).toContain(encodeURIComponent("BYU Free Pizza Social"));
    expect(url).toContain(encodeURIComponent("TMCB, Rm 1170"));
    expect(url).toContain("dates=");
  });

  it("handles empty recurring specials cleanly when mock data is purged", () => {
    const tuesday = new Date(2026, 9, 27);
    const specials = getRecurringSpecialsForDate(tuesday);
    expect(Array.isArray(specials)).toBe(true);
    expect(specials.length).toBe(0);
  });
});

it.each([
  [new Date(2026, 10, 11), "6:00 PM", "7:30 PM", "20261112T010000Z", "20261112T023000Z"],
  [new Date(2026, 6, 11), "18:00", "19:30", "20260712T000000Z", "20260712T013000Z"],
  [new Date(2026, 2, 8), "2:30 AM", "4:00 AM", "20260308T093000Z", "20260308T100000Z"],
  [new Date(2026, 10, 1), "1:30 AM", "2:30 AM", "20261101T073000Z", "20261101T093000Z"],
  [new Date(2026, 10, 11), "5:30 PM", "1:00 PM", "20261112T003000Z", "20261112T013000Z"],
])(
  "exports a Utah event on %s with matching Google and ICS times",
  (startDate, startTime, endTime, start, end) => {
    const item = { id: "utah-event", title: "Food, Music", startDate, startTime, endTime };
    expect(new URL(getGoogleCalendarUrl(item)).searchParams.get("dates")).toBe(`${start}/${end}`);
    const ics = buildCalendarFile(item);
    expect(ics).toContain(`DTSTART:${start}\r\nDTEND:${end}`);
    expect(ics).toContain("SUMMARY:Food\\, Music");
  },
);
