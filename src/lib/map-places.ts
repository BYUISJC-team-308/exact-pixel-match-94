import type { SSDeal } from "@/lib/data";
import type { NormalizedFoodEvent } from "@/lib/food-events";

export type MapPlace = {
  id: string;
  kind: "card" | "event";
  title: string;
  subtitle: string;
  lat: number;
  lng: number;
  address: string;
  cardOffers: SSDeal[];
  events: NormalizedFoodEvent[];
};

// Building centers are from OpenStreetMap building records. A room is shown in
// event details, never represented as a precise indoor pin.
export const campusBuildings = [
  { code: "TNRB", name: "Tanner Building", lat: 40.2504141, lng: -111.6525193, aliases: ["tanner"] },
  { code: "TMCB", name: "Talmage Building", lat: 40.2495154, lng: -111.6507933, aliases: ["talmage"] },
  { code: "WSC", name: "Wilkinson Student Center", lat: 40.2485708, lng: -111.6473466, aliases: ["wilkinson"] },
  { code: "EB", name: "Engineering Building", lat: 40.2463429, lng: -111.6478803, aliases: ["engineering building"] },
  { code: "SFH", name: "Smith Fieldhouse", lat: 40.2474534, lng: -111.6543785, aliases: ["smith fieldhouse"] },
  { code: "HBLL", name: "Harold B. Lee Library", lat: 40.24917, lng: -111.64917, aliases: ["harold b. lee", "lee library"] },
] as const;

export function findCampusBuilding(input: string) {
  const text = input.toLowerCase();
  return campusBuildings.find((building) =>
    new RegExp(`(^|[^a-z])${building.code.toLowerCase()}([^a-z]|$)`).test(text) ||
    building.aliases.some((alias) => text.includes(alias)),
  );
}

export function cardPlaces(offers: SSDeal[]): MapPlace[] {
  const places = new Map<string, MapPlace>();
  for (const offer of offers) {
    for (const location of offer.locations) {
      if (!Number.isFinite(location.lat) || !Number.isFinite(location.lng)) continue;
      const key = `${location.lat.toFixed(5)},${location.lng.toFixed(5)}`;
      const existing = places.get(key);
      if (existing) {
        if (!existing.cardOffers.some((item) => item.id === offer.id)) existing.cardOffers.push(offer);
        if (existing.cardOffers.some((item) => item.company !== existing.cardOffers[0]?.company)) {
          existing.title = "Card offers at this location";
        }
      } else {
        places.set(key, {
          id: `card-${key}`,
          kind: "card",
          title: offer.company,
          subtitle: location.city || "Starving Student Card",
          lat: location.lat,
          lng: location.lng,
          address: location.address,
          cardOffers: [offer],
          events: [],
        });
      }
    }
  }
  return [...places.values()];
}

export function eventPlaces(events: NormalizedFoodEvent[]): MapPlace[] {
  const places = new Map<string, MapPlace>();
  for (const event of events) {
    const building = findCampusBuilding(event.building);
    if (!building) continue;
    const existing = places.get(building.code);
    if (existing) existing.events.push(event);
    else places.set(building.code, {
      id: `event-${building.code}`,
      kind: "event",
      title: building.name,
      subtitle: `${event.formattedDate} · ${event.formattedTime}`,
      lat: building.lat,
      lng: building.lng,
      address: `${building.name}, BYU, Provo, UT`,
      cardOffers: [],
      events: [event],
    });
  }
  return [...places.values()];
}
