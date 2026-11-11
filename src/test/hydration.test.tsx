import { act } from "react";
import { renderToString } from "react-dom/server";
import { hydrateRoot, type Root } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { Route as MapRoute } from "@/routes/map";
import type { ComponentType, ReactNode } from "react";
import { Calendar } from "@/routes/calendar";
import { SiteHeader } from "@/components/SiteHeader";
import { useStore, actions } from "@/lib/store";
import {
  campusCalendarDate,
  campusDateTime,
  eventCountdown,
  isUpcomingEvent,
} from "@/lib/campus-time";
import { normalizeFoodEvent, type DbFoodEvent } from "@/lib/food-events";

const mapData = vi.hoisted(() => ({
  renderedAt: Date.parse("2026-11-11T06:59:59Z"),
  offers: [],
  dealRows: [],
  campusBuildingRows: [],
  campuses: [],
  eventRows: [
    {
      id: "late-event",
      title: "Late study break",
      host: "Club",
      food: "Pizza",
      building: "TMCB",
      building_id: "TMCB",
      latitude: 40.249,
      longitude: -111.65,
      event_date: "2026-11-10",
      start_time: "23:30:00",
      end_time: "23:59:00",
    },
  ],
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({
    ...(options as object),
    useLoaderData: () => mapData,
  }),
  useRouter: () => ({ invalidate: vi.fn() }),
  useNavigate: () => vi.fn(),
  Link: ({
    to,
    children,
    activeOptions: _o,
    activeProps: _p,
    ...props
  }: {
    to: string;
    children: ReactNode;
    activeOptions?: unknown;
    activeProps?: unknown;
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/MapCanvas", () => ({ MapCanvas: () => <div>Map canvas</div> }));
vi.mock("@/lib/supabase", () => ({
  supabase: {
    channel: () => {
      const channel = { on: () => channel, subscribe: () => channel };
      return channel;
    },
    removeChannel: vi.fn(),
  },
}));
vi.mock("@/lib/auth", () => ({ initAuth: vi.fn() }));
vi.mock("@/lib/analytics", () => ({ logActivityEvent: vi.fn() }));
vi.mock("@/lib/deals", async (original) => ({
  ...(await original<typeof import("@/lib/deals")>()),
  useDealsQuery: () => ({ data: [] }),
}));
vi.mock("@/lib/food-events", async (original) => ({
  ...(await original<typeof import("@/lib/food-events")>()),
  useFoodEventsQuery: () => ({ data: [], isPending: true }),
}));
vi.mock("@/lib/calendar-deals", () => ({ getRecurringSpecialsForDate: () => [] }));
vi.mock("@/components/ui-bits", () => ({
  PageHeader: ({
    title,
    eyebrow,
    children,
  }: {
    title: string;
    eyebrow: string;
    children: ReactNode;
  }) => (
    <header>
      <p>{eyebrow}</p>
      <h1>{title}</h1>
      {children}
    </header>
  ),
  Btn: ({
    variant: _v,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => <button {...props} />,
  EventDetail: () => null,
  DealDetail: () => null,
  SSDetail: () => null,
}));
const savedStorage = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (key: string) => savedStorage.get(key) ?? null,
  setItem: (key: string, value: string) => savedStorage.set(key, value),
  removeItem: (key: string) => savedStorage.delete(key),
});
let root: Root | undefined;
afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function StoredHeader() {
  const { savedDeals, preferredCampus } = useStore();
  return (
    <>
      <SiteHeader />
      <p>
        {savedDeals.length} saved at {preferredCampus}
      </p>
    </>
  );
}
it("restores browser saves after hydration, ignores legacy local identity, and waits for verified auth", async () => {
  localStorage.setItem(
    "studeats-state",
    JSON.stringify({
      savedDeals: ["real-offer"],
      preferredCampus: "uvu",
      user: { name: "Untrusted local user" },
      authReady: true,
    }),
  );
  const page = <StoredHeader />;
  const serverHtml = renderToString(page);
  expect(serverHtml).toContain("Checking your account");
  expect(serverHtml).toContain("0");
  document.body.innerHTML = `<div id="test-root">${serverHtml}</div>`;
  const recovered: unknown[] = [];
  await act(async () => {
    root = hydrateRoot(document.getElementById("test-root")!, page, {
      onRecoverableError: (e) => recovered.push(e),
    });
  });
  expect(recovered).toEqual([]);
  expect(document.body).toHaveTextContent("1 saved at uvu");
  expect(document.querySelector('[aria-label="Checking your account"]')).not.toBeNull();
  expect(document.querySelector('[aria-label="Create account"]')).toBeNull();
  await act(async () => {
    actions.setUser({ username: "tester", name: "Test Student", email: "", school: "BYU" });
    actions.setAuthReady();
  });
  expect(document.querySelector('[aria-label="Profile"]')).toHaveAttribute("href", "/profile");
  expect(document.querySelector('[aria-label="Create account"]')).toBeNull();
});

it("hydrates the server calendar snapshot across a campus midnight and a different default locale", async () => {
  vi.useFakeTimers();
  const renderedAt = Date.parse("2026-11-11T06:59:59Z"); // Nov 10 in Utah
  vi.setSystemTime(renderedAt);
  const page = <Calendar renderedAt={renderedAt} />;
  const serverHtml = renderToString(page);
  expect(serverHtml).toContain("Today is Tuesday, November 10");
  document.body.innerHTML = `<div id="test-root">${serverHtml}</div>`;
  const original = Date.prototype.toLocaleDateString;
  vi.spyOn(Date.prototype, "toLocaleDateString").mockImplementation(function (
    this: Date,
    locale,
    options,
  ) {
    // A browser whose default is French, unlike the English SSR runtime.
    return original.call(this, locale ?? "fr-FR", options);
  });
  vi.setSystemTime(Date.parse("2026-11-11T07:00:01Z"));
  const recovered: unknown[] = [];
  const consoleError = vi.spyOn(console, "error");
  await act(async () => {
    root = hydrateRoot(document.getElementById("test-root")!, page, {
      onRecoverableError: (e) => recovered.push(e),
    });
  });
  expect(recovered).toEqual([]);
  expect(consoleError.mock.calls.flat().join(" ")).not.toMatch(/hydration|didn't match|nesting/i);
  // The actual current day appears after commit, rather than corrupting hydration.
  expect(document.body).toHaveTextContent("Today is Wednesday, November 11");
});

it("uses Utah wall time for event inclusion/countdowns and date offsets at UTC midnight/DST boundaries", () => {
  const now = new Date("2026-11-02T00:30:00Z"); // Nov 1 17:30 MST, after DST transition
  expect(campusDateTime(now)).toEqual({ date: "2026-11-01", time: "17:30", minutes: 1050 });
  expect(campusCalendarDate(now).getDate()).toBe(1);
  expect(isUpcomingEvent({ event_date: "2026-11-01", end_time: "18:00:00" }, now)).toBe(true);
  expect(isUpcomingEvent({ event_date: "2026-11-01", end_time: "17:00:00" }, now)).toBe(false);
  expect(eventCountdown({ dayOffset: 0, start: "6:00 PM" }, now)).toBe("Starts in 30 min");
  expect(eventCountdown({ dayOffset: 0, start: "5:00 PM" }, now)).toBe("Happening now");
  const row: DbFoodEvent = {
    id: "evt",
    title: "Event",
    host: "",
    food: "",
    building: "",
    event_date: "2026-11-02",
    start_time: "18:00:00",
    end_time: "19:00:00",
  };
  const next = normalizeFoodEvent(row, now);
  expect(next.dayOffset).toBe(1);
  expect(next.isToday).toBe(false);
  expect(next.formattedDate).toBe("Mon, Nov 2");
});

// The Map uses serialized rows but previously filtered them with independent
// SSR/browser clocks. A late event disappearing at midnight changed SSR counts.
it("hydrates map rows with the loader clock before updating time-dependent results", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(mapData.renderedAt);
  const Map = (MapRoute as unknown as { component: ComponentType }).component;
  const page = <Map />;
  const html = renderToString(page);
  expect(html).toContain("TMCB");
  document.body.innerHTML = `<div id="test-root">${html}</div>`;
  vi.setSystemTime(Date.parse("2026-11-11T07:00:01Z"));
  const errors: unknown[] = [];
  await act(async () => {
    root = hydrateRoot(document.getElementById("test-root")!, page, {
      onRecoverableError: (e) => errors.push(e),
    });
  });
  expect(errors).toEqual([]);
  expect(document.body).not.toHaveTextContent("TMCB");
});
