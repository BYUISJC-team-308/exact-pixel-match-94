// Event dates/times are wall-clock values for Utah campuses, not the viewer's zone.
export const CAMPUS_TIME_ZONE = "America/Denver";
export const DISPLAY_LOCALE = "en-US";

export function campusDateTime(now: Date) {
  const parts = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    timeZone: CAMPUS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    minutes: Number(value("hour")) * 60 + Number(value("minute")),
    time: `${value("hour")}:${value("minute")}`,
  };
}

// A date-only calendar value: keep local getters for calendar navigation, but
// derive its year/month/day from the explicit campus zone and shared instant.
export function campusCalendarDate(now: Date) {
  const [year = 1970, month = 1, day = 1] = campusDateTime(now).date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function isUpcomingEvent(row: { event_date: string; end_time: string }, now: Date) {
  const current = campusDateTime(now);
  return (
    row.event_date > current.date ||
    (row.event_date === current.date && row.end_time.slice(0, 5) >= current.time)
  );
}

export function eventCountdown(event: { dayOffset: number; start: string }, now: Date) {
  if (event.dayOffset > 1) return `In ${event.dayOffset} days`;
  if (event.dayOffset === 1) return "Tomorrow";
  const match = event.start.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return "Today";
  const hours = (Number(match[1]) % 12) + (match[3]?.toUpperCase() === "PM" ? 12 : 0);
  const minutes = hours * 60 + Number(match[2]) - campusDateTime(now).minutes;
  if (minutes <= 0) return "Happening now";
  if (minutes < 60) return `Starts in ${minutes} min`;
  return `Starts in ${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
