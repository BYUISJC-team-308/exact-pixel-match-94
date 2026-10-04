import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { foodEvents, eventDate, sameDay, type FoodEvent } from "@/lib/data";
import { EventDetail, PageHeader, Btn } from "@/components/ui-bits";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Free Food Calendar — Studeats" },
      { name: "description", content: "An interactive calendar of upcoming free food events on campus." },
      { property: "og:title", content: "Free Food Calendar — Studeats" },
      { property: "og:description", content: "Pick a date to see free food on campus." },
    ],
  }),
  component: Calendar,
});

function Calendar() {
  useStore();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [sel, setSel] = useState(today);
  const [open, setOpen] = useState<FoodEvent | null>(null);
  const first = month.getDay();
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))];
  const on = (d: Date) => foodEvents.filter((e) => e.dayOffset >= 0 && sameDay(eventDate(e), d));
  const selEvents = on(sel);

  return (
    <>
      <PageHeader eyebrow={`Today is ${today.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}`} title="Calendar" />
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="glass p-5">
          <div className="flex items-center justify-between">
            <Btn variant="soft" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>←</Btn>
            <h2 className="text-xl font-semibold">{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h2>
            <Btn variant="soft" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>→</Btn>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (!d) return <div key={i} />;
              const evs = on(d);
              const isToday = sameDay(d, today);
              const isSel = sameDay(d, sel);
              return (
                <button key={i} onClick={() => setSel(d)} className={`flex min-h-20 flex-col items-start rounded-lg p-1.5 text-left text-sm transition-colors ${isSel ? "bg-primary text-primary-foreground" : "bg-glass/50 hover:bg-glass"} ${isToday && !isSel ? "ring-2 ring-accent" : ""}`}>
                  <span className={`font-semibold ${isToday && !isSel ? "text-accent" : ""}`}>{d.getDate()}</span>
                  {evs.slice(0, 2).map((e) => (
                    <span key={e.id} onClick={(ev) => { ev.stopPropagation(); setOpen(e); }} className={`mt-0.5 w-full truncate rounded px-1 text-[10px] ${isSel ? "bg-primary-foreground/20" : "bg-gold/20 text-foreground"}`}>{e.title}</span>
                  ))}
                  {evs.length > 2 && <span className="text-[10px]">+{evs.length - 2}</span>}
                </button>
              );
            })}
          </div>
        </div>
        <div className="glass p-5">
          <h2 className="text-xl font-semibold">{sel.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</h2>
          <div className="mt-4 space-y-3">
            {selEvents.length === 0 && <p className="text-sm text-muted-foreground">No free food on this day.</p>}
            {selEvents.map((e) => (
              <button key={e.id} onClick={() => setOpen(e)} className="block w-full rounded-lg bg-glass/60 p-3 text-left hover:bg-glass">
                <p className="font-mono text-xs text-primary">{e.start}–{e.end}</p>
                <p className="font-semibold">{e.title}</p>
                <p className="text-sm text-muted-foreground">{e.building}, {e.room}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
      <EventDetail event={open} onClose={() => setOpen(null)} />
    </>
  );
}
