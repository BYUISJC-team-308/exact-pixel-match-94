import { describe, expect, it } from "vitest";
import { cardPlaces, eventPlaces, findCampusBuilding } from "@/lib/map-places";
import type { SSDeal } from "@/lib/data";
import type { NormalizedFoodEvent } from "@/lib/food-events";

describe("map locations", () => {
  it("groups offers at the same real location and skips missing coordinates", () => {
    const base = {
      company: "Example Cafe", item: "Free drink", type: "Free", value: "Free",
      category: "Freebies", address: "BYU", details: "", x: 0, y: 0,
      sourceUrl: "", capturedAt: "",
    } satisfies Omit<SSDeal, "id" | "locations">;
    const offers: SSDeal[] = [
      { ...base, id: "one", locations: [{ address: "BYU", city: "Provo", lat: 40.25, lng: -111.65 }] },
      { ...base, id: "two", locations: [{ address: "BYU", city: "Provo", lat: 40.25, lng: -111.65 }] },
      { ...base, id: "three", locations: [] },
    ];
    const places = cardPlaces(offers);
    expect(places).toHaveLength(1);
    expect(places[0]?.cardOffers.map((offer) => offer.id)).toEqual(["one", "two"]);
  });

  it("matches BYU abbreviations without inventing an unknown building pin", () => {
    expect(findCampusBuilding("TNRB (Tanner Building)")?.name).toBe("Tanner Building");
    expect(findCampusBuilding("Unknown Hall")).toBeUndefined();
    const event = { id: "one", building: "TNRB", title: "Pizza night" } as NormalizedFoodEvent;
    expect(eventPlaces([event])[0]?.title).toBe("Tanner Building");
    expect(eventPlaces([{ ...event, building: "Unknown Hall" }])).toHaveLength(0);
  });
});
