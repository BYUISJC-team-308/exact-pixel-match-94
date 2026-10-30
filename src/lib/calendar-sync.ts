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

// Generates one-click web intent URL to add an event directly to Google Calendar
export function getGoogleCalendarUrl(item: CalendarEventItem): string {
  const start = new Date(item.startDate);
  // Parse hours if available
  if (item.startTime) {
    const match = item.startTime.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const ampm = match[3]?.toUpperCase();
      if (ampm === "PM" && hours < 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;
      start.setHours(hours, minutes, 0, 0);
    }
  }

  const end = item.endDate
    ? new Date(item.endDate)
    : new Date(start.getTime() + 60 * 60 * 1000); // 1 hour default

  if (item.endTime && !item.endDate) {
    const match = item.endTime.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const ampm = match[3]?.toUpperCase();
      if (ampm === "PM" && hours < 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;
      end.setHours(hours, minutes, 0, 0);
    }
  }

  const formatUtcIso = (d: Date) => {
    return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };

  const datesParam = `${formatUtcIso(start)}/${formatUtcIso(end)}`;
  const text = encodeURIComponent(item.title);
  const location = encodeURIComponent(
    [item.building, item.room].filter(Boolean).join(", ")
  );
  const details = encodeURIComponent(
    `${item.details || ""}\n\nDiscovered on Studeats: https://studeats.vercel.app`
  );

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${datesParam}&details=${details}&location=${location}`;
}

// Generates and downloads a standard .ics iCalendar file for Apple Calendar / Outlook / Google Calendar
export function downloadIcsFile(item: CalendarEventItem): void {
  const start = new Date(item.startDate);
  if (item.startTime) {
    const match = item.startTime.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const ampm = match[3]?.toUpperCase();
      if (ampm === "PM" && hours < 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;
      start.setHours(hours, minutes, 0, 0);
    }
  }

  const end = item.endDate
    ? new Date(item.endDate)
    : new Date(start.getTime() + 60 * 60 * 1000);

  if (item.endTime && !item.endDate) {
    const match = item.endTime.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const ampm = match[3]?.toUpperCase();
      if (ampm === "PM" && hours < 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;
      end.setHours(hours, minutes, 0, 0);
    }
  }

  const formatUtcIso = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const location = [item.building, item.room].filter(Boolean).join(", ");
  const cleanSummary = item.title.replace(/[\r\n]+/g, " ");
  const cleanDesc = (item.details || "").replace(/[\r\n]+/g, "\\n");

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
    `LOCATION:${location}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  const blob = new Blob([icsLines.join("\r\n")], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const fileName = `${item.title.replace(/[^a-z0-9]/gi, "_").toLowerCase().slice(0, 30)}.ics`;
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
