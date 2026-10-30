import { describe, it, expect } from "vitest";
import {
  normalizeFoodEvent,
  detectLocationCategory,
  getLocalDateString,
  type DbFoodEvent,
} from "@/lib/food-events";

describe("Food Events Logic & Categorization", () => {
  it("correctly identifies BYU on-campus buildings", () => {
    expect(detectLocationCategory("TMCB 1170")).toBe("on_campus");
    expect(detectLocationCategory("Wilkinson Student Center")).toBe("on_campus");
    expect(detectLocationCategory("HBLL Library Quad")).toBe("on_campus");
    expect(detectLocationCategory("Crabtree Building")).toBe("on_campus");
  });

  it("correctly identifies off-campus Utah County locations", () => {
    expect(detectLocationCategory("Provo Town Square")).toBe("off_campus");
    expect(detectLocationCategory("University Mall Orem")).toBe("off_campus");
    expect(detectLocationCategory("Center Street Cafe")).toBe("off_campus");
  });

  it("normalizes a raw database event with correct date and time formatting", () => {
    const todayStr = getLocalDateString();
    const raw: DbFoodEvent = {
      id: "event-123",
      title: "Pizza with Professors",
      host: "BYU ACM",
      food: "Pepperoni & Cheese Pizza",
      event_date: todayStr,
      start_time: "12:30:00",
      end_time: "13:30:00",
      building: "TMCB",
      room: "Rm 1170",
      details: "Free slices while supplies last.",
    };

    const normalized = normalizeFoodEvent(raw);
    expect(normalized.id).toBe("event-123");
    expect(normalized.dayOffset).toBe(0);
    expect(normalized.isToday).toBe(true);
    expect(normalized.category).toBe("on_campus");
    expect(normalized.start).toBe("12:30 PM");
    expect(normalized.end).toBe("1:30 PM");
    expect(normalized.formattedTime).toBe("12:30 PM – 1:30 PM");
  });
});
