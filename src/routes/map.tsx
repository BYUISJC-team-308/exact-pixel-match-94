import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { foodEvents, ssDeals, type FoodEvent, type SSDeal } from "@/lib/data";
import { useStore } from "@/lib/store";
import { EventDetail, FilterChips, PageHeader, SSDetail } from "@/components/ui-bits";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Interactive Map — Studeats" },
      { name: "description", content: "Map of Starving Student Card discount locations and free food events near campus." },
      { property: "og:title", content: "Interactive Map — Studeats" },
      { property: "og:description", content: "See discounts and free food on one map." },
    ],
  }),
  component: MapPage,
});

const filters = ["Everything", "Free food", "All discounts", "Food", "Coffee", "Entertainment", "Services"] as const;

function MapPage() {
  const { usedSS } = useStore();
  const [f, setF] = useState<(typeof filters)[number]>("Everything");
  const [ss, setSS] = useState<SSDeal | null>(null);
  const [ev, setEv] = useState<FoodEvent | null>(null);
  const showFood = f === "Everything" || f === "Free food";
  const pins = ssDeals.filter((d) => f === "Everything" || f === "All discounts" || d.category === f);
  const events = showFood ? foodEvents.filter((e) => e.dayOffset >= 0 && e.dayOffset < 7) : [];

  return (
    <>
      <PageHeader eyebrow="Discounts + free food" title="Interactive Map">
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-2"><span className="size-3 rounded-full bg-accent" /> Card discount</span>
          <span className="flex items-center gap-2"><span className="size-3 rotate-45 bg-gold" /> Free food</span>
        </div>
      </PageHeader>
      <FilterChips options={filters} value={f} onChange={setF} />
      <div className="glass relative mt-6 aspect-[16/10] w-full overflow-hidden rounded-[16px] p-0">
        <svg className="absolute inset-0 size-full" viewBox="0 0 100 62.5" preserveAspectRatio="none" aria-hidden="true">
          <rect width="100" height="62.5" fill="var(--muted)" opacity="0.5" />
          <rect x="30" y="18" width="40" height="26" rx="2" fill="var(--primary)" opacity="0.12" />
          <text x="50" y="32" textAnchor="middle" fontSize="2.5" fill="var(--primary)" opacity="0.6">CAMPUS</text>
          {[12, 30, 50].map((y) => <rect key={y} x="0" y={y} width="100" height="1.4" fill="var(--glass)" />)}
          {[20, 45, 72].map((x) => <rect key={x} x={x} y="0" width="1.4" height="62.5" fill="var(--glass)" />)}
          <circle cx="12" cy="52" r="5" fill="var(--primary)" opacity="0.15" />
        </svg>
        {pins.map((d) => {
          const used = usedSS.includes(d.id);
          return (
            <button key={d.id} onClick={() => setSS(d)} style={{ left: `${d.x}%`, top: `${d.y}%` }} title={`${d.company} — ${d.value}`}
              className={`group absolute -translate-x-1/2 -translate-y-1/2 transition-opacity ${used ? "opacity-35" : ""}`}>
              <span className="grid size-9 place-items-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground shadow-note ring-2 ring-glass">{used ? "✓" : d.value.slice(0, 4)}</span>
              <span className="pointer-events-none absolute left-1/2 top-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-popover px-2 py-1 text-xs shadow-note group-hover:block">{d.company}: {d.item}</span>
            </button>
          );
        })}
        {events.map((e) => (
          <button key={e.id} onClick={() => setEv(e)} style={{ left: `${e.x}%`, top: `${e.y}%` }} title={e.title} className="group absolute -translate-x-1/2 -translate-y-1/2">
            <span className="grid size-8 rotate-45 place-items-center rounded-md bg-gold shadow-note ring-2 ring-glass"><span className="-rotate-45 text-sm">🍕</span></span>
            <span className="pointer-events-none absolute left-1/2 top-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-popover px-2 py-1 text-xs shadow-note group-hover:block">{e.title}</span>
          </button>
        ))}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">Tap a pin for details, directions, and to mark card deals as used.</p>
      <SSDetail deal={ss} onClose={() => setSS(null)} />
      <EventDetail event={ev} onClose={() => setEv(null)} />
    </>
  );
}
