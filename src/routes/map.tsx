import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BadgePercent, CalendarDays, ChevronLeft, ChevronRight, CreditCard, Utensils } from "lucide-react";
import { MapCanvas } from "@/components/MapCanvas";
import { DealDetail, EventDetail, PageHeader, SSDetail } from "@/components/ui-bits";
import type { Deal, SSDeal } from "@/lib/data";
import { getMapDeals, normalizeDeal } from "@/lib/deals";
import { logActivityEvent } from "@/lib/analytics";
import { getMapFoodEvents, normalizeFoodEvent, type NormalizedFoodEvent } from "@/lib/food-events";
import { buildingPlaces, cardPlaces, campusBuildings, discountPlaces, eventPlaces, type MapPlace } from "@/lib/map-places";
import { getStarvingStudentOffers } from "@/lib/starving-student";

export const Route = createFileRoute("/map")({
  loader: async () => {
    const [offers, eventRows, dealRows] = await Promise.all([getStarvingStudentOffers(), getMapFoodEvents(), getMapDeals()]);
    return { offers, eventRows, dealRows };
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

function MapPage() {
  const { offers, eventRows, dealRows } = Route.useLoaderData();
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
  useEffect(() => { void logActivityEvent("map_opened"); }, []);
  useEffect(() => { setSelected(null); }, [campusDate]);
  const events = useMemo(() => eventRows.filter(isUpcomingEvent).map(normalizeFoodEvent), [eventRows]);
  const cards = useMemo(() => cardPlaces(offers), [offers]);
  const campusEvents = useMemo(() => eventPlaces(events), [events]);
  const selectedCampusEvents = useMemo(() => eventRows.filter((row) => row.event_date === campusDate).map(normalizeFoodEvent), [eventRows, campusDate]);
  const buildings = useMemo(() => buildingPlaces(selectedCampusEvents), [selectedCampusEvents]);
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
    return userLocation ? [...filtered].sort((a, b) => distanceMiles(userLocation, a) - distanceMiles(userLocation, b)) : filtered;
  }, [places, query, userLocation]);
  const mappedEvents = campusEvents.reduce((sum, place) => sum + place.events.length, 0);

  const changeView = (next: View) => { setView(next); setSelected(null); setQuery(""); setListLimit(20); };
  const changeFilter = (next: Filter) => { setFilter(next); setSelected(null); setListLimit(20); };

  return (
    <>
      <PageHeader eyebrow="Two ways to explore" title="Interactive Maps">
        <p className="max-w-xl text-sm text-muted-foreground">Find a card deal near you or see where the next free food event is happening at BYU.</p>
      </PageHeader>
      <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Map view">
        <button type="button" role="tab" aria-selected={view === "area"} onClick={() => changeView("area")}
          className={`rounded-full px-5 py-2 text-sm font-semibold ${view === "area" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>Area Map</button>
        <button type="button" role="tab" aria-selected={view === "campus"} onClick={() => changeView("campus")}
          className={`rounded-full px-5 py-2 text-sm font-semibold ${view === "campus" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>BYU Campus Map</button>
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
        </div>
      ) : (
        <section className="mt-4 overflow-hidden rounded-2xl border border-[#224f75]/20 bg-gradient-to-br from-[#f8f4e8] via-white to-[#e4edf3] p-4 shadow-sm" aria-label="Campus day controls">
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
            <strong className="rounded-full bg-[#082e4f] px-3 py-1.5 text-white">{selectedCampusEvents.length} free-food event{selectedCampusEvents.length === 1 ? "" : "s"}</strong>
            <span>across {buildings.filter((building) => building.events.length).length} campus location{buildings.filter((building) => building.events.length).length === 1 ? "" : "s"}</span>
            <span className="ml-auto">Numbered pins show events · highlighted buildings are active</span>
          </div>
        </section>
      )}
      <label className="mt-4 block max-w-md text-sm font-medium">
        Search map locations
        <input value={query} onChange={(event) => { setQuery(event.target.value); setSelected(null); setListLimit(20); }}
          placeholder={view === "campus" ? "Search a building, event, or food" : "Search a business, offer, or address"}
          className="mt-1 block w-full rounded-xl border border-border bg-background px-4 py-2 outline-none focus:ring-2 focus:ring-primary" />
      </label>
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className={`glass relative overflow-hidden rounded-2xl p-0 ${view === "campus" ? "ring-1 ring-[#224f75]/20 shadow-xl" : ""}`}>
          <MapCanvas key={view} places={matchingPlaces} view={view} onSelect={setSelected} onOpenOffer={setOpenOffer} onOpenEvent={setOpenEvent} onOpenDeal={setOpenDeal} onUserLocation={setUserLocation} />
        </div>
        <aside id="map-place-details" className="glass max-h-[600px] scroll-mt-24 overflow-y-auto p-4" aria-live="polite">
          {selected ? (
            <>
              <button type="button" onClick={() => setSelected(null)} className="mb-3 text-xs font-semibold text-primary">← Back to map summary</button>
              <h2 className="text-xl font-semibold">{selected.title}</h2>
              {selected.code && <p className="text-sm font-semibold text-primary">{selected.code}</p>}
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
                <p><span className="mr-2 inline-block size-3 rounded-full bg-amber-500" />{view === "campus" ? selectedCampusEvents.length : mappedEvents} free food event{(view === "campus" ? selectedCampusEvents.length : mappedEvents) === 1 ? "" : "s"} at {view === "campus" ? buildings.filter((building) => building.events.length).length : campusEvents.length} BYU building{(view === "campus" ? buildings.filter((building) => building.events.length).length : campusEvents.length) === 1 ? "" : "s"}</p>
                {view === "campus" && <p><span className="mr-2 inline-block size-3 rounded-full border border-primary bg-white" />{campusBuildings.length} named BYU buildings</p>}
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
      <p className="mt-3 text-xs text-muted-foreground">Map data © OpenStreetMap contributors. Building names and centers from the <a href="https://map.byu.edu/" target="_blank" rel="noopener noreferrer" className="underline">BYU Campus Map</a>; pins identify buildings, not exact rooms.</p>
      <SSDetail deal={openOffer} onClose={() => setOpenOffer(null)} />
      <DealDetail deal={openDeal} onClose={() => setOpenDeal(null)} />
      <EventDetail event={openEvent} onClose={() => setOpenEvent(null)} />
    </>
  );
}
