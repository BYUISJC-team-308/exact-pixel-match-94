import { describe, it, expect } from "vitest";
import {
  normalizeFoodEvent,
  detectLocationCategory,
  getLocalDateString,
  type DbFoodEvent,
} from "@/lib/food-events";
import { resolveBuilding, extractRoom } from "../../scripts/scrapers/byu-building-resolver.js";

describe("Food Events Logic & Categorization", () => {
  it("labels missing listing information instead of inventing a host, food, or campus location", () => {
    const event = normalizeFoodEvent({
      id: "missing-copy",
      title: "Student event",
      host: "",
      food: "",
      building: "",
      event_date: getLocalDateString(),
      start_time: "12:30:00",
      end_time: "13:30:00",
    });
    expect(event.host).toBe("Organizer not provided");
    expect(event.food).toBe("Food not specified");
    expect(event.building).toBe("Location not provided");
  });
  it("correctly identifies BYU on-campus buildings", () => {
    expect(detectLocationCategory("TMCB 1170")).toBe("on_campus");
    expect(detectLocationCategory("Wilkinson Student Center")).toBe("on_campus");
    expect(detectLocationCategory("HBLL Library Quad")).toBe("on_campus");
    expect(detectLocationCategory("Crabtree Building")).toBe("on_campus");
    expect(detectLocationCategory("ARTS (Arts Building)")).toBe("on_campus");
    expect(detectLocationCategory("JFSB (Joseph F. Smith Building)")).toBe("on_campus");
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

  it("resolves BYU campus buildings to accurate coordinates and codes", () => {
    const wsc = resolveBuilding("Wilkinson Student Center - Garden Court");
    expect(wsc.building_id).toBe("WSC");
    expect(wsc.latitude).toBeCloseTo(40.2485, 2);
    expect(wsc.longitude).toBeCloseTo(-111.6473, 2);

    const tmcb = resolveBuilding("TMCB 1170");
    expect(tmcb.building_id).toBe("TMCB");
    expect(tmcb.latitude).toBeCloseTo(40.2494, 2);
    expect(tmcb.room).toBe("1170");

    const jfsb = resolveBuilding("Education in Zion Gallery - JFSB");
    expect(jfsb.building_id).toBe("JFSB");
    expect(jfsb.room).toBe("Gallery");
  });

  it("extracts room names correctly from varied location formats", () => {
    expect(extractRoom("TMCB 1170")).toBe("1170");
    expect(extractRoom("Room 3380 WSC")).toBe("Room 3380");
    expect(extractRoom("Wilkinson Student Center - Varsity Theatre")).toBe("Varsity Theatre");
  });

  it("identifies community shared food events vs verified calendar events", () => {
    const communityEvent = normalizeFoodEvent({
      id: "comm-1",
      title: "Leftover Donuts",
      host: "Student Host",
      food: "Donuts",
      building: "TMCB",
      event_date: getLocalDateString(),
      start_time: "14:00:00",
      end_time: "15:00:00",
      location_note: "Community shared event",
    });
    expect(communityEvent.isCommunity).toBe(true);

    const verifiedEvent = normalizeFoodEvent({
      id: "verified-1",
      title: "CS Colloquium",
      host: "Computer Science Dept",
      food: "Catered Lunch",
      building: "TMCB",
      event_date: getLocalDateString(),
      start_time: "11:00:00",
      end_time: "12:00:00",
    });
    expect(verifiedEvent.isCommunity).toBe(false);
  });
});
