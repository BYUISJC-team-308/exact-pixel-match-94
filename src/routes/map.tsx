import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BadgePercent, CalendarDays, ChevronLeft, ChevronRight, Clock3, CreditCard, Search, Utensils } from "lucide-react";
import { MapCanvas } from "@/components/MapCanvas";
import { DealDetail, EventDetail, PageHeader, SSDetail } from "@/components/ui-bits";
import type { Deal, SSDeal } from "@/lib/data";
import { getMapDeals, normalizeDeal } from "@/lib/deals";
import { logActivityEvent } from "@/lib/analytics";
import { getMapFoodEvents, normalizeFoodEvent, type NormalizedFoodEvent } from "@/lib/food-events";
import { buildingPlaces, cardPlaces, discountPlaces, eventPlaces, type MapPlace } from "@/lib/map-places";
import { getStarvingStudentOffers } from "@/lib/starving-student";
import { getMapCampusBuildings, getMapCampuses } from "@/lib/campus-buildings";
import { actions, useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/map")({
  loader: async () => {
    const [offers, eventRows, dealRows, campusBuildingRows, campuses] = await Promise.all([getStarvingStudentOffers(), getMapFoodEvents(), getMapDeals(), getMapCampusBuildings(), getMapCampuses()]);
    return { offers, eventRows, dealRows, campusBuildingRows, campuses };
  },
  head: () => ({
    meta: [
      { title: "Interactive Maps — Studeats" },
      { name: "description", content: "Explore Starving Student Card deals and free food events on area and BYU campus maps." },
    ],
  }),
  component: MapPage,
});

type View = "area" | "campus";
type Filter = "all" | "card" | "event" | "discount";
type Radius = 1 | 5 | 10 | 25 | "all";

function denverDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Denver", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function shiftDate(date: string, amount: number) {
  const [year, month, day] = date.split("-").map(Number);
  const shifted = new Date(year, month - 1, day + amount, 12);
  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, "0")}-${String(shifted.getDate()).padStart(2, "0")}`;
}

function friendlyMapDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day, 12).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

function distanceMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (value: number) => value * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 3958.8 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function isUpcomingEvent(row: { event_date: string; end_time: string }) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  const today = `${value("year")}-${value("month")}-${value("day")}`;
  const time = `${value("hour")}:${value("minute")}`;
  return row.event_date > today || (row.event_date === today && row.end_time.slice(0, 5) >= time);
}

function eventCountdown(event: NormalizedFoodEvent) {
  if (event.dayOffset > 1) return `In ${event.dayOffset} days`;
  if (event.dayOffset === 1) return "Tomorrow";
  const match = event.start.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return "Today";
  let hour = Number(match[1]) % 12;
  if (match[3].toUpperCase() === "PM") hour += 12;
  const target = new Date(); target.setHours(hour, Number(match[2]), 0, 0);
  const minutes = Math.round((target.getTime() - Date.now()) / 60000);
  if (minutes <= 0) return "Happening now";
  if (minutes < 60) return `Starts in ${minutes} min`;
  return `Starts in ${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function MapPage() {
  const router = useRouter();
  const { offers, eventRows, dealRows, campusBuildingRows, campuses } = Route.useLoaderData();
  const [view, setView] = useState<View>("area");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [listLimit, setListLimit] = useState(20);
  const [selected, setSelected] = useState<MapPlace | null>(null);
  const [openOffer, setOpenOffer] = useState<SSDeal | null>(null);
  const [openEvent, setOpenEvent] = useState<NormalizedFoodEvent | null>(null);
  const [openDeal, setOpenDeal] = useState<Deal | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [campusDate, setCampusDate] = useState(denverDateString);
  const [showInactiveBuildings, setShowInactiveBuildings] = useState(false);
  const [radius, setRadius] = useState<Radius>("all");
  const [focusPlaceId, setFocusPlaceId] = useState<string | null>(null);
  const [campusSlug, setCampusSlug] = useState(() => campuses[0]?.slug || "byu-provo");
  const { recentMapSearches } = useStore();
  useEffect(() => { void logActivityEvent("map_opened"); }, []);
  useEffect(() => {
    const channel = supabase.channel("map-live-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "food_events" }, () => void router.invalidate())
      .on("postgres_changes", { event: "*", schema: "public", table: "deals" }, () => void router.invalidate())
      .on("postgres_changes", { event: "*", schema: "public", table: "ss_deals" }, () => void router.invalidate())
      .on("postgres_changes", { event: "*", schema: "public", table: "campus_buildings" }, () => void router.invalidate())
      .on("postgres_changes", { event: "*", schema: "public", table: "campuses" }, () => void router.invalidate())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [router]);
  useEffect(() => { setSelected(null); }, [campusDate]);
  const events = useMemo(() => eventRows.filter(isUpcomingEvent).map(normalizeFoodEvent), [eventRows]);
  const selectedCampus = campuses.find((campus) => campus.slug === campusSlug) || campuses[0];
  const campusBuildingRowsForSelection = useMemo(() => campusBuildingRows.filter((building) => !selectedCampus || building.campusId === selectedCampus.id || (selectedCampus.slug === "byu-provo" && !building.campusId)), [campusBuildingRows, selectedCampus]);
  const cards = useMemo(() => cardPlaces(offers), [offers]);
  const campusEvents = useMemo(() => eventPlaces(events, campusBuildingRows), [events, campusBuildingRows]);
  const selectedCampusEvents = useMemo(() => eventRows.filter((row) => row.event_date === campusDate && (!selectedCampus || row.campus_id === selectedCampus.id || (selectedCampus.slug === "byu-provo" && !row.campus_id && Boolean(row.building_id)))).map(normalizeFoodEvent), [eventRows, campusDate, selectedCampus]);
  const buildings = useMemo(() => buildingPlaces(selectedCampusEvents, campusBuildingRowsForSelection), [selectedCampusEvents, campusBuildingRowsForSelection]);
  const discounts = useMemo(() => discountPlaces(dealRows.map(normalizeDeal)), [dealRows]);
  const places = useMemo(() => view === "campus" ? buildings : [
    ...(filter === "event" || filter === "discount" ? [] : cards),
    ...(filter === "card" || filter === "discount" ? [] : campusEvents),
    ...(filter === "card" || filter === "event" ? [] : discounts),
  ], [view, filter, cards, campusEvents, discounts, buildings]);
  const matchingPlaces = useMemo(() => {
    const text = query.trim().toLowerCase();
    const filtered = !text ? places : places.filter((place) => [place.title, place.code || "", place.address,
      ...place.cardOffers.flatMap((offer) => [offer.company, offer.item]),
      ...place.deals.flatMap((deal) => [deal.company, deal.title, deal.value]),
      ...place.events.flatMap((event) => [event.title, event.food, event.room]),
    ].some((value) => value.toLowerCase().includes(text)));
    if (!userLocation) return filtered;
    const withinRadius = radius === "all" ? filtered : filtered.filter((place) => distanceMiles(userLocation, place) <= radius);
    return [...withinRadius].sort((a, b) => distanceMiles(userLocation, a) - distanceMiles(userLocation, b));
  }, [places, query, userLocation, radius]);
  const mappedEvents = campusEvents.reduce((sum, place) => sum + place.events.length, 0);
  const nextCampusEvent = [...selectedCampusEvents].sort((a, b) => a.start.localeCompare(b.start))[0];
  const suggestions = query.trim().length >= 2 ? places.filter((place) => [place.title, place.code || "", ...place.events.map((event) => event.food)].some((value) => value.toLowerCase().includes(query.trim().toLowerCase()))).slice(0, 5) : [];

  const changeView = (next: View) => { setView(next); setSelected(null); setQuery(""); setListLimit(20); };
  const changeFilter = (next: Filter) => { setFilter(next); setSelected(null); setListLimit(20); };

  return (
    <>
      <PageHeader eyebrow="Two ways to explore" title="Interactive Maps">
        <p className="max-w-xl text-sm text-muted-foreground">Find nearby student deals or explore free-food events on your college campus.</p>
      </PageHeader>
      <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Map view">
        <button type="button" role="tab" aria-selected={view === "area"} onClick={() => changeView("area")}
          className={`rounded-full px-5 py-2 text-sm font-semibold ${view === "area" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>Area Map</button>
        <button type="button" role="tab" aria-selected={view === "campus"} onClick={() => changeView("campus")}
          className={`rounded-full px-5 py-2 text-sm font-semibold ${view === "campus" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>Campus Map</button>
      </div>
      {view === "area" ? (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2" aria-label="Map filters">
            {([["all", "Everything"], ["card", "Card deals"], ["event", "Free food"], ["discount", "Discounts"]] as const).map(([value, label]) => (
              <button key={value} type="button" onClick={() => changeFilter(value)} aria-pressed={filter === value}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold ring-1 ring-border ${filter === value ? "bg-foreground text-background" : "bg-secondary text-secondary-foreground"}`}>{label}</button>
            ))}
            <span className="ml-auto text-xs text-muted-foreground">{cards.length} card locations · {campusEvents.length} event locations · {discounts.length} discounts</span>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-medium text-muted-foreground" aria-label="Map pin legend">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1"><span className="grid size-6 place-items-center rounded-full bg-primary text-primary-foreground"><CreditCard className="size-3.5" /></span>Starving Student</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1"><span className="grid size-6 place-items-center rounded-full bg-amber-500 text-white"><Utensils className="size-3.5" /></span>Free food</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1"><span className="grid size-6 place-items-center rounded-full bg-violet-600 text-white"><BadgePercent className="size-3.5" /></span>Discount</span>
            <span className="inline-flex items-center px-2.5 py-1">Numbered pins group nearby places</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-muted-foreground">Distance:</span>
            {([1, 5, 10, 25, "all"] as const).map((value) => <button key={value} type="button" disabled={!userLocation} onClick={() => setRadius(value)} className={`rounded-full px-3 py-1.5 ring-1 ring-border disabled:opacity-40 ${radius === value ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{value === "all" ? "Any distance" : `${value} mi`}</button>)}
            {!userLocation && <span className="text-muted-foreground">Use the location button on the map to enable distance filters.</span>}
          </div>
        </div>
      ) : (
        <section className="mt-4 overflow-hidden rounded-2xl border border-[#224f75]/20 bg-gradient-to-br from-[#f8f4e8] via-white to-[#e4edf3] p-4 shadow-sm" aria-label="Campus day controls">
          <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-[#224f75]/15 bg-white/80 p-3">
            <label className="min-w-[220px] flex-1 text-xs font-semibold text-[#082e4f]">Choose your campus
              <select value={campusSlug} onChange={(event) => { setCampusSlug(event.target.value); setSelected(null); setFocusPlaceId(null); setQuery(""); }} className="mt-1 block w-full rounded-lg border border-[#224f75]/20 bg-white px-3 py-2 text-sm font-semibold">
                {campuses.map((campus) => <option key={campus.id} value={campus.slug}>{campus.name} · {campus.city}</option>)}
              </select>
            </label>
            {selectedCampus?.mapUrl && <a href={selectedCampus.mapUrl} target="_blank" rel="noopener noreferrer" className="rounded-full border border-[#224f75]/20 bg-white px-3 py-2 text-xs font-semibold text-[#082e4f]">Official campus map ↗</a>}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#224f75]">Explore a day</p>
              <h2 className="mt-0.5 font-serif text-xl font-semibold text-[#082e4f]">{friendlyMapDate(campusDate)}</h2>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <button type="button" onClick={() => setCampusDate(denverDateString())} className="rounded-full border border-[#224f75]/20 bg-white px-3 py-2 text-xs font-semibold text-[#082e4f] shadow-sm">Today</button>
              <button type="button" onClick={() => setCampusDate(shiftDate(campusDate, -1))} aria-label="Previous day" className="grid size-9 place-items-center rounded-full border border-[#224f75]/20 bg-white text-[#082e4f] shadow-sm"><ChevronLeft className="size-4" /></button>
              <label className="relative grid size-9 cursor-pointer place-items-center rounded-full border border-[#224f75]/20 bg-white text-[#082e4f] shadow-sm" aria-label="Choose map date">
                <CalendarDays className="size-4" />
                <input type="date" value={campusDate} onChange={(event) => { setCampusDate(event.target.value); setSelected(null); }} className="absolute inset-0 cursor-pointer opacity-0" />
              </label>
              <button type="button" onClick={() => setCampusDate(shiftDate(campusDate, 1))} aria-label="Next day" className="grid size-9 place-items-center rounded-full border border-[#224f75]/20 bg-white text-[#082e4f] shadow-sm"><ChevronRight className="size-4" /></button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#36566f]">
            <strong className="rounded-full px-3 py-1.5 text-white" style={{ backgroundColor: selectedCampus?.primaryColor || "#082e4f" }}>{selectedCampusEvents.length} free-food event{selectedCampusEvents.length === 1 ? "" : "s"}</strong>
            <span>across {buildings.filter((building) => building.events.length).length} campus location{buildings.filter((building) => building.events.length).length === 1 ? "" : "s"}</span>
            <span className="ml-auto">Numbered pins show events · highlighted buildings are active</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-[#224f75]/15 pt-3">
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#082e4f]"><input type="checkbox" checked={showInactiveBuildings} onChange={(event) => setShowInactiveBuildings(event.target.checked)} className="size-4 accent-[#082e4f]" />Show all campus buildings</label>
            {nextCampusEvent && <button type="button" onClick={() => { const place = buildings.find((building) => building.events.some((event) => event.id === nextCampusEvent.id)); if (place) { setSelected(place); setFocusPlaceId(place.id); } }} className="ml-auto rounded-xl bg-[#fff3cf] px-3 py-2 text-left text-xs text-[#082e4f] ring-1 ring-[#d99516]/30">
              <strong>{eventCountdown(nextCampusEvent)}:</strong> {nextCampusEvent.food} at {nextCampusEvent.building}{nextCampusEvent.room ? ` · ${nextCampusEvent.room}` : ""}
            </button>}
          </div>
        </section>
      )}
      <div className="mt-4 max-w-2xl">
        <form onSubmit={(event) => { event.preventDefault(); actions.addRecentMapSearch(query, view); const first = suggestions[0]; if (first) { setSelected(first); setFocusPlaceId(first.id); } }}>
          <label className="block text-sm font-medium" htmlFor="map-location-search">Search map locations</label>
          <div className="mt-1 flex gap-2">
            <input id="map-location-search" value={query} onChange={(event) => { setQuery(event.target.value); setSelected(null); setListLimit(20); }}
              placeholder={view === "campus" ? "Search a building, event, or food" : "Search a business, offer, or address"}
              className="block min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-2 outline-none focus:ring-2 focus:ring-primary" />
            <button type="submit" disabled={query.trim().length < 2} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-45"><Search className="size-4" />Search</button>
          </div>
        </form>
        {suggestions.length > 0 && (
          <div className="mt-1 overflow-hidden rounded-xl border border-border bg-popover shadow-lg" role="listbox" aria-label="Map search suggestions">
            {suggestions.map((place) => <button key={place.id} type="button" onClick={() => { setQuery(place.title); setSelected(place); setFocusPlaceId(place.id); actions.addRecentMapSearch(place.title, view); }} className="flex w-full items-center justify-between border-b border-border px-4 py-2 text-left text-sm last:border-0 hover:bg-muted"><span><strong>{place.title}</strong>{place.code ? ` · ${place.code}` : ""}</span><span className="text-xs text-muted-foreground">View on map →</span></button>)}
          </div>
        )}
        {recentMapSearches.length > 0 && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2" aria-label="Recent map searches">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground"><Clock3 className="size-3.5" />Recent</span>
            {recentMapSearches.slice(0, 5).map((item) => (
              <button key={`${item.view}-${item.query}`} type="button" onClick={() => { setView(item.view); setQuery(item.query); setSelected(null); setListLimit(20); }} className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground hover:bg-muted">
                {item.query}<span className="ml-1 text-muted-foreground">· {item.view === "campus" ? "BYU" : "Area"}</span>
              </button>
            ))}
            <button type="button" onClick={actions.clearRecentMapSearches} className="px-1 text-xs font-semibold text-muted-foreground underline hover:text-foreground">Clear</button>
          </div>
        )}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className={`glass relative overflow-hidden rounded-2xl p-0 ${view === "campus" ? "ring-1 ring-[#224f75]/20 shadow-xl" : ""}`}>
          <MapCanvas key={`${view}-${campusSlug}`} places={matchingPlaces} view={view} campus={selectedCampus} showInactiveBuildings={showInactiveBuildings} focusPlaceId={focusPlaceId} onSelect={setSelected} onOpenOffer={setOpenOffer} onOpenEvent={setOpenEvent} onOpenDeal={setOpenDeal} onUserLocation={setUserLocation} />
        </div>
        <aside id="map-place-details" className="glass max-h-[600px] scroll-mt-24 overflow-y-auto p-4" aria-live="polite">
          {selected ? (
            <>
              <button type="button" onClick={() => setSelected(null)} className="mb-3 text-xs font-semibold text-primary">← Back to map summary</button>
              <h2 className="text-xl font-semibold">{selected.title}</h2>
              {selected.code && <p className="text-sm font-semibold text-primary">{selected.code}</p>}
              {userLocation && <p className="mt-1 text-xs text-muted-foreground">About {Math.max(1, Math.round(distanceMiles(userLocation, selected) * 20))} min walking · {distanceMiles(userLocation, selected).toFixed(2)} mi</p>}
              <div className="mt-4 space-y-2">
                {selected.kind === "building" && selected.events.length === 0 && <p className="text-sm text-muted-foreground">No upcoming free food events at this building.</p>}
                {selected.cardOffers.map((offer) => (
                  <button key={offer.id} type="button" onClick={() => setOpenOffer(offer)} className="w-full rounded-xl bg-secondary p-3 text-left hover:bg-muted">
                    <span className="text-xs font-semibold text-primary">Starving Student Card</span>
                    <strong className="mt-1 block text-sm">{offer.item}</strong>
                    <span className="text-xs text-muted-foreground">{offer.value} · View details →</span>
                  </button>
                ))}
                {selected.deals.map((deal) => (
                  <button key={deal.id} type="button" onClick={() => setOpenDeal(deal)} className="w-full rounded-xl bg-secondary p-3 text-left hover:bg-muted">
                    <span className="text-xs font-semibold text-violet-700">Student discount</span>
                    <strong className="mt-1 block text-sm">{deal.title}</strong>
                    <span className="text-xs text-muted-foreground">{deal.value} · View details →</span>
                  </button>
                ))}
                {selected.events.map((event) => (
                  <button key={event.id} type="button" onClick={() => setOpenEvent(event)} className="w-full rounded-xl bg-secondary p-3 text-left hover:bg-muted">
                    <span className="text-xs font-semibold text-amber-700">Free food event</span>
                    <strong className="mt-1 block text-sm">{event.title}</strong>
                    <span className="block text-xs text-muted-foreground">{event.food} · {event.formattedDate}, {event.formattedTime}</span>
                    <span className="text-xs text-muted-foreground">{event.building}{event.room ? ` · ${event.room}` : ""}</span>
                  </button>
                ))}
              </div>
              <div className="mt-3 border-t border-border pt-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Get directions</p>
                <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${selected.lat}%2C${selected.lng}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center justify-center rounded-full bg-primary px-2 text-center text-[11px] font-semibold text-primary-foreground">Google Maps ↗</a>
                  <a href={`https://maps.apple.com/?daddr=${selected.lat}%2C${selected.lng}&dirflg=d`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center justify-center rounded-full border border-border bg-background px-2 text-center text-[11px] font-semibold text-foreground">Apple Maps ↗</a>
                </div>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold">{view === "campus" ? "Campus free food" : "Explore the area"}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{view === "area" ? "Use the location button on the map to find nearby offers, or select a pin for details. Numbered area pins group nearby locations." : `Select a highlighted building to see free food on ${friendlyMapDate(campusDate)}.`}</p>
              <div className="mt-5 space-y-3 text-sm">
                {view === "area" && <p><span className="mr-2 inline-block size-3 rounded-full bg-primary" />{offers.length} card offers at {cards.length} locations</p>}
                <p><span className="mr-2 inline-block size-3 rounded-full bg-amber-500" />{view === "campus" ? selectedCampusEvents.length : mappedEvents} free food event{(view === "campus" ? selectedCampusEvents.length : mappedEvents) === 1 ? "" : "s"} at {view === "campus" ? buildings.filter((building) => building.events.length).length : campusEvents.length} campus building{(view === "campus" ? buildings.filter((building) => building.events.length).length : campusEvents.length) === 1 ? "" : "s"}</p>
                {view === "campus" && <p><span className="mr-2 inline-block size-3 rounded-full border border-primary bg-white" />{campusBuildingRowsForSelection.length} named {selectedCampus?.shortName} buildings in Supabase</p>}
              </div>
              {events.length > mappedEvents && <p className="mt-5 text-xs text-muted-foreground">{events.length - mappedEvents} upcoming event{events.length - mappedEvents === 1 ? " has" : "s have"} an unverified map location. <Link to="/free-food" className="underline">Browse all events</Link>.</p>}
              {view === "area" && <p className="mt-5 text-xs text-muted-foreground">Other student discounts will appear as their locations are verified. <Link to="/discounts" className="underline">Browse all discounts</Link>.</p>}
              <h3 className="mt-6 text-sm font-semibold">Locations ({matchingPlaces.length})</h3>
              <div className="mt-2 space-y-2">
                {matchingPlaces.slice(0, listLimit).map((place) => (
                  <button key={place.id} type="button" onClick={() => setSelected(place)} className="w-full rounded-xl bg-secondary p-3 text-left hover:bg-muted">
                    <strong className="block text-sm">{place.title}</strong>
                    <span className="text-xs text-muted-foreground">{place.kind === "building" ? `${place.code || "BYU"}${place.events.length ? ` · ${place.events.length} free food event${place.events.length === 1 ? "" : "s"}` : ""}` : place.kind === "event" ? `${place.events.length} free food event${place.events.length === 1 ? "" : "s"}` : place.kind === "discount" ? `${place.deals.length} discount${place.deals.length === 1 ? "" : "s"}` : `${place.cardOffers.length} card offer${place.cardOffers.length === 1 ? "" : "s"}`}{userLocation ? ` · ${distanceMiles(userLocation, place).toFixed(1)} mi away` : ""} · Details →</span>
                  </button>
                ))}
                {matchingPlaces.length === 0 && <p className="text-sm text-muted-foreground">No mapped locations match this search.</p>}
                {matchingPlaces.length > listLimit && <button type="button" onClick={() => setListLimit((limit) => limit + 20)} className="text-sm font-semibold text-primary underline">Show more locations</button>}
              </div>
            </>
          )}
        </aside>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Map data © OpenStreetMap contributors. Campus directories come from official university sources; pins identify buildings, not exact rooms. UVU coordinates appear only after verification because its official Concept3D location API is private.</p>
      <SSDetail deal={openOffer} onClose={() => setOpenOffer(null)} />
      <DealDetail deal={openDeal} onClose={() => setOpenDeal(null)} />
      <EventDetail event={openEvent} onClose={() => setOpenEvent(null)} />
    </>
  );
}
