import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MapCanvas } from "@/components/MapCanvas";
import { EventDetail, PageHeader, SSDetail } from "@/components/ui-bits";
import type { SSDeal } from "@/lib/data";
import { getMapFoodEvents, normalizeFoodEvent, type NormalizedFoodEvent } from "@/lib/food-events";
import { cardPlaces, eventPlaces, type MapPlace } from "@/lib/map-places";
import { getStarvingStudentOffers } from "@/lib/starving-student";

export const Route = createFileRoute("/map")({
  loader: async () => {
    const [offers, eventRows] = await Promise.all([getStarvingStudentOffers(), getMapFoodEvents()]);
    return { offers, eventRows };
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
type Filter = "all" | "card" | "event";

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
  const { offers, eventRows } = Route.useLoaderData();
  const [view, setView] = useState<View>("area");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [listLimit, setListLimit] = useState(20);
  const [selected, setSelected] = useState<MapPlace | null>(null);
  const [openOffer, setOpenOffer] = useState<SSDeal | null>(null);
  const [openEvent, setOpenEvent] = useState<NormalizedFoodEvent | null>(null);
  const events = useMemo(() => eventRows.filter(isUpcomingEvent).map(normalizeFoodEvent), [eventRows]);
  const cards = useMemo(() => cardPlaces(offers), [offers]);
  const campusEvents = useMemo(() => eventPlaces(events), [events]);
  const places = useMemo(() => view === "campus" ? campusEvents : [
    ...(filter === "event" ? [] : cards),
    ...(filter === "card" ? [] : campusEvents),
  ], [view, filter, cards, campusEvents]);
  const matchingPlaces = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return places;
    return places.filter((place) => [place.title, place.address,
      ...place.cardOffers.flatMap((offer) => [offer.company, offer.item]),
      ...place.events.flatMap((event) => [event.title, event.food, event.room]),
    ].some((value) => value.toLowerCase().includes(text)));
  }, [places, query]);
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
        <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Map filters">
          {([["all", "Everything"], ["card", "Card deals"], ["event", "Free food"]] as const).map(([value, label]) => (
            <button key={value} type="button" onClick={() => changeFilter(value)} aria-pressed={filter === value}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold ring-1 ring-border ${filter === value ? "bg-foreground text-background" : "bg-secondary text-secondary-foreground"}`}>{label}</button>
          ))}
          <span className="ml-auto text-xs text-muted-foreground">{cards.length} card locations · {campusEvents.length} event buildings</span>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">Upcoming free food events at verified BYU buildings. Select a pin for the food, time, and room.</p>
      )}
      <label className="mt-4 block max-w-md text-sm font-medium">
        Search map locations
        <input value={query} onChange={(event) => { setQuery(event.target.value); setSelected(null); setListLimit(20); }}
          placeholder={view === "campus" ? "Search a building, event, or food" : "Search a business, offer, or address"}
          className="mt-1 block w-full rounded-xl border border-border bg-background px-4 py-2 outline-none focus:ring-2 focus:ring-primary" />
      </label>
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="glass relative overflow-hidden rounded-2xl p-0">
          <MapCanvas key={view} places={matchingPlaces} view={view} onSelect={setSelected} />
        </div>
        <aside className="glass max-h-[600px] overflow-y-auto p-4" aria-live="polite">
          {selected ? (
            <>
              <button type="button" onClick={() => setSelected(null)} className="mb-3 text-xs font-semibold text-primary">← Back to map summary</button>
              <h2 className="text-xl font-semibold">{selected.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{selected.address}</p>
              <a href={`https://www.openstreetmap.org/directions?to=${selected.lat}%2C${selected.lng}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-semibold text-primary underline">Get directions ↗</a>
              <div className="mt-4 space-y-2">
                {selected.cardOffers.map((offer) => (
                  <button key={offer.id} type="button" onClick={() => setOpenOffer(offer)} className="w-full rounded-xl bg-secondary p-3 text-left hover:bg-muted">
                    <span className="text-xs font-semibold text-primary">Starving Student Card</span>
                    <strong className="mt-1 block text-sm">{offer.item}</strong>
                    <span className="text-xs text-muted-foreground">{offer.value} · View details →</span>
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
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold">{view === "campus" ? "Campus free food" : "Explore the area"}</h2>
              <p className="mt-2 text-sm text-muted-foreground">Click a pin for details. Numbered pins group nearby locations; click to zoom in.</p>
              <div className="mt-5 space-y-3 text-sm">
                {view === "area" && <p><span className="mr-2 inline-block size-3 rounded-full bg-primary" />{offers.length} card offers at {cards.length} locations</p>}
                <p><span className="mr-2 inline-block size-3 rounded-full bg-amber-500" />{mappedEvents} upcoming free food event{mappedEvents === 1 ? "" : "s"} at {campusEvents.length} BYU building{campusEvents.length === 1 ? "" : "s"}</p>
              </div>
              {events.length > mappedEvents && <p className="mt-5 text-xs text-muted-foreground">{events.length - mappedEvents} upcoming event{events.length - mappedEvents === 1 ? " has" : "s have"} an unverified map location. <Link to="/free-food" className="underline">Browse all events</Link>.</p>}
              {view === "area" && <p className="mt-5 text-xs text-muted-foreground">Other student discounts will appear as their locations are verified. <Link to="/discounts" className="underline">Browse all discounts</Link>.</p>}
              <h3 className="mt-6 text-sm font-semibold">Locations ({matchingPlaces.length})</h3>
              <div className="mt-2 space-y-2">
                {matchingPlaces.slice(0, listLimit).map((place) => (
                  <button key={place.id} type="button" onClick={() => setSelected(place)} className="w-full rounded-xl bg-secondary p-3 text-left hover:bg-muted">
                    <strong className="block text-sm">{place.title}</strong>
                    <span className="text-xs text-muted-foreground">{place.kind === "event" ? `${place.events.length} free food event${place.events.length === 1 ? "" : "s"}` : `${place.cardOffers.length} card offer${place.cardOffers.length === 1 ? "" : "s"}`} · Details →</span>
                  </button>
                ))}
                {matchingPlaces.length === 0 && <p className="text-sm text-muted-foreground">No mapped locations match this search.</p>}
                {matchingPlaces.length > listLimit && <button type="button" onClick={() => setListLimit((limit) => limit + 20)} className="text-sm font-semibold text-primary underline">Show more locations</button>}
              </div>
            </>
          )}
        </aside>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Map data © OpenStreetMap contributors. Building pins identify buildings, not exact rooms.</p>
      <SSDetail deal={openOffer} onClose={() => setOpenOffer(null)} />
      <EventDetail event={openEvent} onClose={() => setOpenEvent(null)} />
    </>
  );
}
