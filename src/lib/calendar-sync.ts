import { campusDateTime } from "@/lib/campus-time";

export type CalendarEventItem = {
  id: string;
  title: string;
  details?: string;
  building?: string;
  room?: string;
  startDate: Date;
  endDate?: Date;
  startTime?: string;
  endTime?: string;
};

function campusInstant(day: Date, time?: string) {
  const match = time?.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  let hour = match ? Number(match[1]) : 0;
  const minute = match ? Number(match[2]) : 0;
  const period = match?.[3]?.toUpperCase();
  if (period) hour = (hour % 12) + (period === "PM" ? 12 : 0);
  const wall = Date.UTC(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute);
  // Denver uses UTC-6 or UTC-7. Prefer the earlier occurrence on fall-back
  // days and shift a nonexistent spring-forward time forward by the gap.
  const daylight = new Date(wall + 6 * 3_600_000);
  const expected = new Date(wall).toISOString().slice(0, 16);
  const displayed = campusDateTime(daylight);
  return `${displayed.date}T${displayed.time}` === expected
    ? daylight
    : new Date(wall + 7 * 3_600_000);
}

function calendarRange(item: CalendarEventItem) {
  const start = campusInstant(item.startDate, item.startTime);
  const end =
    item.endDate || item.endTime
      ? campusInstant(item.endDate ?? item.startDate, item.endTime)
      : undefined;
  return { start, end: end && end > start ? end : new Date(start.getTime() + 3_600_000) };
}

const formatUtcIso = (date: Date) =>
  date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");

export function getGoogleCalendarUrl(item: CalendarEventItem): string {
  const { start, end } = calendarRange(item);
  const datesParam = `${formatUtcIso(start)}/${formatUtcIso(end)}`;
  const text = encodeURIComponent(item.title);
  const location = encodeURIComponent([item.building, item.room].filter(Boolean).join(", "));
  const details = encodeURIComponent(
    `${item.details || ""}\n\nDiscovered on Studeats: https://studeats.vercel.app`,
  );

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${datesParam}&details=${details}&location=${location}`;
}

const escapeIcs = (value: string) =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/[,;]/g, "\\$&");

export function buildCalendarFile(item: CalendarEventItem): string {
  const { start, end } = calendarRange(item);
  const location = [item.building, item.room].filter(Boolean).join(", ");
  const cleanSummary = escapeIcs(item.title);
  const cleanDesc = escapeIcs(item.details || "");

  const icsLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Studeats//BYU Student Deals & Free Food//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${item.id || crypto.randomUUID()}@studeats.vercel.app`,
    `DTSTAMP:${formatUtcIso(new Date())}`,
    `DTSTART:${formatUtcIso(start)}`,
    `DTEND:${formatUtcIso(end)}`,
    `SUMMARY:${cleanSummary}`,
    `DESCRIPTION:${cleanDesc}`,
    `LOCATION:${escapeIcs(location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return icsLines.join("\r\n") + "\r\n";
}

export function downloadIcsFile(item: CalendarEventItem): void {
  const blob = new Blob([buildCalendarFile(item)], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const fileName = `${item.title
    .replace(/[^a-z0-9]/gi, "_")
    .toLowerCase()
    .slice(0, 30)}.ics`;
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
