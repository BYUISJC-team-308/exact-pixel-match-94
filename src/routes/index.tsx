import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import hero from "@/assets/hero.jpg";
import { ssDeals, type Deal } from "@/lib/data";
import { useStore } from "@/lib/store";
import { DealDetail, EventDetail, chipTone } from "@/components/ui-bits";
import { useFoodEventsQuery, type NormalizedFoodEvent } from "@/lib/food-events";
import { useDealsQuery } from "@/lib/deals";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Studeats — Everything cheap on campus, one board" },
      { name: "description", content: "Student discounts, Starving Student Card deals and free campus food, saved in your personal hub." },
      { property: "og:title", content: "Studeats — Everything cheap on campus" },
      { property: "og:description", content: "Discounts, free food and the deals worth pinning, all in one place." },
    ],
  }),
  component: Index,
});

function Index() {
  const { savedDeals, savedEvents } = useStore();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [ev, setEv] = useState<NormalizedFoodEvent | null>(null);

  const { data: foodEvents = [] } = useFoodEventsQuery();
  const { data: deals = [] } = useDealsQuery();

  const hubDeals = deals.filter((d) => savedDeals.includes(d.id));
  const hubEvents = foodEvents.filter((e) => savedEvents.includes(e.id));
  const today = foodEvents.filter((e) => e.isToday);

  const features = [
    { to: "/discounts", icon: "🏷️", tone: "bg-primary/10 text-primary", stat: `${deals.length} active`, title: "Discount Dashboard", desc: "Every student code and price cut — filter by category, search, and save the ones you want." },
    { to: "/starving-student", icon: "💳", tone: "bg-accent/10 text-accent", stat: `${ssDeals.length} card deals`, title: "Starving Student Card Hub", desc: "All your Starving Student Card deals, sorted by free vs. discount, with a tracker for what you've used." },
    { to: "/free-food", icon: "🍕", tone: "bg-gold/15 text-gold", stat: `${foodEvents.length} this week`, title: "Free Food Near Me", desc: "Free food happening on campus today and this week, with times, buildings and room numbers." },
  ] as const;

  return (
    <>
      <section className="grid items-center gap-10 py-14 lg:grid-cols-2 lg:py-20">
        <div className="rise">
          <span className="inline-flex rounded-full bg-secondary px-3 py-1 text-xs font-medium text-primary ring-1 ring-border">The bulletin board for broke students</span>
          <h1 className="mt-5 max-w-[18ch] text-balance text-5xl font-semibold leading-[1.03] tracking-tight xl:text-6xl">Everything cheap on campus, one board.</h1>
          <p className="mt-5 max-w-[48ch] text-muted-foreground">Discounts, free food, and the deals worth pinning — saved in one place so you never miss a free pizza again.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/free-food" className="inline-flex items-center gap-1 rounded-full bg-primary py-2 pl-4 pr-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">Find free food today →</Link>
            <Link to="/map" className="inline-flex items-center rounded-full bg-secondary py-2 px-4 text-sm font-medium ring-1 ring-border hover:bg-glass">Open campus map</Link>
          </div>
        </div>
        <div className="relative">
          <div className="glass rounded-[16px] p-4 shadow-float">
            <img src={hero} alt="Campus quad with a bulletin board full of flyers" width={1200} height={912} className="aspect-[4/3] w-full rounded-[12px] object-cover" />
          </div>
          {today[0] && (
            <div className="absolute -right-3 top-6 w-44 rotate-[5deg] rounded-xl bg-popover/90 p-3 shadow-note backdrop-blur-md">
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">Happening today</span>
              <p className="mt-1 text-xs font-semibold">{today[0].title}</p>
              <p className="text-[11px] text-muted-foreground">{today[0].building} · {today[0].start}</p>
            </div>
          )}
        </div>
      </section>

      <section className="py-4">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">Explore the board</h2>
          <span className="text-sm text-muted-foreground">Also: <Link to="/calendar" className="text-primary hover:underline">Calendar</Link> · <Link to="/map" className="text-primary hover:underline">Map</Link></span>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {features.map((f) => (
            <Link key={f.to} to={f.to} className="glass p-5 transition-transform hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <span className={`grid size-10 place-items-center rounded-lg ${f.tone}`}>{f.icon}</span>
                <span className="text-xs font-medium text-muted-foreground">{f.stat}</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="py-12">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">Your Hub</h2>
          <span className="text-sm text-muted-foreground">Pinned by you</span>
        </div>
        {hubDeals.length + hubEvents.length === 0 ? (
          <div className="glass mt-5 p-6 text-sm text-muted-foreground">Nothing pinned yet. Save deals from the <Link to="/discounts" className="text-primary underline">Discount Dashboard</Link> or events from <Link to="/free-food" className="text-primary underline">Free Food Near Me</Link>.</div>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {hubDeals.map((d, i) => (
              <div key={d.id} className="glass p-5">
                <div className="flex items-center justify-between"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${chipTone(i)}`}>{d.category}</span><span className="text-xs font-medium text-muted-foreground">{d.value}</span></div>
                <h3 className="mt-3 text-lg font-semibold">{d.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{d.description}</p>
                <button onClick={() => setDeal(d)} className="mt-4 inline-flex items-center gap-1 rounded-full bg-primary py-2 pl-4 pr-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">View deal →</button>
              </div>
            ))}
            {hubEvents.map((e) => (
              <div key={e.id} className="glass p-5">
                <div className="flex items-center justify-between"><span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs font-medium text-gold">Free food</span><span className="text-xs font-medium text-muted-foreground">{e.start}</span></div>
                <h3 className="mt-3 text-lg font-semibold">{e.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{e.building}{e.room ? `, ${e.room}` : ""}</p>
                <button onClick={() => setEv(e)} className="mt-4 inline-flex items-center gap-1 rounded-full bg-primary py-2 pl-4 pr-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">View event →</button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="pb-8">
        <div className="glass rounded-[16px] p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight">Today on Campus:</h2>
            <Link to="/calendar" className="text-sm font-medium text-primary hover:underline">Open calendar →</Link>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            {today.length === 0 && <p className="text-sm text-muted-foreground">No events scheduled today.</p>}
            {today.map((e, i) => (
              <Link key={e.id} to="/calendar" className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium hover:opacity-80 ${chipTone(i)}`}>
                <span>{e.start}</span><span>{e.title} · {e.building}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <DealDetail deal={deal} onClose={() => setDeal(null)} />
      <EventDetail event={ev} onClose={() => setEv(null)} />
    </>
  );
}
