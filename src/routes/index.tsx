import { roomLabel } from "@/lib/student-copy";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Bookmark, CalendarDays } from "lucide-react";
import type { Deal } from "@/lib/data";
import { useStore } from "@/lib/store";
import { DealDetail, EventDetail } from "@/components/ui-bits";
import { useFoodEventsQuery, type NormalizedFoodEvent } from "@/lib/food-events";
import { useDealsQuery } from "@/lib/deals";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Student Steals — Student deals & free food" },
      {
        name: "description",
        content:
          "Find student discounts, Starving Student Card offers, and campus free-food events.",
      },
      { property: "og:title", content: "Student Steals — Student deals & free food" },
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
    image: "/images/student-discounts.svg",
    imageClass: "object-contain bg-[#f7fbf4]",
  },
  {
    to: "/starving-student",
    title: "Starving Student Card",
    detail: "Browse offers included with your card.",
    note: "Card required",
    action: "Browse card offers",
    image: "/images/starving-student-card-2027.jpg",
    imageClass: "object-contain p-3 md:p-7",
  },
  {
    to: "/free-food",
    title: "Free food events",
    detail: "Find campus events with food provided.",
    note: "Check event requirements",
    action: "Find free food",
    image: "/images/free-food-pizza.jpg",
    imageClass: "object-cover",
  },
] as const;

export function Index() {
  const { savedDeals, savedEvents, user, authReady } = useStore();
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
    <div className="student-steals-theme relative -mx-4 rounded-b-[2rem] bg-[#f3f7f0] text-foreground px-4 py-6 sm:-mx-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <h1 id="home-title" className="sr-only">
          Student Steals: discounts, card offers, and free food
        </h1>
        <section aria-labelledby="discover-title">
          <h2 id="discover-title" className="sr-only">
            Three ways to save
          </h2>
          <div className="grid auto-rows-fr gap-3 md:grid-cols-3 md:gap-5">
            {paths.map(({ to, title, detail, note, action, image, imageClass }) => (
              <Link
                key={to}
                to={to}
                className={`group flex min-w-0 overflow-hidden rounded-3xl border-2 border-[#7b9a86] bg-[#042f23] text-white transition-shadow hover:shadow-lg md:flex-col ${focus}`}
              >
                <div className="relative w-24 shrink-0 overflow-hidden bg-[#e2eee1] min-[390px]:w-28 md:aspect-[16/10] md:w-full">
                  {to === "/starving-student" ? (
                    <div className="absolute inset-0 grid place-items-center overflow-hidden bg-[#dfebdc]">
                      <div className="aspect-[1.6] w-40 shrink-0 rotate-[-4deg] overflow-hidden rounded-lg shadow-[0_12px_24px_-8px_#042f2370] ring-1 ring-black/15 md:w-[88%]">
                        {/* The provider's fold-out preview prints the cover upside down.
                            Crop its cover with CSS, then orient the whole cover upright. */}
                        <div className="relative size-full rotate-180 overflow-hidden">
                          <img
                            src={image}
                            alt=""
                            width="972"
                            height="1440"
                            decoding="async"
                            className="absolute left-0 top-0 h-auto w-full max-w-none"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <img
                      src={image}
                      alt=""
                      width="900"
                      height="600"
                      decoding="async"
                      className={`absolute inset-0 size-full ${imageClass} transition-transform duration-300 motion-safe:group-hover:scale-[1.03]`}
                    />
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col p-4 md:p-5">
                  <h3 className="font-sans text-base font-extrabold leading-snug md:text-xl">
                    {title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-white/90 md:text-sm">{detail}</p>
                  <span className="mt-2 text-[11px] font-medium text-white/80">{note}</span>
                  <span className="mt-3 flex min-h-11 items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-[#042f23] md:mt-4 md:text-sm">
                    {action}
                    <ArrowRight
                      className="size-4 shrink-0 transition-transform motion-safe:group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
        <div className="mt-6 grid items-start gap-4 lg:grid-cols-2">
          <section
            aria-labelledby="today-title"
            className="rounded-3xl border-2 border-primary/45 bg-white p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2
                id="today-title"
                className="flex items-center gap-2 font-sans text-lg font-bold text-primary"
              >
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
                  {today.slice(0, 4).map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => setEvent(item)}
                        className={`flex h-full w-full items-start gap-3 rounded-2xl border border-primary/20 bg-[#eaf2e7] p-3 hover:bg-[#e0ecdc] text-left ${focus}`}
                      >
                        <span className="mt-0.5 shrink-0 rounded-lg bg-primary px-2 py-1 text-primary-foreground text-xs font-semibold">
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
                            {item.room ? ` · ${roomLabel(item.room)}` : ""}
                          </p>
                          <span className="mt-2 inline-block text-xs font-semibold text-primary">
                            View event →
                          </span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
                {today.length > 4 && (
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
          <section
            id="my-hub"
            aria-labelledby="hub-title"
            className="scroll-mt-24 rounded-3xl border-2 border-primary/45 bg-white p-4 shadow-sm sm:p-6"
          >
            <div className="flex items-center gap-3">
              <Bookmark className="size-5 text-primary" aria-hidden="true" />
              <h2 id="hub-title" className="font-sans text-xl font-bold text-primary">
                My Hub
              </h2>
              {authReady && user && savedCount > 0 && (
                <span className="ml-auto text-xs text-muted-foreground">{savedCount} saved</span>
              )}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Saved items currently stay on this browser.
            </p>
            {!authReady ? (
              <p role="status" className="py-5 text-sm text-muted-foreground">
                Checking your account…
              </p>
            ) : !user ? (
              <div className="mt-3">
                <p className="text-sm text-muted-foreground">
                  Sign in to see your saved discounts and events in My Hub.
                </p>
                <Link
                  to="/signin"
                  search={{ next: "hub" }}
                  className={`mt-3 inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground ${focus}`}
                >
                  Sign in
                </Link>
              </div>
            ) : hubLoading ? (
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
                    {showAllSaved
                      ? "Show fewer saved items"
                      : `Show all ${saved.length} saved items`}
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
        </div>

        <DealDetail deal={deal} onClose={() => setDeal(null)} />
        <EventDetail event={event} onClose={() => setEvent(null)} />
      </div>
    </div>
  );
}
