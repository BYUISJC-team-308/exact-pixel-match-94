import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { foodEvents, eventDate, type FoodEvent } from "@/lib/data";
import { actions, useStore } from "@/lib/store";
import { EventDetail, PageHeader } from "@/components/ui-bits";

export const Route = createFileRoute("/free-food")({
  head: () => ({
    meta: [
      { title: "Free Food Near Me — Studeats" },
      { name: "description", content: "Free food events on campus today and this week, with times, buildings and room numbers." },
      { property: "og:title", content: "Free Food Near Me — Studeats" },
      { property: "og:description", content: "Find free food on campus today and this week." },
    ],
  }),
  component: FreeFood,
});

function FreeFood() {
  const { savedEvents } = useStore();
  const [tab, setTab] = useState<"today" | "week">("today");
  const [auto, setAuto] = useState(true);
  const [open, setOpen] = useState<FoodEvent | null>(null);
  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => setTab((t) => (t === "today" ? "week" : "today")), 6000);
    return () => clearInterval(id);
  }, [auto]);
  const upcoming = foodEvents.filter((e) => e.dayOffset >= 0); // passed events hidden
  const list = tab === "today" ? upcoming.filter((e) => e.dayOffset === 0) : upcoming.filter((e) => e.dayOffset > 0 && e.dayOffset < 7);

  return (
    <>
      <PageHeader eyebrow={`${upcoming.filter((e) => e.dayOffset === 0).length} happening today`} title="Free Food Near Me">
        <div className="flex gap-2">
          <Link to="/calendar" className="inline-flex h-10 items-center rounded-full bg-secondary px-4 text-sm font-medium ring-1 ring-border">📅 Calendar</Link>
          <Link to="/map" className="inline-flex h-10 items-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground">📍 Map</Link>
        </div>
      </PageHeader>
      <div className="flex flex-wrap items-center gap-2">
        {(["today", "week"] as const).map((t) => (
          <button key={t} onClick={() => { setTab(t); setAuto(false); }} className={`relative overflow-hidden rounded-full px-4 py-2 text-sm font-medium ${tab === t ? "bg-primary text-primary-foreground" : "bg-secondary ring-1 ring-border"}`}>
            {t === "today" ? "Today" : "Upcoming this week"}
          </button>
        ))}
        <button onClick={() => setAuto(!auto)} className="ml-2 text-xs text-muted-foreground underline">{auto ? "Pause auto-cycle" : "Resume auto-cycle"}</button>
      </div>
      <div key={tab} className="rise mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {list.length === 0 && <p className="text-sm text-muted-foreground">Nothing scheduled.</p>}
        {list.map((e) => {
          const saved = savedEvents.includes(e.id);
          return (
            <div key={e.id} className="glass p-5">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-primary/15 px-2 py-0.5 font-mono text-xs text-primary">{eventDate(e).toLocaleDateString(undefined, { weekday: "short" })} {e.start}</span>
                <button onClick={() => actions.toggleEvent(e.id)} className={`text-xl ${saved ? "text-gold" : "text-muted-foreground hover:text-gold"}`} aria-label="Save event">{saved ? "★" : "☆"}</button>
              </div>
              <button onClick={() => setOpen(e)} className="block text-left">
                <h3 className="mt-3 text-lg font-semibold">{e.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{e.food} · {e.building}, {e.room}</p>
                <span className="mt-3 inline-block text-sm font-medium text-primary">Details →</span>
              </button>
            </div>
          );
        })}
      </div>
      <EventDetail event={open} onClose={() => setOpen(null)} />
    </>
  );
}
