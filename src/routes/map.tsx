import { useRenderClock } from "@/hooks/use-render-clock";
import { campusDateTime, DISPLAY_LOCALE, eventCountdown, isUpcomingEvent } from "@/lib/campus-time";
import { roomLabel } from "@/lib/student-copy";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BadgePercent, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Clock3, CreditCard, List, MapPin, Search, SlidersHorizontal, Sparkles, Utensils, X } from "lucide-react";
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
    return { offers, eventRows, dealRows, campusBuildingRows, campuses, renderedAt: Date.now() };
  },
  head: () => ({
    meta: [
      { title: "Interactive Maps — Student Steals" },
      { name: "description", content: "Explore Starving Student Card deals and free food events on area and BYU campus maps." },
    ],
  }),
  component: MapPage,
});

type View = "area" | "campus";
type Filter = "all" | "card" | "event" | "discount";
type Radius = 1 | 5 | 10 | 25 | "all";

function shiftDate(date: string, amount: number) {
  const [year, month, day] = date.split("-").map(Number);
  const shifted = new Date(year, month - 1, day + amount, 12);
  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, "0")}-${String(shifted.getDate()).padStart(2, "0")}`;
}

function friendlyMapDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day, 12).toLocaleDateString(DISPLAY_LOCALE, { weekday: "long", month: "long", day: "numeric" });
}

function distanceMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (value: number) => value * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 3958.8 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function eventStatus(event: NormalizedFoodEvent, now: Date) {
  const label = eventCountdown(event, now);
  if (label === "Happening now") return { label, className: "bg-emerald-100 text-emerald-800" };
  if (label.startsWith("Starts in") && !label.includes("h")) return { label, className: "bg-amber-100 text-amber-800" };
  return { label, className: "bg-sky-100 text-sky-800" };
}

function MapPage() {
  const router = useRouter();
  const { offers, eventRows, dealRows, campusBuildingRows, campuses, renderedAt } = Route.useLoaderData();
  const clock = useRenderClock(renderedAt);
  const now = useMemo(() => new Date(clock), [clock]);
  const [view, setView] = useState<View>("area");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [listLimit, setListLimit] = useState(20);
  const [selected, setSelected] = useState<MapPlace | null>(null);
  const [openOffer, setOpenOffer] = useState<SSDeal | null>(null);
  const [openEvent, setOpenEvent] = useState<NormalizedFoodEvent | null>(null);
  const [openDeal, setOpenDeal] = useState<Deal | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [campusDate, setCampusDate] = useState(() => campusDateTime(now).date);
  const [showInactiveBuildings, setShowInactiveBuildings] = useState(false);
  const [radius, setRadius] = useState<Radius>("all");
  const [focusPlaceId, setFocusPlaceId] = useState<string | null>(null);
  const [showMapOptions, setShowMapOptions] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [mobileSheetExpanded, setMobileSheetExpanded] = useState(false);
  const { recentMapSearches, preferredCampus } = useStore();
  const [campusSlug, setCampusSlug] = useState(() => campuses.some((campus) => campus.slug === preferredCampus) ? preferredCampus : campuses[0]?.slug || "byu-provo");
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
  const events = useMemo(() => eventRows.filter((row) => isUpcomingEvent(row, now)).map((row) => normalizeFoodEvent(row, now)), [eventRows, now]);
  const selectedCampus = campuses.find((campus) => campus.slug === campusSlug) || campuses[0];
  const campusBuildingRowsForSelection = useMemo(() => campusBuildingRows.filter((building) => !selectedCampus || building.campusId === selectedCampus.id || (selectedCampus.slug === "byu-provo" && !building.campusId)), [campusBuildingRows, selectedCampus]);
  const cards = useMemo(() => cardPlaces(offers), [offers]);
  const campusEvents = useMemo(() => eventPlaces(events, campusBuildingRows), [events, campusBuildingRows]);
  const selectedCampusEvents = useMemo(() => eventRows.filter((row) => row.event_date === campusDate && (!selectedCampus || row.campus_id === selectedCampus.id || (selectedCampus.slug === "byu-provo" && !row.campus_id && Boolean(row.building_id)))).map((row) => normalizeFoodEvent(row, now)), [eventRows, campusDate, selectedCampus, now]);
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

  const choosePlace = (place: MapPlace) => { setSelected(place); setFocusPlaceId(place.id); setMobileSheetOpen(true); setMobileSheetExpanded(true); };
  const changeView = (next: View) => { setView(next); setSelected(null); setQuery(""); setListLimit(20); setMobileSheetOpen(false); };
  const changeFilter = (next: Filter) => { setFilter(next); setSelected(null); setListLimit(20); };

  return (
    <>
      <PageHeader eyebrow="Explore nearby" title="Find deals and food nearby">
        <p className="max-w-xl text-sm text-muted-foreground">Choose a pin for offer details or an event’s time and location.</p>
      </PageHeader>
      <div className="mt-4 inline-flex rounded-2xl bg-secondary p-1 shadow-inner" role="tablist" aria-label="Map view">
        <button type="button" role="tab" aria-selected={view === "area"} onClick={() => changeView("area")}
          className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${view === "area" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}><MapPin className="mr-1.5 inline size-4" />Around me</button>
        <button type="button" role="tab" aria-selected={view === "campus"} onClick={() => changeView("campus")}
          className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${view === "campus" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}><Sparkles className="mr-1.5 inline size-4" />Campus</button>
      </div>
      {view === "area" ? (
        <div className="mt-4 space-y-3 rounded-2xl border border-border/70 bg-background/80 p-3 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-center gap-2 pb-1" aria-label="Map filters">
            {([["all", "Everything"], ["card", "Card deals"], ["event", "Free food"], ["discount", "Discounts"]] as const).map(([value, label]) => (
              <button key={value} type="button" onClick={() => changeFilter(value)} aria-pressed={filter === value}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-all ${filter === value ? "bg-primary text-primary-foreground shadow-sm" : "bg-secondary text-secondary-foreground"}`}>{label}</button>
            ))}
            <button type="button" onClick={() => setShowMapOptions((open) => !open)} aria-expanded={showMapOptions} className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-3 py-2 text-xs font-semibold"><SlidersHorizontal className="size-3.5" />Filters<ChevronDown className={`size-3 transition-transform ${showMapOptions ? "rotate-180" : ""}`} /></button>
          </div>
          <p className="text-xs text-muted-foreground"><strong className="text-foreground">{matchingPlaces.length} places</strong> on this map · {offers.length} card offers listed</p>
          {showMapOptions && <div className="space-y-3 border-t border-border pt-3">
            <div className="flex flex-wrap gap-2 text-xs font-medium text-muted-foreground" aria-label="Map pin legend">
              <span className="inline-flex items-center gap-1.5"><span className="grid size-6 place-items-center rounded-full bg-primary text-primary-foreground"><CreditCard className="size-3.5" /></span>Card</span>
              <span className="inline-flex items-center gap-1.5"><span className="grid size-6 place-items-center rounded-full bg-amber-500 text-white"><Utensils className="size-3.5" /></span>Free food</span>
              <span className="inline-flex items-center gap-1.5"><span className="grid size-6 place-items-center rounded-full bg-violet-600 text-white"><BadgePercent className="size-3.5" /></span>Discount</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-muted-foreground">Distance</span>
              {([1, 5, 10, 25, "all"] as const).map((value) => <button key={value} type="button" disabled={!userLocation} onClick={() => setRadius(value)} className={`rounded-full px-3 py-1.5 disabled:opacity-40 ${radius === value ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{value === "all" ? "Any" : `${value} mi`}</button>)}
              {!userLocation && <span className="w-full text-muted-foreground">Use the map’s location button to filter by distance.</span>}
            </div>
          </div>}
        </div>
      ) : (
        <section className="mt-4 overflow-hidden rounded-[1.5rem] border border-white/60 bg-gradient-to-br from-[#f8f4e8] via-white to-[#e4edf3] p-3 shadow-lg sm:p-4" aria-label="Campus day controls">
          <div className="mb-3 flex flex-col gap-3 rounded-2xl bg-white/85 p-3 shadow-sm backdrop-blur sm:flex-row sm:items-end">
            <label className="w-full min-w-0 flex-1 text-xs font-semibold text-[#082e4f]">Choose your campus
              <select value={campusSlug} onChange={(event) => { setCampusSlug(event.target.value); actions.setPreferredCampus(event.target.value); setSelected(null); setFocusPlaceId(null); setQuery(""); }} className="mt-1 block w-full rounded-lg border border-[#224f75]/20 bg-white px-3 py-2 text-sm font-semibold">
                {campuses.map((campus) => <option key={campus.id} value={campus.slug}>{campus.name} · {campus.city}</option>)}
              </select>
            </label>
            {selectedCampus?.mapUrl && <a href={selectedCampus.mapUrl} target="_blank" rel="noopener noreferrer" className="rounded-full border border-[#224f75]/20 bg-white px-3 py-2 text-xs font-semibold text-[#082e4f]">Official campus map ↗</a>}
          </div>
          <div className="flex flex-wrap items-center gap-3 px-1">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#224f75]">Explore a day</p>
              <h2 className="mt-0.5 font-serif text-xl font-semibold text-[#082e4f]">{friendlyMapDate(campusDate)}</h2>
            </div>
            <div className="ml-auto flex items-center gap-1.5 rounded-2xl bg-white/75 p-1 shadow-sm">
              <button type="button" onClick={() => setCampusDate(shiftDate(campusDate, -1))} aria-label="Previous day" className="grid size-9 place-items-center rounded-full border border-[#224f75]/20 bg-white text-[#082e4f] shadow-sm"><ChevronLeft className="size-4" /></button>
              <button type="button" onClick={() => setCampusDate(campusDateTime(now).date)} className="rounded-full bg-[#082e4f] px-3 py-2 text-xs font-semibold text-white shadow-sm">Today</button>
              <label className="relative grid size-9 cursor-pointer place-items-center rounded-full border border-[#224f75]/20 bg-white text-[#082e4f] shadow-sm" aria-label="Choose map date">
                <CalendarDays className="size-4" />
                <input type="date" value={campusDate} onChange={(event) => { setCampusDate(event.target.value); setSelected(null); }} className="absolute inset-0 cursor-pointer opacity-0" />
              </label>
              <button type="button" onClick={() => setCampusDate(shiftDate(campusDate, 1))} aria-label="Next day" className="grid size-9 place-items-center rounded-full border border-[#224f75]/20 bg-white text-[#082e4f] shadow-sm"><ChevronRight className="size-4" /></button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-white/60 px-3 py-2 text-xs text-[#36566f]">
            <strong className="rounded-full px-3 py-1.5 text-white" style={{ backgroundColor: selectedCampus?.primaryColor || "#082e4f" }}>{selectedCampusEvents.length} free-food event{selectedCampusEvents.length === 1 ? "" : "s"}</strong>
            <span>across {buildings.filter((building) => building.events.length).length} campus location{buildings.filter((building) => building.events.length).length === 1 ? "" : "s"}</span>
            <span className="ml-auto hidden sm:inline">Highlighted buildings have active events</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-[#224f75]/15 pt-3">
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#082e4f]"><input type="checkbox" checked={showInactiveBuildings} onChange={(event) => setShowInactiveBuildings(event.target.checked)} className="size-4 accent-[#082e4f]" />Show all campus buildings</label>
            {nextCampusEvent && <button type="button" onClick={() => { const place = buildings.find((building) => building.events.some((event) => event.id === nextCampusEvent.id)); if (place) { setSelected(place); setFocusPlaceId(place.id); } }} className="ml-auto rounded-xl bg-[#fff3cf] px-3 py-2 text-left text-xs text-[#082e4f] ring-1 ring-[#d99516]/30">
              <strong>{eventCountdown(nextCampusEvent, now)}:</strong> {nextCampusEvent.food} at {nextCampusEvent.building}{nextCampusEvent.room ? ` · ${roomLabel(nextCampusEvent.room)}` : ""}
            </button>}
            {!nextCampusEvent && <div className="ml-auto flex-1 rounded-2xl bg-white px-4 py-3 text-xs text-[#36566f] shadow-sm sm:flex-none"><strong className="block text-sm text-[#082e4f]">Nothing posted for this day</strong><span>Try another date or add a free-food event.</span> <Link to="/free-food" className="ml-1 font-semibold underline">View events</Link></div>}
          </div>
        </section>
      )}
      <div className="mt-4">
        <form onSubmit={(event) => { event.preventDefault(); actions.addRecentMapSearch(query, view); const first = suggestions[0]; if (first) { setSelected(first); setFocusPlaceId(first.id); } }}>
          <label className="sr-only" htmlFor="map-location-search">Search map locations</label>
          <div className="flex gap-2 rounded-2xl border border-border bg-background p-1.5 shadow-md">
            <input id="map-location-search" value={query} onChange={(event) => { setQuery(event.target.value); setSelected(null); setListLimit(20); }}
              placeholder={view === "campus" ? "Search a building, event, or food" : "Search a business, offer, or address"}
              className="block min-w-0 flex-1 rounded-xl border-0 bg-transparent px-3 py-2.5 text-sm outline-none focus:ring-0" />
            <button type="submit" disabled={query.trim().length < 2} className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm disabled:opacity-45" aria-label="Search map"><Search className="size-4" /></button>
          </div>
        </form>
        {suggestions.length > 0 && (
          <div className="mt-1 overflow-hidden rounded-xl border border-border bg-popover shadow-lg" role="listbox" aria-label="Map search suggestions">
            {suggestions.map((place) => <button key={place.id} type="button" onClick={() => { setQuery(place.title); choosePlace(place); actions.addRecentMapSearch(place.title, view); }} className="flex w-full items-center justify-between border-b border-border px-4 py-3 text-left text-sm last:border-0 hover:bg-muted"><span><strong>{place.title}</strong>{place.code ? ` · ${place.code}` : ""}</span><span className="text-xs text-muted-foreground">View →</span></button>)}
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
      <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className={`glass relative overflow-hidden rounded-[1.6rem] p-0 shadow-xl xl:sticky xl:top-4 ${view === "campus" ? "ring-1 ring-[#224f75]/20" : "ring-1 ring-border/60"}`}>
          <MapCanvas key={`${view}-${campusSlug}`} places={matchingPlaces} view={view} campus={selectedCampus} showInactiveBuildings={showInactiveBuildings} focusPlaceId={focusPlaceId} onSelect={choosePlace} onOpenOffer={setOpenOffer} onOpenEvent={setOpenEvent} onOpenDeal={setOpenDeal} onUserLocation={setUserLocation} />
          <button type="button" onClick={() => { setMobileSheetOpen(true); setMobileSheetExpanded(false); }} className="absolute bottom-4 left-1/2 z-20 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background shadow-xl xl:hidden"><List className="size-4" />{selected ? "View details" : `${matchingPlaces.length} places`}</button>
        </div>
        <aside id="map-place-details" className={`${mobileSheetOpen ? `fixed inset-x-0 bottom-0 z-40 block rounded-t-[1.75rem] transition-[max-height] duration-300 ${mobileSheetExpanded ? "max-h-[90dvh]" : "max-h-[62dvh]"}` : "hidden"} glass scroll-mt-24 overflow-y-auto overscroll-contain border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl xl:sticky xl:top-4 xl:block xl:max-h-[calc(100dvh-6rem)] xl:rounded-[1.6rem] xl:border xl:shadow-lg`} aria-label="Map locations and details" aria-live="polite">
          <div className="sticky -top-4 z-10 -mx-4 -mt-4 mb-3 flex items-center justify-between border-b border-border/70 bg-background/95 px-4 pb-3 pt-2 backdrop-blur xl:hidden">
            <button type="button" aria-expanded={mobileSheetExpanded} onClick={() => setMobileSheetExpanded((expanded) => !expanded)} className="mx-auto flex h-11 w-20 items-start justify-center pt-2" aria-label={mobileSheetExpanded ? "Collapse results" : "Expand results"}><span className="h-1 w-12 rounded-full bg-muted-foreground/25" /></button>
            <button type="button" onClick={() => setMobileSheetOpen(false)} className="absolute right-3 top-2 grid size-9 place-items-center rounded-full bg-muted" aria-label="Close results"><X className="size-4" /></button>
          </div>
          {selected ? (
            <>
              <button type="button" onClick={() => { setSelected(null); setFocusPlaceId(null); }} className="mb-3 text-xs font-semibold text-primary">← All locations</button>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{selected.kind === "building" ? "Campus building" : selected.events.length ? "Free food" : selected.deals.length ? "Student discount" : "Starving Student"}</p>
              <h2 className="mt-1 font-serif text-2xl font-semibold leading-tight">{selected.title}</h2>
              {selected.code && <p className="text-sm font-semibold text-primary">{selected.code}</p>}
              {userLocation && <p className="mt-1 text-xs text-muted-foreground">About {Math.max(1, Math.round(distanceMiles(userLocation, selected) * 20))} min walking · {distanceMiles(userLocation, selected).toFixed(2)} mi</p>}
              <div className="mt-4 space-y-2">
                {selected.kind === "building" && selected.events.length === 0 && <p className="text-sm text-muted-foreground">No upcoming free food events at this building.</p>}
                {selected.cardOffers.map((offer) => (
                  <button key={offer.id} type="button" onClick={() => setOpenOffer(offer)} className="w-full rounded-2xl border-l-4 border-primary bg-secondary p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-muted hover:shadow-md">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary"><CreditCard className="size-3.5" />Starving Student Card</span>
                    <strong className="mt-1 block text-sm">{offer.item}</strong>
                    <span className="text-xs text-muted-foreground">{offer.value} · View details →</span>
                  </button>
                ))}
                {selected.deals.map((deal) => (
                  <button key={deal.id} type="button" onClick={() => setOpenDeal(deal)} className="w-full rounded-2xl border-l-4 border-violet-600 bg-secondary p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-muted hover:shadow-md">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700"><BadgePercent className="size-3.5" />Student discount</span>
                    <strong className="mt-1 block text-sm">{deal.title}</strong>
                    <span className="text-xs text-muted-foreground">{deal.value} · View details →</span>
                  </button>
                ))}
                {selected.events.map((event) => (
                  <button key={event.id} type="button" onClick={() => setOpenEvent(event)} className="w-full rounded-2xl border-l-4 border-amber-500 bg-secondary p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-muted hover:shadow-md">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${eventStatus(event, now).className}`}>{eventStatus(event, now).label}</span>
                    <strong className="mt-1 block text-sm">{event.title}</strong>
                    <span className="block text-xs text-muted-foreground">{event.food} · {event.formattedDate}, {event.formattedTime}</span>
                    <span className="text-xs text-muted-foreground">{event.building}{event.room ? ` · ${roomLabel(event.room)}` : ""}</span>
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
              <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{view === "campus" ? selectedCampus?.shortName : "Nearby"}</p><h2 className="font-serif text-2xl font-semibold">{view === "campus" ? "Campus free food" : "Explore the area"}</h2></div><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{matchingPlaces.length}</span></div>
              <p className="mt-2 text-sm text-muted-foreground">{view === "area" ? "Use the location button on the map to find nearby offers, or select a pin for details. Numbered area pins group nearby locations." : `Select a highlighted building to see free food on ${friendlyMapDate(campusDate)}.`}</p>
              <div className="mt-5 space-y-3 text-sm">
                {view === "area" && <p><span className="mr-2 inline-block size-3 rounded-full bg-primary" />{offers.length} card offers at {cards.length} locations</p>}
                <p><span className="mr-2 inline-block size-3 rounded-full bg-amber-500" />{view === "campus" ? selectedCampusEvents.length : mappedEvents} free food event{(view === "campus" ? selectedCampusEvents.length : mappedEvents) === 1 ? "" : "s"} at {view === "campus" ? buildings.filter((building) => building.events.length).length : campusEvents.length} campus building{(view === "campus" ? buildings.filter((building) => building.events.length).length : campusEvents.length) === 1 ? "" : "s"}</p>
                {view === "campus" && <p><span className="mr-2 inline-block size-3 rounded-full border border-primary bg-white" />{campusBuildingRowsForSelection.length} named {selectedCampus?.shortName} buildings in Supabase</p>}
              </div>
              {events.length > mappedEvents && <p className="mt-5 text-xs text-muted-foreground">{events.length - mappedEvents} upcoming event{events.length - mappedEvents === 1 ? " has" : "s have"} a location we can’t place on the map. <Link to="/free-food" className="underline">Browse all events</Link>.</p>}
              {view === "area" && <p className="mt-5 text-xs text-muted-foreground">Discounts need a mapped location to appear here. <Link to="/discounts" className="underline">Browse all discounts</Link>.</p>}
              <h3 className="mt-6 text-sm font-semibold">Locations ({matchingPlaces.length})</h3>
              <div className="mt-2 space-y-2">
                {matchingPlaces.slice(0, listLimit).map((place) => (
                  <button key={place.id} type="button" onClick={() => choosePlace(place)} className="group flex w-full items-center gap-3 rounded-2xl border border-transparent bg-secondary p-3 text-left transition hover:-translate-y-0.5 hover:border-border hover:bg-muted hover:shadow-sm">
                    <span className={`grid size-10 shrink-0 place-items-center rounded-xl text-white ${place.events.length ? "bg-amber-500" : place.deals.length ? "bg-violet-600" : "bg-primary"}`}>{place.events.length ? <Utensils className="size-4" /> : place.deals.length ? <BadgePercent className="size-4" /> : <CreditCard className="size-4" />}</span>
                    <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{place.title}</strong>
                    <span className="block truncate text-xs text-muted-foreground">{place.kind === "building" ? `${place.code || selectedCampus?.shortName || "Campus"}${place.events.length ? ` · ${place.events.length} free food event${place.events.length === 1 ? "" : "s"}` : ""}` : place.kind === "event" ? `${place.events.length} free food event${place.events.length === 1 ? "" : "s"}` : place.kind === "discount" ? `${place.deals.length} discount${place.deals.length === 1 ? "" : "s"}` : `${place.cardOffers.length} card offer${place.cardOffers.length === 1 ? "" : "s"}`}{userLocation ? ` · ${distanceMiles(userLocation, place).toFixed(1)} mi` : ""}</span></span><ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </button>
                ))}
                {matchingPlaces.length === 0 && <p className="text-sm text-muted-foreground">No mapped locations match this search.</p>}
                {matchingPlaces.length > listLimit && <button type="button" onClick={() => setListLimit((limit) => limit + 20)} className="text-sm font-semibold text-primary underline">Show more locations</button>}
              </div>
            </>
          )}
        </aside>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Map data © OpenStreetMap contributors. Campus directories come from official university sources; pins identify buildings, not exact rooms. Some UVU buildings do not have map pins yet. Use the official campus map when a location is missing.</p>
      <SSDetail deal={openOffer} onClose={() => setOpenOffer(null)} />
      <DealDetail deal={openDeal} onClose={() => setOpenDeal(null)} />
      <EventDetail event={openEvent} onClose={() => setOpenEvent(null)} />
    </>
  );
}
