import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  Bookmark,
  CalendarDays,
  CreditCard,
  MapPin,
  Tag,
  Utensils,
} from "lucide-react";
import hero from "@/assets/hero.jpg";
import type { Deal } from "@/lib/data";
import { useStore } from "@/lib/store";
import { DealDetail, EventDetail } from "@/components/ui-bits";
import { useFoodEventsQuery, type NormalizedFoodEvent } from "@/lib/food-events";
import { useDealsQuery } from "@/lib/deals";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Studeats — Student deals & free food" },
      {
        name: "description",
        content:
          "Find student discounts, Starving Student Card offers, and campus free-food events.",
      },
      { property: "og:title", content: "Studeats — Student deals & free food" },
      { property: "og:description", content: "Three ways to save. One place to start." },
    ],
  }),
  component: Index,
});

const focus =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4";
const paths = [
  {
    to: "/discounts",
    title: "Student discounts",
    detail: "Online & local offers. Student eligibility varies.",
    icon: Tag,
    tone: "bg-primary/10 text-primary",
  },
  {
    to: "/starving-student",
    title: "Starving Student Card",
    detail: "Cardholder offers. An active card may be required.",
    icon: CreditCard,
    tone: "bg-accent/10 text-foreground",
  },
  {
    to: "/free-food",
    title: "Free food events",
    detail: "Find the food, time, building, and room.",
    icon: Utensils,
    tone: "bg-gold/15 text-foreground",
  },
] as const;

export function Index() {
  const { savedDeals, savedEvents, user } = useStore();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [event, setEvent] = useState<NormalizedFoodEvent | null>(null);
  const [showAllSaved, setShowAllSaved] = useState(false);
  const dealsQuery = useDealsQuery();
  const eventsQuery = useFoodEventsQuery();
  const deals = dealsQuery.data ?? [];
  const events = eventsQuery.data ?? [];
  const today = events.filter((item) => item.isToday);
  const savedCount = savedDeals.length + savedEvents.length;
  const saved = [
    ...deals
      .filter((item) => savedDeals.includes(item.id))
      .map((item) => ({
        key: `deal-${item.id}`,
        title: item.company,
        detail: item.value,
        kind: "Discount",
        open: () => setDeal(item),
      })),
    ...events
      .filter((item) => savedEvents.includes(item.id))
      .map((item) => ({
        key: `event-${item.id}`,
        title: item.title,
        detail: `${item.formattedDate} · ${item.start}`,
        kind: "Event",
        open: () => setEvent(item),
      })),
  ];
  const hubLoading =
    (savedDeals.length > 0 && dealsQuery.isPending) ||
    (savedEvents.length > 0 && eventsQuery.isPending);
  const hubError =
    (savedDeals.length > 0 && dealsQuery.isError) ||
    (savedEvents.length > 0 && eventsQuery.isError);
  const reloadSaved = () => {
    void dealsQuery.refetch();
    void eventsQuery.refetch();
  };

  return (
    <div className="mx-auto max-w-5xl pb-8">
      <section
        className="grid items-center gap-6 pb-5 pt-7 sm:py-10 lg:grid-cols-[1fr_320px]"
        aria-labelledby="home-title"
      >
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            For your student budget
          </p>
          <h1
            id="home-title"
            className="mt-2 font-display text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl"
          >
            Spend less.
            <br className="sm:hidden" /> Do more.
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
            Student discounts, card offers, and campus free food. Pick your next find.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <a
              href="#my-hub"
              className={`inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 font-semibold text-primary-foreground ${focus}`}
            >
              <Bookmark className="size-4" aria-hidden="true" />
              My Hub
              {savedCount > 0 && (
                <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs">{savedCount}</span>
              )}
            </a>
            <Link
              to="/map"
              className={`inline-flex min-h-11 items-center gap-2 rounded-full px-3 font-medium text-primary ${focus}`}
            >
              <MapPin className="size-4" aria-hidden="true" />
              Explore the map
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
        <img
          src={hero}
          alt="BYU campus in autumn"
          width={1280}
          height={853}
          className="hidden h-48 w-full rounded-3xl object-cover lg:block"
        />
      </section>

      <section aria-labelledby="discover-title">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="discover-title" className="font-sans text-sm font-semibold">
            Three ways to save
          </h2>
          <Link
            to="/help"
            className={`inline-flex min-h-11 items-center rounded text-xs font-medium text-primary underline underline-offset-4 ${focus}`}
          >
            How it works
          </Link>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-3">
          {paths.map(({ to, title, detail, icon: Icon, tone }) => (
            <Link
              key={to}
              to={to}
              className={`group flex min-w-0 items-center gap-3 rounded-2xl border border-white/80 bg-white/75 p-3.5 shadow-sm transition-colors hover:bg-white sm:flex-col sm:items-start sm:p-5 ${focus}`}
            >
              <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${tone}`}>
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-sans text-sm font-semibold">{title}</h3>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{detail}</p>
              </div>
              <ArrowRight className="size-4 shrink-0 text-primary sm:mt-2" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      <section
        id="my-hub"
        aria-labelledby="hub-title"
        className="mt-6 scroll-mt-24 rounded-3xl border border-white/80 bg-white/75 p-4 shadow-sm sm:p-6"
      >
        <div className="flex items-center gap-3">
          <Bookmark className="size-5 text-primary" aria-hidden="true" />
          <h2 id="hub-title" className="text-xl font-semibold">
            My Hub
          </h2>
          {savedCount > 0 && (
            <span className="ml-auto text-xs text-muted-foreground">{savedCount} saved</span>
          )}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {user
            ? "Your saved discounts and events, close at hand."
            : "Browse freely. Keep your favorite discounts and events here."}{" "}
          Saved items currently stay on this browser.
        </p>
        {hubLoading ? (
          <p role="status" className="py-5 text-sm text-muted-foreground">
            Loading your saved items…
          </p>
        ) : hubError ? (
          <div role="alert" className="mt-4 rounded-xl bg-secondary p-4">
            <p className="text-sm">
              Some saved items couldn’t load. Your selections haven’t been removed.
            </p>
            <button
              type="button"
              onClick={reloadSaved}
              className={`mt-2 min-h-11 rounded text-sm font-semibold text-primary underline ${focus}`}
            >
              Try saved items again
            </button>
          </div>
        ) : saved.length > 0 ? (
          <>
            <ul className="mt-3 divide-y divide-border">
              {(showAllSaved ? saved : saved.slice(0, 3)).map((item) => (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={item.open}
                    className={`flex min-h-16 w-full items-center gap-3 rounded-lg py-3 text-left ${focus}`}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                        {item.kind}
                      </span>
                      <h3 className="break-words font-sans text-sm font-semibold">{item.title}</h3>
                      <p className="mt-0.5 break-words text-xs text-muted-foreground">
                        {item.detail}
                      </p>
                    </div>
                    <ArrowRight className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
            {saved.length > 3 && (
              <button
                type="button"
                onClick={() => setShowAllSaved(!showAllSaved)}
                aria-expanded={showAllSaved}
                className={`mt-2 min-h-11 rounded text-sm font-semibold text-primary underline ${focus}`}
              >
                {showAllSaved ? "Show fewer saved items" : `Show all ${saved.length} saved items`}
              </button>
            )}
          </>
        ) : savedCount > 0 ? (
          <div className="mt-4 text-sm">
            <p>We couldn’t find these saved items in the current catalog.</p>
            <button
              type="button"
              onClick={reloadSaved}
              className={`mt-2 min-h-11 rounded font-semibold text-primary underline ${focus}`}
            >
              Try saved items again
            </button>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-primary/5 p-4">
            <div>
              <h3 className="font-sans text-sm font-semibold">Your next good find belongs here.</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Tap the save icon on a discount or event.
              </p>
            </div>
            <Link
              to="/discounts"
              className={`inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground ${focus}`}
            >
              Find a deal
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        )}
      </section>

      <section
        aria-labelledby="today-title"
        className="mt-6 rounded-3xl border border-white/70 bg-white/45 p-4 sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="today-title" className="flex items-center gap-2 text-xl font-semibold">
            <CalendarDays className="size-5 text-primary" aria-hidden="true" />
            Today on campus
          </h2>
          <Link
            to="/calendar"
            className={`inline-flex min-h-11 items-center gap-1 rounded text-xs font-semibold text-primary ${focus}`}
          >
            Calendar
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        {eventsQuery.isPending ? (
          <p role="status" className="mt-3 text-sm text-muted-foreground">
            Checking today’s events…
          </p>
        ) : eventsQuery.isError ? (
          <div role="alert">
            <p className="mt-3 text-sm">Today’s events couldn’t load.</p>
            <button
              type="button"
              onClick={() => void eventsQuery.refetch()}
              className={`min-h-11 rounded text-sm font-semibold text-primary underline ${focus}`}
            >
              Retry events
            </button>
          </div>
        ) : today.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Nothing listed for today.{" "}
            <Link to="/calendar" className={`rounded font-medium text-primary underline ${focus}`}>
              See what’s coming up.
            </Link>
          </p>
        ) : (
          <>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {today.slice(0, 2).map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setEvent(item)}
                    className={`flex h-full w-full items-start gap-3 rounded-2xl bg-white/80 p-3 text-left ${focus}`}
                  >
                    <span className="mt-0.5 shrink-0 rounded-lg bg-gold/15 px-2 py-1 text-xs font-semibold">
                      {item.start}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="break-words font-sans text-sm font-semibold">{item.title}</h3>
                      <p className="mt-1 break-words text-xs text-muted-foreground">{item.food}</p>
                      <p className="mt-1 break-words text-xs text-muted-foreground">
                        {item.building}
                        {item.room ? ` · ${item.room}` : ""}
                      </p>
                      <span className="mt-2 inline-block text-xs font-semibold text-primary">
                        View event →
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
            {today.length > 2 && (
              <Link
                to="/free-food"
                className={`mt-2 inline-flex min-h-11 items-center rounded text-xs font-semibold text-primary underline ${focus}`}
              >
                See all {today.length} events today
              </Link>
            )}
          </>
        )}
      </section>
      <DealDetail deal={deal} onClose={() => setDeal(null)} />
      <EventDetail event={event} onClose={() => setEvent(null)} />
    </div>
  );
}
