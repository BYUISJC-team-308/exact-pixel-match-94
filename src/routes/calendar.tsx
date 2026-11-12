import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useRenderClock } from "@/hooks/use-render-clock";
import { campusCalendarDate, DISPLAY_LOCALE } from "@/lib/campus-time";
import { eventCountLabel, roomLabel } from "@/lib/student-copy";
import { sameDay } from "@/lib/data";
import { EventDetail, PageHeader, Btn } from "@/components/ui-bits";
import { useStore, actions } from "@/lib/store";
import { useFoodEventsQuery, type NormalizedFoodEvent } from "@/lib/food-events";
import { getGoogleCalendarUrl, downloadIcsFile } from "@/lib/calendar-sync";
import { getRecurringSpecialsForDate, type RecurringSpecial } from "@/lib/calendar-deals";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Free Food & Deals Calendar — Student Steals" },
      {
        name: "description",
        content: "Browse listed food events by date and add an event to your calendar.",
      },
      { property: "og:title", content: "Free Food & Deals Calendar — Student Steals" },
      {
        property: "og:description",
        content: "Browse campus free food and weekly dining specials by date.",
      },
    ],
  }),
  loader: () => ({ renderedAt: Date.now() }),
  component: CalendarPage,
});

function CalendarPage() {
  const { renderedAt } = Route.useLoaderData();
  return <Calendar renderedAt={renderedAt} />;
}

export function Calendar({ renderedAt }: { renderedAt: number }) {
  const { savedEvents } = useStore();
  const now = useRenderClock(renderedAt);
  const today = campusCalendarDate(new Date(now));

  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [openEvent, setOpenEvent] = useState<NormalizedFoodEvent | null>(null);

  // User-chosen settings: Recurring specials toggle & mobile view mode
  const [showRecurringDeals, setShowRecurringDeals] = useState(true);
  const [mobileTab, setMobileTab] = useState<"grid" | "agenda">("agenda");

  // Live Supabase query
  const {
    data: foodEvents = [],
    isPending,
    isLoading: initialFetchLoading,
    isError,
    refetch,
  } = useFoodEventsQuery();
  const isLoading = isPending ?? initialFetchLoading;

  // Calendar calculations
  const firstDayIndex = currentMonth.getDay();
  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0,
  ).getDate();

  const calendarDays = [
    ...Array(firstDayIndex).fill(null),
    ...Array.from(
      { length: daysInMonth },
      (_, i) => new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i + 1),
    ),
  ];

  // Events on a given calendar day
  const getEventsForDay = (d: Date) => {
    return foodEvents.filter((e) => sameDay(e.eventDateObj, d));
  };

  // Selected day items
  const dayFoodEvents = getEventsForDay(selectedDate);
  const dayRecurringSpecials = showRecurringDeals ? getRecurringSpecialsForDate(selectedDate) : [];

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleTodayJump = () => {
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(today);
  };

  return (
    <>
      <PageHeader
        eyebrow={`Today is ${today.toLocaleDateString(DISPLAY_LOCALE, {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}`}
        title="Campus & Deals Calendar"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/free-food"
            className="inline-flex h-10 items-center rounded-full bg-secondary px-4 text-sm font-medium ring-1 ring-border transition-colors hover:bg-glass"
          >
            🍕 Food List
          </Link>
          <Link
            to="/map"
            className="inline-flex h-10 items-center rounded-full bg-secondary px-4 text-sm font-medium ring-1 ring-border transition-colors hover:bg-glass"
          >
            📍 Map View
          </Link>
        </div>
      </PageHeader>

      {/* Control Bar: Filters & Mobile View Switcher */}
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Recurring Specials Toggle Pill (Question 2 Answer) */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowRecurringDeals(!showRecurringDeals)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
              showRecurringDeals
                ? "bg-accent text-accent-foreground shadow-sm"
                : "bg-secondary text-muted-foreground ring-1 ring-border hover:bg-glass"
            }`}
          >
            <span>🏷️</span>
            <span>Recurring Specials:</span>
            <span className="font-bold underline">{showRecurringDeals ? "ON" : "OFF"}</span>
          </button>

          <button
            onClick={handleTodayJump}
            className="rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-foreground ring-1 ring-border hover:bg-glass"
          >
            Jump to Today
          </button>
        </div>

        {/* Mobile View Toggle Switcher (Question 3 Answer) */}
        <div className="flex lg:hidden rounded-full bg-secondary p-1 ring-1 ring-border">
          <button
            onClick={() => setMobileTab("grid")}
            aria-pressed={mobileTab === "grid"}
            className={`rounded-full px-4 py-1 text-xs font-semibold transition-all ${
              mobileTab === "grid"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            📅 Month Grid
          </button>
          <button
            onClick={() => setMobileTab("agenda")}
            aria-pressed={mobileTab === "agenda"}
            className={`rounded-full px-4 py-1 text-xs font-semibold transition-all ${
              mobileTab === "agenda"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            📋 Day Agenda ({dayFoodEvents.length + dayRecurringSpecials.length})
          </button>
        </div>
      </div>

      {/* Main Responsive Grid Layout */}
      <div className="mt-4 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Left Column: Interactive Month Grid */}
        <div
          className={`glass min-w-0 p-2 sm:p-5 ${
            mobileTab === "agenda" ? "hidden lg:block" : "block"
          }`}
        >
          {/* Month Header Navigation */}
          <div className="flex items-center justify-between">
            <Btn variant="soft" onClick={handlePrevMonth} aria-label="Previous month">
              ←
            </Btn>
            <h2
              className="text-center text-base font-bold tracking-tight sm:text-xl"
              aria-live="polite"
            >
              {currentMonth.toLocaleDateString(DISPLAY_LOCALE, {
                month: "long",
                year: "numeric",
              })}
            </h2>
            <Btn variant="soft" onClick={handleNextMonth} aria-label="Next month">
              →
            </Btn>
          </div>

          {/* Weekday Labels */}
          <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="mt-1 grid grid-cols-7 gap-1 sm:gap-1.5">
            {calendarDays.map((date, idx) => {
              if (!date) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="min-h-14 rounded-lg bg-glass/20 opacity-30 sm:min-h-20"
                  />
                );
              }

              const events = getEventsForDay(date);
              const specials = showRecurringDeals ? getRecurringSpecialsForDate(date) : [];
              const isToday = sameDay(date, today);
              const isSelected = sameDay(date, selectedDate);

              return (
                <button
                  key={date.toISOString()}
                  aria-label={`${date.toLocaleDateString(DISPLAY_LOCALE, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}: ${eventCountLabel(events.length, isLoading, isError)}, ${specials.length} specials`}
                  aria-pressed={isSelected}
                  onClick={() => {
                    setSelectedDate(date);
                    setMobileTab("agenda"); // Auto-navigate to agenda on mobile when tapped
                  }}
                  className={`calendar-day group relative flex min-h-14 min-w-0 flex-col items-center rounded-lg p-1 text-left text-sm transition-all sm:min-h-20 sm:items-start sm:p-1.5 ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary"
                      : "bg-glass/50 hover:bg-glass"
                  } ${isToday && !isSelected ? "ring-2 ring-accent" : ""}`}
                >
                  <span
                    className={`text-xs font-bold ${
                      isToday && !isSelected ? "rounded-full bg-accent/20 px-1 text-accent" : ""
                    }`}
                  >
                    {date.getDate()}
                  </span>

                  {/* Badges for food events */}
                  <span className="mt-1 text-[10px] sm:hidden" aria-hidden="true">
                    {isLoading
                      ? "…"
                      : isError
                        ? "!"
                        : events.length + specials.length > 0
                          ? events.length + specials.length
                          : ""}
                  </span>
                  <div className="mt-1 hidden w-full space-y-0.5 overflow-hidden sm:block">
                    {events.slice(0, 2).map((ev) => (
                      <span
                        key={ev.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDate(date);
                          setOpenEvent(ev);
                        }}
                        className={`block w-full truncate rounded px-1 text-[9px] font-medium leading-tight ${
                          isSelected
                            ? "bg-primary-foreground/20 text-primary-foreground"
                            : "bg-gold/20 text-foreground hover:bg-gold/30"
                        }`}
                      >
                        🍕 {ev.title}
                      </span>
                    ))}

                    {/* Recurring deal badge */}
                    {specials.slice(0, 1).map((sp) => (
                      <span
                        key={sp.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDate(date);
                        }}
                        className={`block w-full truncate rounded px-1 text-[9px] font-medium leading-tight ${
                          isSelected
                            ? "bg-primary-foreground/20 text-primary-foreground"
                            : "bg-accent/20 text-foreground hover:bg-accent/30"
                        }`}
                      >
                        🏷️ {sp.title}
                      </span>
                    ))}

                    {events.length + specials.length > 3 && (
                      <span className="block text-[9px] font-bold opacity-75">
                        +{events.length + specials.length - 3} more
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground sm:hidden">
            Numbers show events and specials. Tap a date for its agenda.
          </p>
        </div>

        {/* Right Column: Selected Day Agenda & Calendar Sync (Option 1) */}
        <div
          className={`glass min-w-0 p-4 sm:p-5 ${
            mobileTab === "grid" ? "hidden lg:block" : "block"
          }`}
        >
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Day Agenda
              </span>
              <h2 className="text-xl font-bold">
                {selectedDate.toLocaleDateString(DISPLAY_LOCALE, {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </h2>
            </div>
            {sameDay(selectedDate, today) && (
              <span className="rounded-full bg-accent/20 px-2.5 py-0.5 text-xs font-bold text-accent">
                Today
              </span>
            )}
          </div>

          <div className="mt-4 space-y-4">
            {isLoading && (
              <p className="text-xs text-muted-foreground animate-pulse">Loading food events…</p>
            )}

            {isError && (
              <div role="alert" className="rounded-xl bg-secondary p-4">
                <p className="text-sm">
                  Food events couldn’t load. Check your connection and try again.
                </p>
                <Btn variant="soft" className="mt-2" onClick={() => void refetch()}>
                  Try again
                </Btn>
              </div>
            )}

            {!isLoading &&
              !isError &&
              dayFoodEvents.length === 0 &&
              dayRecurringSpecials.length === 0 && (
                <div className="py-8 text-center text-muted-foreground">
                  <div className="text-2xl">🍃</div>
                  <p className="mt-2 text-sm font-medium">
                    No events or specials are listed for this day.
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Choose another date or turn on Recurring Specials.
                  </p>
                </div>
              )}

            {/* Live Campus Food Events from Supabase */}
            {dayFoodEvents.map((ev) => {
              const saved = savedEvents.includes(ev.id);
              const gCalUrl = getGoogleCalendarUrl({
                id: ev.id,
                title: `[Free Food] ${ev.title}`,
                details: `${ev.food}\n${ev.details}`,
                building: ev.building,
                room: ev.room,
                startDate: selectedDate,
                startTime: ev.start,
                endTime: ev.end,
              });

              return (
                <div
                  key={ev.id}
                  className="rounded-xl border border-border/70 bg-glass/60 p-4 transition-all hover:border-primary/40 hover:bg-glass"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-primary">
                      {ev.start} – {ev.end}
                    </span>
                    <button
                      onClick={() => actions.toggleEvent(ev.id)}
                      className={`text-lg leading-none transition-colors ${
                        saved ? "text-gold" : "text-muted-foreground hover:text-gold"
                      }`}
                      aria-label="Save to hub"
                    >
                      {saved ? "★" : "☆"}
                    </button>
                  </div>

                  <h3
                    onClick={() => setOpenEvent(ev)}
                    className="mt-2 font-semibold text-base leading-snug cursor-pointer hover:text-primary transition-colors"
                  >
                    {ev.title}
                  </h3>
                  <p className="mt-0.5 text-xs font-medium text-foreground">🍕 {ev.food}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    📍 {ev.building}
                    {ev.room ? ` · ${roomLabel(ev.room)}` : ""} · {ev.host}
                  </p>

                  {/* One-Click Google Calendar & .ics Actions (Question 1 Answer: Option 1) */}
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/40 pt-2.5">
                    <a
                      href={gCalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold ring-1 ring-border hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      <span>📅</span> Add to Google Calendar
                    </a>
                    <button
                      onClick={() =>
                        downloadIcsFile({
                          id: ev.id,
                          title: `[Free Food] ${ev.title}`,
                          details: `${ev.food}\n${ev.details}`,
                          building: ev.building,
                          room: ev.room,
                          startDate: selectedDate,
                          startTime: ev.start,
                          endTime: ev.end,
                        })
                      }
                      className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium ring-1 ring-border hover:bg-glass transition-colors"
                    >
                      <span>📥</span> Download calendar file
                    </button>
                    <button
                      onClick={() => setOpenEvent(ev)}
                      className="ml-auto text-xs font-semibold text-primary hover:underline"
                    >
                      Details →
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Recurring Weekly Deals & Specials */}
            {dayRecurringSpecials.map((sp) => (
              <div
                key={sp.id}
                className="rounded-xl border border-accent/30 bg-accent/5 p-4 transition-all hover:border-accent/60"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-accent/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-accent">
                    {sp.hours}
                  </span>
                  <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent">
                    WEEKLY SPECIAL
                  </span>
                </div>

                <h3 className="mt-2 font-semibold text-base leading-snug">{sp.title}</h3>
                <p className="mt-0.5 text-xs font-bold text-accent">{sp.dealValue}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  🏢 {sp.company} · {sp.location}
                </p>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                  {sp.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Event Details Dialog */}
      <EventDetail event={openEvent} onClose={() => setOpenEvent(null)} />
    </>
  );
}
