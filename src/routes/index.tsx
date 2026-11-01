import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import hero from "@/assets/hero.jpg";
import { type Deal } from "@/lib/data";
import { useStore } from "@/lib/store";
import { DealDetail, EventDetail, chipTone } from "@/components/ui-bits";
import { useFoodEventsQuery, type NormalizedFoodEvent, getLocalDateString } from "@/lib/food-events";
import { useDealsQuery } from "@/lib/deals";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Studeats — Campus deals, all in one place" },
      { name: "description", content: "Student discounts, Starving Student Card deals and free campus food in one place." },
      { property: "og:title", content: "Studeats — Campus deals, all in one place" },
      { property: "og:description", content: "Discounts, free food, and local student perks all in one place." },
    ],
  }),
  component: Index,
});

export function Index() {
  const { savedDeals } = useStore();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [ev, setEv] = useState<NormalizedFoodEvent | null>(null);

  const { data: foodEvents = [] } = useFoodEventsQuery();
  const { data: deals = [] } = useDealsQuery();

  // Strict check for events happening today (local timezone YYYY-MM-DD match)
  const todayStr = getLocalDateString(new Date());
  const today = foodEvents.filter((e) => {
    return e.isToday || (e as any).event_date === todayStr;
  });

  // User's saved deals for My Hub
  const hubDeals = deals.filter((d) => savedDeals.includes(d.id));

  // Pick top featured deals (prioritizing AI, curated tech perks, and local BYU/Provo favorites)
  const featuredDeals = deals
    .filter((d) => ["AI", "Tech", "Food"].includes(d.category) && (d.isNew || d.type === "Free" || d.value.includes("%")))
    .slice(0, 6);

  return (
    <>
      {/* 1. Hero Section */}
      <section className="grid items-center gap-10 py-10 lg:grid-cols-2 lg:py-16">
        <div className="rise">
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-primary ring-1 ring-border">
            <span className="size-2 rounded-full bg-primary animate-pulse" />
            <span>The bulletin board for broke students</span>
          </div>

          <h1 className="mt-5 max-w-[18ch] text-balance font-display text-5xl font-semibold leading-[1.05] tracking-tight xl:text-6xl">
            Campus deals, all in one place.
          </h1>

          <p className="mt-5 max-w-[48ch] text-base text-muted-foreground leading-relaxed">
            Verified student discounts, free campus food drops, and local Provo dining deals — all updated daily so you never pay full price again.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to="/discounts"
              className="inline-flex items-center gap-1 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
            >
              Browse 100+ deals →
            </Link>
            <Link
              to="/free-food"
              className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-4 py-2.5 text-sm font-medium ring-1 ring-border hover:bg-glass transition-colors"
            >
              <span>🍕</span>
              <span>Find free food</span>
            </Link>
            <Link
              to="/map"
              className="inline-flex items-center rounded-full bg-secondary px-4 py-2.5 text-sm font-medium ring-1 ring-border hover:bg-glass transition-colors"
            >
              Campus map
            </Link>
          </div>

          <div className="mt-8 flex items-center gap-6 text-xs text-muted-foreground">
            <div><strong className="font-semibold text-foreground">{deals.length > 0 ? `${deals.length}+` : "100+"}</strong> Active Deals</div>
            <div className="size-1 rounded-full bg-muted-foreground/40" />
            <div><strong className="font-semibold text-foreground">Scraped Daily</strong> at 3 AM</div>
            <div className="size-1 rounded-full bg-muted-foreground/40" />
            <div><strong className="font-semibold text-foreground">BYU & Provo</strong> Verified</div>
          </div>
        </div>

        {/* Real BYU Campus Photo Hero */}
        <div className="relative">
          <div className="glass rounded-[20px] p-3 shadow-float overflow-hidden">
            <img
              src={hero}
              alt="Brigham Young University campus quad in autumn, Provo Utah"
              width={1280}
              height={853}
              className="aspect-[4/3] w-full rounded-[14px] object-cover transition-transform duration-500 hover:scale-[1.02]"
              loading="eager"
            />
          </div>

          {/* Location pill */}
          <div className="absolute left-6 bottom-6 rounded-full bg-background/80 px-3 py-1 text-xs font-medium backdrop-blur-md shadow-sm ring-1 ring-border">
            📍 Brigham Young University · Provo, UT
          </div>

          {/* Today badge over hero image if events exist */}
          {today[0] && (
            <div className="absolute -right-2 top-4 w-52 rotate-[3deg] rounded-xl bg-popover/95 p-3.5 shadow-note backdrop-blur-md ring-1 ring-border">
              <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-semibold text-gold">
                Happening Today
              </span>
              <p className="mt-1.5 text-xs font-semibold leading-tight line-clamp-1">{today[0].title}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{today[0].building} · {today[0].start}</p>
              <button
                onClick={() => setEv(today[0])}
                className="mt-2 text-[11px] font-medium text-primary hover:underline"
              >
                View event details →
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 2. How StudEats Works (Near the Top, with direct page links) */}
      <section className="py-8 border-y border-border/50">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Fast & Free</span>
            <h2 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight">How StudEats Works</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-xs text-muted-foreground mr-1">Direct links:</span>
            <Link
              to="/discounts"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
            >
              🏷️ Student Deals
            </Link>
            <Link
              to="/starving-student"
              className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/20 transition-colors"
            >
              💳 Starving Student Card
            </Link>
            <Link
              to="/free-food"
              className="inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-3 py-1.5 text-xs font-medium text-gold hover:bg-gold/25 transition-colors"
            >
              🍕 Free Food Page
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Link
            to="/discounts"
            className="glass group p-5 transition-transform hover:-translate-y-1 block text-left"
          >
            <div className="flex items-center justify-between">
              <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-xl text-primary group-hover:scale-110 transition-transform">
                🏷️
              </span>
              <span className="text-xs font-medium text-primary group-hover:underline">Open Deals →</span>
            </div>
            <h3 className="mt-3.5 font-semibold text-base">1. Automated Daily Scraper</h3>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              Every morning at 3 AM, our automated scraper harvests verified student deals from ID.me, developer tools, and Provo campus eateries.
            </p>
          </Link>

          <Link
            to="/free-food"
            className="glass group p-5 transition-transform hover:-translate-y-1 block text-left"
          >
            <div className="flex items-center justify-between">
              <span className="grid size-11 place-items-center rounded-xl bg-gold/15 text-xl text-gold group-hover:scale-110 transition-transform">
                🍕
              </span>
              <span className="text-xs font-medium text-gold group-hover:underline">Find Food →</span>
            </div>
            <h3 className="mt-3.5 font-semibold text-base">2. Campus Free Food Drops</h3>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              Never miss club pizza, bagel bars, and department donut socials happening today in buildings across the BYU campus.
            </p>
          </Link>

          <Link
            to="/starving-student"
            className="glass group p-5 transition-transform hover:-translate-y-1 block text-left"
          >
            <div className="flex items-center justify-between">
              <span className="grid size-11 place-items-center rounded-xl bg-accent/10 text-xl text-accent group-hover:scale-110 transition-transform">
                💳
              </span>
              <span className="text-xs font-medium text-accent group-hover:underline">Card Hub →</span>
            </div>
            <h3 className="mt-3.5 font-semibold text-base">3. Starving Student Card</h3>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              Browse card discounts, track which free meals and coupons you've redeemed, and claim savings across Utah County.
            </p>
          </Link>
        </div>
      </section>

      {/* 3. Today on Campus Section */}
      <section className="py-8">
        <div className="glass rounded-[20px] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-gold animate-ping" />
                <h2 className="text-xl font-semibold tracking-tight">Today on Campus</h2>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </p>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Link to="/calendar" className="font-medium text-primary hover:underline">
                View weekly calendar →
              </Link>
            </div>
          </div>

          <div className="mt-5">
            {today.length === 0 ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl bg-secondary/50 p-4 ring-1 ring-border">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-lg bg-muted text-xl">📅</span>
                  <div>
                    <h3 className="text-sm font-semibold">No free food events scheduled for today</h3>
                    <p className="text-xs text-muted-foreground">
                      Check upcoming campus events on the calendar or browse active discounts below.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to="/calendar"
                    className="rounded-full bg-secondary px-3 py-1.5 text-xs font-medium ring-1 ring-border hover:bg-glass"
                  >
                    Open Calendar
                  </Link>
                  <Link
                    to="/free-food"
                    className="rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    All Free Food
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {today.map((e, i) => (
                  <div
                    key={e.id}
                    onClick={() => setEv(e)}
                    className="group cursor-pointer rounded-xl bg-secondary/50 p-4 ring-1 ring-border transition-all hover:bg-secondary hover:shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${chipTone(i)}`}>
                        {e.start}
                      </span>
                      <span className="text-[11px] font-medium text-gold bg-gold/15 px-2 py-0.5 rounded-full">
                        {e.food}
                      </span>
                    </div>
                    <h4 className="mt-2 text-sm font-semibold group-hover:text-primary transition-colors">
                      {e.title}
                    </h4>
                    <p className="mt-1 text-xs text-muted-foreground">
                      📍 {e.building}{e.room ? `, ${e.room}` : ""}
                    </p>
                    <span className="mt-3 inline-block text-xs font-medium text-primary">
                      Details & map →
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 4. My Hub Section (Saved Deals) */}
      <section className="py-8">
        <div className="flex items-end justify-between">
          <div>
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Personal Collection</span>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">My Hub</h2>
          </div>
          {hubDeals.length > 0 && (
            <Link to="/discounts" className="text-xs font-medium text-primary hover:underline">
              {hubDeals.length} saved {hubDeals.length === 1 ? "deal" : "deals"} · Browse more →
            </Link>
          )}
        </div>

        {hubDeals.length === 0 ? (
          <div className="glass mt-4 rounded-2xl p-8 text-center border-dashed border-2 border-border/80">
            <span className="text-3xl">⭐</span>
            <h3 className="mt-2 text-base font-semibold">Your Hub is empty</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
              Save your favorite discounts for quick access whenever you need them.
            </p>
            <Link
              to="/discounts"
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
            >
              <span>Click here to save favorites →</span>
            </Link>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {hubDeals.map((d, i) => (
              <div key={d.id} className="glass group relative p-5 transition-transform hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${chipTone(i)}`}>
                    {d.category}
                  </span>
                  <span className="text-xs font-semibold text-accent">{d.value}</span>
                </div>
                <h4 className="mt-3 text-lg font-semibold group-hover:text-primary transition-colors">{d.title}</h4>
                <p className="text-xs font-medium text-muted-foreground">{d.company}</p>
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{d.description}</p>
                <div className="mt-4 flex items-center justify-between pt-3 border-t border-border/50">
                  <button
                    onClick={() => setDeal(d)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    View deal details →
                  </button>
                  <Link to="/discounts" className="text-xs text-muted-foreground hover:text-foreground">
                    Manage in Dashboard
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 5. Verified Discounts (Popular Student Perks & AI Tools) */}
      <section className="py-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Top Picks</span>
            <h2 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight">Verified Discounts</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Popular Student Perks & AI Tools</p>
          </div>
          <Link to="/discounts" className="text-sm font-medium text-primary hover:underline">
            View all {deals.length > 0 ? `${deals.length} deals` : "deals"} →
          </Link>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featuredDeals.map((d, i) => (
            <div
              key={d.id}
              className="glass group relative flex flex-col justify-between overflow-hidden p-5 transition-transform hover:-translate-y-1"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${chipTone(i)}`}>
                    {d.category}
                  </span>
                  <span className="text-xs font-semibold text-accent">{d.value}</span>
                </div>
                <h3 className="mt-3 text-lg font-semibold group-hover:text-primary transition-colors">{d.title}</h3>
                <p className="text-xs font-medium text-muted-foreground">{d.company}</p>
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{d.description}</p>
              </div>

              <div className="mt-5 flex items-center justify-between pt-3 border-t border-border/50">
                <button
                  onClick={() => setDeal(d)}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                >
                  View perk →
                </button>
                {d.url && (
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Direct link ↗
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Obvious Explore More Button at the bottom */}
        <div className="mt-10 flex justify-center">
          <Link
            to="/discounts"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground shadow-md hover:bg-primary/90 hover:scale-[1.02] transition-all"
          >
            <span>Explore all {deals.length > 0 ? `${deals.length}+` : "100+"} student discounts</span>
            <span className="text-lg">→</span>
          </Link>
        </div>
      </section>

      <DealDetail deal={deal} onClose={() => setDeal(null)} />
      <EventDetail event={ev} onClose={() => setEv(null)} />
    </>
  );
}
