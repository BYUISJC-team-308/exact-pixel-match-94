import { describe, it, expect } from "vitest";
import { getGoogleCalendarUrl, type CalendarEventItem } from "@/lib/calendar-sync";
import { getRecurringSpecialsForDate, RECURRING_SPECIALS } from "@/lib/calendar-deals";

describe("Calendar Sync & URL Generator", () => {
  it("generates a valid Google Calendar web intent URL with prefilled parameters", () => {
    const item: CalendarEventItem = {
      id: "test-cal-1",
      title: "BYU Free Pizza Social",
      details: "Free slices in TMCB",
      building: "TMCB",
      room: "Rm 1170",
      startDate: new Date(2026, 9, 30), // Oct 30, 2026
      startTime: "12:00 PM",
      endTime: "1:30 PM",
    };

    const url = getGoogleCalendarUrl(item);
    expect(url).toContain("https://calendar.google.com/calendar/render?action=TEMPLATE");
    expect(url).toContain(encodeURIComponent("BYU Free Pizza Social"));
    expect(url).toContain(encodeURIComponent("TMCB, Rm 1170"));
    expect(url).toContain("dates=");
  });

  it("filters recurring restaurant specials for specific days of the week", () => {
    // 2026-10-27 is a Tuesday (getDay() === 2)
    const tuesday = new Date(2026, 9, 27);
    const tuesdaySpecials = getRecurringSpecialsForDate(tuesday);
    expect(tuesdaySpecials.some((s) => s.category === "tacos")).toBe(true);
    expect(tuesdaySpecials.some((s) => s.title.includes("Taco Tuesday"))).toBe(true);

    // 2026-10-28 is a Wednesday (getDay() === 3)
    const wednesday = new Date(2026, 9, 28);
    const wednesdaySpecials = getRecurringSpecialsForDate(wednesday);
    expect(wednesdaySpecials.some((s) => s.category === "wings")).toBe(true);
    expect(wednesdaySpecials.some((s) => s.title.includes("Wing Wednesday"))).toBe(true);
  });
});
