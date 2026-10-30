import { describe, it, expect } from "vitest";
import { getGoogleCalendarUrl, type CalendarEventItem } from "@/lib/calendar-sync";
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
