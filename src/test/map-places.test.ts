import { describe, expect, it } from "vitest";
import { buildingPlaces, campusBuildings, cardPlaces, discountPlaces, eventPlaces, findCampusBuilding } from "@/lib/map-places";
import type { Deal, SSDeal } from "@/lib/data";
import type { NormalizedFoodEvent } from "@/lib/food-events";
import type { CampusBuilding } from "@/lib/campus-buildings";

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

  it("shows the BYU building directory and attaches an event to its mapped building", () => {
    expect(campusBuildings.length).toBeGreaterThan(200);
    expect(findCampusBuilding("ARTS (Arts Building)")?.name).toBe("Arts Building");
    const event = { id: "sample", building: "JFSB (Joseph F. Smith Building)", title: "Sample pizza event" } as NormalizedFoodEvent;
    const places = buildingPlaces([event]);
    const venue = places.find((place) => place.code === "JFSB");
    expect(venue?.events.map((item) => item.id)).toEqual(["sample"]);
    expect(venue?.lat).toBeGreaterThan(40.24);
    expect(venue?.lng).toBeLessThan(-111.64);
    expect(places[0]).toBe(venue);
  });

  it("maps regular discounts only when they have usable coordinates", () => {
    const base = {
      title: "Student special", company: "Example Pizza", category: "Food",
      type: "Percent off", value: "20% off", description: "A discount",
      howTo: "Show student ID", duration: "Ongoing", url: "https://example.com",
    } satisfies Omit<Deal, "id">;
    const places = discountPlaces([
      { ...base, id: "mapped", address: "100 Center St", city: "Provo", latitude: 40.23, longitude: -111.66 },
      { ...base, id: "unmapped" },
    ]);
    expect(places).toHaveLength(1);
    expect(places[0]).toMatchObject({ kind: "discount", title: "Example Pizza", address: "100 Center St" });
    expect(places[0]?.deals[0]?.id).toBe("mapped");
  });

  it("maps an off-campus event from its saved address and coordinates", () => {
    const event = {
      id: "off-campus", building: "Downtown Provo", title: "Community dinner",
      address: "100 Center St, Provo, UT", latitude: 40.2338, longitude: -111.6585,
      formattedDate: "Tue, Nov 3", formattedTime: "7:00 PM – 8:00 PM",
    } as NormalizedFoodEvent;
    expect(eventPlaces([event])[0]).toMatchObject({
      kind: "event", title: "Downtown Provo", address: "100 Center St, Provo, UT",
      lat: 40.2338, lng: -111.6585,
    });
  });

  it("keeps unverified campus directory entries searchable without inventing map pins", () => {
    const buildings: CampusBuilding[] = [{ id: "uvu-cb", sourceKey: "uvu-cb", campusId: "uvu", code: "CB", name: "Clarke Building", officialName: "Clarke Building", aliases: ["clarke building"], address: "", use: "CAMPUS", lat: null, lng: null }];
    expect(findCampusBuilding("CB (Clarke Building)", buildings)?.id).toBe("uvu-cb");
    expect(buildingPlaces([], buildings)).toHaveLength(0);
    expect(eventPlaces([{ id: "uvu-event", buildingId: "uvu-cb", building: "CB" } as NormalizedFoodEvent], buildings)).toHaveLength(0);
  });
});
