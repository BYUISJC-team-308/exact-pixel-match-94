import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { actions, useStore } from "@/lib/store";
import { EventDetail, PageHeader, Btn } from "@/components/ui-bits";
import {
  useFoodEventsQuery,
  type NormalizedFoodEvent,
  type FoodEventCategory,
} from "@/lib/food-events";
import { SubmitFoodEventModal } from "@/components/SubmitFoodEventModal";

export const Route = createFileRoute("/free-food")({
  head: () => ({
    meta: [
      { title: "Free Food Near Me — Studeats" },
      {
        name: "description",
        content:
          "Free food events on BYU campus and across Utah County today and this week, with times, buildings, and rooms.",
      },
      { property: "og:title", content: "Free Food Near Me — Studeats" },
      { property: "og:description", content: "Find free food on campus and in Utah County." },
    ],
  }),
  component: FreeFood,
});

function FreeFood() {
  const { savedEvents } = useStore();
  const [timeFilter, setTimeFilter] = useState<"today" | "week" | "all">("today");
  const [locFilter, setLocFilter] = useState<FoodEventCategory>("all");
  const [openDetail, setOpenDetail] = useState<NormalizedFoodEvent | null>(null);
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);

  const { data: events = [], isLoading, isError, error, refetch } = useFoodEventsQuery();

  // Filter out past events
  const futureEvents = events.filter((e) => e.dayOffset >= 0);

  // Time filter
  const timeFiltered = futureEvents.filter((e) => {
    if (timeFilter === "today") return e.dayOffset === 0;
    if (timeFilter === "week") return e.dayOffset >= 0 && e.dayOffset < 7;
    return true; // all
  });

  // Location filter (On-Campus BYU vs. Off-Campus)
  const filteredEvents = timeFiltered.filter((e) => {
    if (locFilter === "on_campus") return e.category === "on_campus";
    if (locFilter === "off_campus") return e.category === "off_campus";
    return true;
  });

  const todayCount = futureEvents.filter((e) => e.dayOffset === 0).length;

  return (
    <>
      <PageHeader
        eyebrow={`${todayCount} free food event${todayCount === 1 ? "" : "s"} happening today`}
        title="Free Food Near Me"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Btn onClick={() => setIsSubmitOpen(true)} className="gap-1.5 shadow-sm">
            <span>+</span> Share Free Food
          </Btn>
          <Link
            to="/calendar"
            className="inline-flex h-10 items-center rounded-full bg-secondary px-4 text-sm font-medium ring-1 ring-border transition-colors hover:bg-glass"
          >
            📅 Calendar
          </Link>
          <Link
            to="/map"
            className="inline-flex h-10 items-center rounded-full bg-secondary px-4 text-sm font-medium ring-1 ring-border transition-colors hover:bg-glass"
          >
            📍 Map
          </Link>
        </div>
      </PageHeader>

      {/* Control Bar: Time Filters & Location Pills */}
      <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Time Segments */}
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: "today", label: "Today" },
              { id: "week", label: "This Week" },
              { id: "all", label: "All Upcoming" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTimeFilter(t.id)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                timeFilter === t.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary text-secondary-foreground ring-1 ring-border hover:bg-glass"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Categorical Location Scope (Question 3 Answer) */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Location:</span>
          {(
            [
              { id: "all", label: "All Areas" },
              { id: "on_campus", label: "🏫 On-Campus (BYU)" },
              { id: "off_campus", label: "🍔 Off-Campus (Utah County)" },
            ] as const
          ).map((loc) => (
            <button
              key={loc.id}
              onClick={() => setLocFilter(loc.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                locFilter === loc.id
                  ? "bg-foreground text-background"
                  : "bg-muted/60 text-muted-foreground ring-1 ring-border hover:text-foreground"
              }`}
            >
              {loc.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass animate-pulse p-5">
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="mt-4 h-6 w-3/4 rounded bg-muted" />
              <div className="mt-2 h-4 w-1/2 rounded bg-muted" />
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="glass mt-8 p-8 text-center">
          <p className="font-semibold text-destructive">Could not load food events from database.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
          <Btn variant="soft" onClick={() => refetch()} className="mt-4">
            Try Again
          </Btn>
        </div>
      )}

      {/* Events Grid */}
      {!isLoading && !isError && (
        <div className="rise mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.length === 0 ? (
            <div className="col-span-full glass p-10 text-center">
              <div className="text-3xl">🍕</div>
              <h4 className="mt-2 text-base font-semibold">No free food events found</h4>
              <p className="mt-1 text-xs text-muted-foreground">
                {timeFilter === "today"
                  ? "Nothing listed for today yet. Try checking 'This Week' or post an event!"
                  : "No events match this filter."}
              </p>
              <Btn
                variant="soft"
                onClick={() => setIsSubmitOpen(true)}
                className="mt-4 text-xs"
              >
                + Post a Food Event
              </Btn>
            </div>
          ) : (
            filteredEvents.map((e) => {
              const saved = savedEvents.includes(e.id);
              return (
                <div
                  key={e.id}
                  className="glass flex flex-col justify-between p-5 transition-transform hover:-translate-y-0.5"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-full bg-primary/15 px-2.5 py-0.5 font-mono text-xs font-semibold text-primary">
                          {e.formattedDate} {e.start}
                        </span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {e.category === "on_campus" ? "BYU Campus" : "Utah County"}
                        </span>
                      </div>
                      <button
                        onClick={() => actions.toggleEvent(e.id)}
                        className={`text-xl transition-colors ${
                          saved ? "text-gold" : "text-muted-foreground hover:text-gold"
                        }`}
                        aria-label="Save event to hub"
                      >
                        {saved ? "★" : "☆"}
                      </button>
                    </div>

                    <button
                      onClick={() => setOpenDetail(e)}
                      className="mt-3 block text-left"
                    >
                      <h3 className="text-lg font-semibold leading-snug hover:text-primary transition-colors">
                        {e.title}
                      </h3>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {e.food}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {e.building}{e.room ? `, ${e.room}` : ""} · Hosted by {e.host}
                      </p>
                    </button>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3">
                    <span className="font-mono text-xs text-muted-foreground">
                      {e.formattedTime}
                    </span>
                    <button
                      onClick={() => setOpenDetail(e)}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Details & Map →
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Community Event Submission Modal (Question 1 Answer: Option C Hybrid) */}
      <SubmitFoodEventModal
        open={isSubmitOpen}
        onClose={() => setIsSubmitOpen(false)}
      />

      {/* Event Detail Modal */}
      <EventDetail event={openDetail} onClose={() => setOpenDetail(null)} />
    </>
  );
}
