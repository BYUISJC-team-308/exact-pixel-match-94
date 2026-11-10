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
  CircleHelp,
} from "lucide-react";
import type { Deal, SSDeal } from "@/lib/data";
import { useStore } from "@/lib/store";
import { DealDetail, EventDetail, SSDetail } from "@/components/ui-bits";
import { useFoodEventsQuery, type NormalizedFoodEvent } from "@/lib/food-events";
import { useDealsQuery } from "@/lib/deals";
import { useHomepageCardOffersQuery } from "@/lib/starving-student";

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
    detail: "Offers on food, tech, travel, and more.",
    note: "Check student eligibility",
    action: "Browse discounts",
    icon: Tag,
    tone: "bg-[#e4f1e9] text-[#174d3b] border-[#c9dfd1]",
    iconTone: "bg-[#174d3b] text-white",
  },
  {
    to: "/starving-student",
    title: "Starving Student Card",
    detail: "Browse offers included with your card.",
    note: "For cardholders",
    action: "Browse card offers",
    icon: CreditCard,
    tone: "bg-[#fff0db] text-[#70431c] border-[#eddbbf]",
    iconTone: "bg-[#85532c] text-white",
  },
  {
    to: "/free-food",
    title: "Free food events",
    detail: "See what's on, what's served, and where to go.",
    note: "Check event requirements",
    action: "Find free food",
    icon: Utensils,
    tone: "bg-[#edeafb] text-[#493b75] border-[#dad4ed]",
    iconTone: "bg-[#5b4a8a] text-white",
  },
] as const;

export function Index() {
  const { savedDeals, savedEvents } = useStore();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [event, setEvent] = useState<NormalizedFoodEvent | null>(null);
  const [showAllSaved, setShowAllSaved] = useState(false);
  const dealsQuery = useDealsQuery();
  const eventsQuery = useFoodEventsQuery();
  const cardQuery = useHomepageCardOffersQuery();
  const [cardOffer, setCardOffer] = useState<SSDeal | null>(null);
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

  const discountExample = deals[0];
  const cardExample = cardQuery.data?.[0];

  return (
    <div className="relative -mx-4 rounded-b-[2rem] bg-[#f7f8f4] px-4 py-6 sm:-mx-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-5 sm:mb-7">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Choose your way to save
          </p>
          <h1
            id="home-title"
            className="mt-2 max-w-3xl text-3xl font-semibold leading-[1.12] tracking-tight sm:text-5xl"
          >
            Discounts, card offers &amp; free food.
          </h1>
        </header>
        <section aria-labelledby="discover-title">
          <h2 id="discover-title" className="sr-only">
            Three ways to save
          </h2>
          <div className="grid auto-rows-fr gap-3 md:grid-cols-3">
            {paths.map(({ to, title, detail, note, action, icon: Icon, tone, iconTone }) => (
              <Link
                key={to}
                to={to}
                className={`group relative flex min-w-0 items-center gap-3 rounded-3xl border p-4 transition-shadow hover:shadow-md md:flex-col md:items-start md:gap-5 md:p-6 ${tone} ${focus}`}
              >
                <span
                  className={`grid size-12 shrink-0 place-items-center rounded-2xl md:size-14 ${iconTone}`}
                >
                  <Icon className="size-6 md:size-7" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-sans text-base font-bold leading-snug md:text-xl">{title}</h3>
                  <p className="mt-1 max-w-xs text-xs leading-relaxed opacity-85 md:text-sm">
                    {detail}
                  </p>
                  <span className="mt-2 block text-[11px] font-medium opacity-75">{note}</span>
                </div>
                <span className="hidden min-h-11 w-full items-center justify-between border-t border-current/15 pt-3 text-sm font-semibold md:flex">
                  {action}
                  <ArrowRight className="size-5" aria-hidden="true" />
                </span>
                <ArrowRight className="size-5 shrink-0 md:hidden" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
        <nav
          aria-label="Homepage shortcuts"
          className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border pb-4 text-xs font-semibold text-primary sm:gap-x-5"
        >
          <Link
            to="/map"
            className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg ${focus}`}
          >
            <MapPin className="size-4" aria-hidden="true" />
            Map
          </Link>
          <Link
            to="/calendar"
            className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg ${focus}`}
          >
            <CalendarDays className="size-4" aria-hidden="true" />
            Calendar
          </Link>
          <a
            href="#my-hub"
            className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg ${focus}`}
          >
            <Bookmark className="size-4" aria-hidden="true" />
            My Hub
            {savedCount > 0 && (
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px]">
                {savedCount}
              </span>
            )}
          </a>
          <Link
            to="/help"
            className={`ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-lg ${focus}`}
          >
            <CircleHelp className="size-4" aria-hidden="true" />
            How it works
          </Link>
        </nav>

        <div className="mb-3 mt-6 flex flex-wrap items-baseline justify-between gap-1">
          <h2 className="text-xl font-semibold sm:text-2xl">A look at the listings</h2>
          <p className="text-xs text-muted-foreground">
            Open a listing for its details and requirements.
          </p>
        </div>
        <div className="grid items-start gap-3 lg:grid-cols-3">
          <section
            aria-labelledby="discount-preview"
            className="rounded-3xl border border-border bg-white p-4 sm:p-5"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 id="discount-preview" className="text-lg font-semibold">
                Student discounts
              </h2>
              <Tag className="size-4 shrink-0 text-primary" aria-hidden="true" />
            </div>
            {dealsQuery.isPending ? (
              <p role="status" className="py-4 text-sm text-muted-foreground">
                Loading a discount…
              </p>
            ) : dealsQuery.isError ? (
              <div role="alert">
                <p className="mt-3 text-sm">Discounts couldn’t load.</p>
                <button
                  onClick={() => void dealsQuery.refetch()}
                  className={`min-h-11 rounded text-sm font-semibold text-primary underline ${focus}`}
                >
                  Retry discounts
                </button>
              </div>
            ) : discountExample ? (
              <button
                type="button"
                onClick={() => setDeal(discountExample)}
                className={`mt-3 w-full rounded-2xl bg-[#f5f7f3] p-4 text-left ${focus}`}
              >
                <span className="text-xs font-semibold text-primary">
                  {discountExample.company}
                </span>
                <h3 className="mt-1 font-sans text-base font-bold leading-snug">
                  {discountExample.value}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {discountExample.title}
                </p>
                <span className="mt-3 inline-flex min-h-6 items-center gap-1 text-xs font-semibold text-primary">
                  View discount
                  <ArrowRight className="size-3" aria-hidden="true" />
                </span>
              </button>
            ) : (
              <p className="py-4 text-sm text-muted-foreground">
                No discounts are listed right now.
              </p>
            )}
            <Link
              to="/discounts"
              className={`mt-2 inline-flex min-h-11 items-center gap-1 rounded text-xs font-semibold text-primary ${focus}`}
            >
              All student discounts
              <ArrowRight className="size-3" aria-hidden="true" />
            </Link>
          </section>
          <section
            aria-labelledby="card-preview"
            className="rounded-3xl border border-border bg-white p-4 sm:p-5"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 id="card-preview" className="text-lg font-semibold">
                Card offers
              </h2>
              <CreditCard className="size-4 shrink-0 text-primary" aria-hidden="true" />
            </div>
            {cardQuery.isPending ? (
              <p role="status" className="py-4 text-sm text-muted-foreground">
                Loading a card offer…
              </p>
            ) : cardQuery.isError ? (
              <div role="alert">
                <p className="mt-3 text-sm">Card offers couldn’t load.</p>
                <button
                  onClick={() => void cardQuery.refetch()}
                  className={`min-h-11 rounded text-sm font-semibold text-primary underline ${focus}`}
                >
                  Retry card offers
                </button>
              </div>
            ) : cardExample ? (
              <button
                type="button"
                onClick={() => setCardOffer(cardExample)}
                className={`mt-3 w-full rounded-2xl bg-[#fbf5eb] p-4 text-left ${focus}`}
              >
                <span className="text-xs font-semibold text-[#70431c]">{cardExample.company}</span>
                <h3 className="mt-1 font-sans text-base font-bold leading-snug">
                  {cardExample.item}
                </h3>
                <p className="mt-2 text-xs text-muted-foreground">
                  Check the official card terms before using an offer.
                </p>
                <span className="mt-3 inline-flex min-h-6 items-center gap-1 text-xs font-semibold text-primary">
                  View card offer
                  <ArrowRight className="size-3" aria-hidden="true" />
                </span>
              </button>
            ) : (
              <p className="py-4 text-sm text-muted-foreground">
                No card offers are listed right now.
              </p>
            )}
            <Link
              to="/starving-student"
              className={`mt-2 inline-flex min-h-11 items-center gap-1 rounded text-xs font-semibold text-primary ${focus}`}
            >
              All card offers
              <ArrowRight className="size-3" aria-hidden="true" />
            </Link>
          </section>
          <section
            aria-labelledby="today-title"
            className="rounded-3xl border border-border bg-white p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="today-title" className="flex items-center gap-2 text-lg font-semibold">
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
                <Link
                  to="/calendar"
                  className={`rounded font-medium text-primary underline ${focus}`}
                >
                  See what’s coming up.
                </Link>
              </p>
            ) : (
              <>
                <ul className="mt-2 grid gap-2">
                  {today.slice(0, 2).map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => setEvent(item)}
                        className={`flex h-full w-full items-start gap-3 rounded-2xl bg-[#f5f7f3] p-3 text-left ${focus}`}
                      >
                        <span className="mt-0.5 shrink-0 rounded-lg bg-gold/15 px-2 py-1 text-xs font-semibold">
                          {item.start}
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="break-words font-sans text-sm font-semibold">
                            {item.title}
                          </h3>
                          <p className="mt-1 break-words text-xs text-muted-foreground">
                            {item.food}
                          </p>
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
        </div>
        <section
          id="my-hub"
          aria-labelledby="hub-title"
          className="mt-6 scroll-mt-24 rounded-3xl border border-border bg-white p-4 shadow-sm sm:p-6"
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
                        <h3 className="break-words font-sans text-sm font-semibold">
                          {item.title}
                        </h3>
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
            <p className="mt-2 text-sm text-muted-foreground">
              Tap the save icon on a discount or event to add it here.
            </p>
          )}
        </section>

        <DealDetail deal={deal} onClose={() => setDeal(null)} />
        <SSDetail deal={cardOffer} onClose={() => setCardOffer(null)} />
        <EventDetail event={event} onClose={() => setEvent(null)} />
      </div>
    </div>
  );
}
