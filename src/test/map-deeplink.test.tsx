import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import type { ReactNode } from "react";
import { Route as MapRoute } from "@/routes/map";
import { normalizeFoodEvent, type DbFoodEvent } from "@/lib/food-events";
import { EventDetail, DealDetail, SSDetail } from "@/components/ui-bits";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Deal, SSDeal } from "@/lib/data";

const mocks = vi.hoisted(() => ({
  store: vi.fn(() => ({
    savedEvents: [],
    savedDeals: [],
    usedSS: [],
    ssUsedCounts: {},
    user: null,
  })),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({
    ...(options as object),
    useLoaderData: () => ({
      offers: [],
      eventRows: [],
      dealRows: [],
      campusBuildingRows: [],
      campuses: [],
      renderedAt: Date.now(),
    }),
  }),
  useRouter: () => ({ invalidate: vi.fn() }),
  useNavigate: () => vi.fn(),
  Link: ({
    to,
    search,
    children,
    ...props
  }: {
    to: string;
    search?: Record<string, unknown>;
    children: ReactNode;
  }) => (
    <a href={to} data-search={search ? JSON.stringify(search) : undefined} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/store")>();
  return {
    ...actual,
    useStore: mocks.store,
  };
});

function renderWithClient(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("Map Deep Linking and Search Validation", () => {
  afterEach(() => {
    cleanup();
  });

  it("validates and parses search parameters correctly in Route.validateSearch", () => {
    const validate = (MapRoute as any).validateSearch || (MapRoute as any).options?.validateSearch;
    expect(validate).toBeDefined();
    if (!validate) return;

    const raw = {
      eventId: "event-123",
      buildingId: "WSC",
      dealId: "deal-456",
      offerId: "offer-789",
      date: "2026-11-15",
      campus: "byu-provo",
      view: "campus",
      extraGarbage: 12345,
    };

    const parsed = validate(raw);
    expect(parsed).toEqual({
      eventId: "event-123",
      buildingId: "WSC",
      dealId: "deal-456",
      offerId: "offer-789",
      date: "2026-11-15",
      campus: "byu-provo",
      view: "campus",
    });

    const emptyParsed = validate({});
    expect(emptyParsed).toEqual({
      eventId: undefined,
      buildingId: undefined,
      dealId: undefined,
      offerId: undefined,
      date: undefined,
      campus: undefined,
      view: undefined,
    });

    const invalidView = validate({ view: "invalid_view" });
    expect(invalidView.view).toBeUndefined();
  });

  it("normalizeFoodEvent outputs date and campusId", () => {
    const dbEvent: DbFoodEvent = {
      id: "ev-1",
      title: "Free Pizza",
      host: "ACM Club",
      food: "Pepperoni Pizza",
      event_date: "2026-11-18",
      start_time: "12:00:00",
      end_time: "13:00:00",
      building: "TMCB",
      building_id: "TMCB",
      campus_id: "byu-provo",
      room: "1170",
      details: "Join us for pizza and tech talks.",
    };

    const normalized = normalizeFoodEvent(dbEvent);
    expect(normalized.date).toBe("2026-11-18");
    expect(normalized.campusId).toBe("byu-provo");
    expect(normalized.buildingId).toBe("TMCB");
  });

  it("renders 'See on map' link in EventDetail with search parameters for on-campus event", () => {
    const event = normalizeFoodEvent({
      id: "event-wsc-1",
      title: "Free Donuts",
      host: "BYUSA",
      food: "Donuts",
      event_date: "2026-11-20",
      start_time: "10:00:00",
      end_time: "11:00:00",
      building: "WSC",
      building_id: "WSC",
      campus_id: "byu-provo",
      room: "Garden Court",
      details: "Morning donuts for all students!",
    });

    renderWithClient(<EventDetail event={event} onClose={vi.fn()} />);

    const mapLink = screen.getByRole("link", { name: /see on map/i });
    expect(mapLink).toBeDefined();
    expect(mapLink.getAttribute("href")).toBe("/map");

    const searchData = JSON.parse(mapLink.getAttribute("data-search") || "{}");
    expect(searchData.eventId).toBe("event-wsc-1");
    expect(searchData.date).toBe("2026-11-20");
    expect(searchData.buildingId).toBe("WSC");
    expect(searchData.campus).toBe("byu-provo");
    expect(searchData.view).toBe("campus");
  });

  it("renders 'See on map' link in EventDetail with view 'area' for off-campus events", () => {
    const offCampusEvent = normalizeFoodEvent({
      id: "event-off-1",
      title: "Community BBQ",
      host: "Provo Youth",
      food: "Burgers",
      event_date: "2026-11-22",
      start_time: "18:00:00",
      end_time: "20:00:00",
      building: "Downtown Provo City Park",
      address: "500 W Center St, Provo, UT",
      latitude: 40.2338,
      longitude: -111.6685,
      details: "Open BBQ for the community.",
    });

    renderWithClient(<EventDetail event={offCampusEvent} onClose={vi.fn()} />);

    const mapLink = screen.getByRole("link", { name: /see on map/i });
    expect(mapLink).toBeDefined();

    const searchData = JSON.parse(mapLink.getAttribute("data-search") || "{}");
    expect(searchData.eventId).toBe("event-off-1");
    expect(searchData.view).toBe("area");
  });

  it("renders 'See on map' link in DealDetail when coordinates exist", () => {
    const dealWithCoords: Deal = {
      id: "deal-1",
      company: "Slab Pizza",
      title: "10% Student Discount",
      value: "10% off",
      description: "Show BYU ID at counter.",
      howTo: "Show student ID",
      category: "Food",
      type: "Percent off",
      url: "https://example.com/slab",
      duration: "Ongoing",
      latitude: 40.251,
      longitude: -111.661,
      address: "3430 N University Ave",
      city: "Provo",
    };

    renderWithClient(<DealDetail deal={dealWithCoords} onClose={vi.fn()} />);

    const mapLink = screen.getByRole("link", { name: /see on map/i });
    expect(mapLink).toBeDefined();
    const searchData = JSON.parse(mapLink.getAttribute("data-search") || "{}");
    expect(searchData.dealId).toBe("deal-1");
    expect(searchData.view).toBe("area");
  });

  it("renders 'See on map' link in SSDetail when locations exist", () => {
    const ssDeal: SSDeal = {
      id: "ss-deal-1",
      company: "Jamba",
      item: "Buy One Get One Free",
      value: "BOGO",
      category: "Food & Drink",
      address: "Cougar Blvd",
      type: "BOGO",
      details: "Valid at Provo location",
      sourceUrl: "https://example.com/jamba",
      capturedAt: "Nov 2026",
      x: 50,
      y: 50,
      locations: [
        { address: "230 W 1230 N", city: "Provo", lat: 40.249, lng: -111.665 },
      ],
    };

    renderWithClient(<SSDetail deal={ssDeal} onClose={vi.fn()} />);

    const mapLink = screen.getByRole("link", { name: /see on map/i });
    expect(mapLink).toBeDefined();
    const searchData = JSON.parse(mapLink.getAttribute("data-search") || "{}");
    expect(searchData.offerId).toBe("ss-deal-1");
    expect(searchData.view).toBe("area");
  });
});
