import type { Deal, SSDeal } from "@/lib/data";
import type { NormalizedFoodEvent } from "@/lib/food-events";
import buildingRecords from "@/lib/byu-buildings.json";

export type MapPlace = {
  id: string;
  kind: "card" | "event" | "discount" | "building";
  title: string;
  subtitle: string;
  lat: number;
  lng: number;
  address: string;
  cardOffers: SSDeal[];
  deals: Deal[];
  events: NormalizedFoodEvent[];
  code?: string;
};

// Centroids and names come from BYU's public Campus Buildings GIS layer.
// These identify buildings, not rooms or entrances.
export const campusBuildings = buildingRecords
  .filter((building) => Number.isFinite(building.lat) && Number.isFinite(building.lng))
  .map((building, index) => ({
    ...building,
    id: `${building.code.trim() || "building"}-${index}`,
    code: building.code.trim(),
    name: building.label?.trim() || building.name.trim(),
    aliases: [building.name.trim().toLowerCase(), building.label?.trim().toLowerCase()].filter(Boolean) as string[],
  }));

export function findCampusBuilding(input: string) {
  const text = input.trim().toLowerCase();
  if (!text) return undefined;
  return campusBuildings.find((building) =>
    (building.code && new RegExp(`(^|[^a-z0-9])${building.code.toLowerCase()}([^a-z0-9]|$)`).test(text)) ||
    building.aliases.some((alias) => text.includes(alias)),
  );
}

export function buildingPlaces(events: NormalizedFoodEvent[]): MapPlace[] {
  const byBuilding = new Map<string, NormalizedFoodEvent[]>();
  for (const event of events) {
    const building = findCampusBuilding(event.building);
    if (building) byBuilding.set(building.id, [...(byBuilding.get(building.id) ?? []), event]);
  }
  return campusBuildings.map((building) => ({
    id: `building-${building.id}`,
    kind: "building" as const,
    title: building.name,
    subtitle: building.code,
    code: building.code,
    lat: building.lat,
    lng: building.lng,
    address: `${building.name}, BYU, Provo, UT`,
    cardOffers: [],
    deals: [],
    events: byBuilding.get(building.id) ?? [],
  })).sort((a, b) => b.events.length - a.events.length || a.title.localeCompare(b.title));
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
          deals: [],
          events: [],
        });
      }
    }
  }
  return [...places.values()];
}

export function discountPlaces(discounts: Deal[]): MapPlace[] {
  return discounts.filter((deal) => Number.isFinite(deal.latitude) && Number.isFinite(deal.longitude)).map((deal) => ({
    id: `discount-${deal.id}`,
    kind: "discount" as const,
    title: deal.company,
    subtitle: deal.value,
    lat: deal.latitude as number,
    lng: deal.longitude as number,
    address: deal.address || [deal.city, "Utah"].filter(Boolean).join(", "),
    cardOffers: [],
    deals: [deal],
    events: [],
  }));
}

export function eventPlaces(events: NormalizedFoodEvent[]): MapPlace[] {
  const places = new Map<string, MapPlace>();
  for (const event of events) {
    const building = findCampusBuilding(event.building);
    const lat = building?.lat ?? event.latitude;
    const lng = building?.lng ?? event.longitude;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const key = building?.code || `${Number(lat).toFixed(5)},${Number(lng).toFixed(5)}`;
    const existing = places.get(key);
    if (existing) existing.events.push(event);
    else places.set(key, {
      id: `event-${key}`,
      kind: "event",
      title: building?.name || event.building,
      subtitle: `${event.formattedDate} · ${event.formattedTime}`,
      lat: Number(lat),
      lng: Number(lng),
      address: event.address || (building ? `${building.name}, BYU, Provo, UT` : event.building),
      cardOffers: [],
      deals: [],
      events: [event],
    });
  }
  return [...places.values()];
}
