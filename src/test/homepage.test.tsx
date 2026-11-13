import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { Index } from "@/routes/index";

const mocks = vi.hoisted(() => ({
  store: vi.fn(),
  deals: vi.fn(),
  events: vi.fn(),
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => options,
  Link: ({
    to,
    search,
    children,
    ...props
  }: {
    to: string;
    search?: { next?: string };
    children: ReactNode;
    className?: string;
  }) => (
    <a href={search?.next ? `${to}?next=${search.next}` : to} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@/lib/store", () => ({ useStore: mocks.store }));
vi.mock("@/lib/deals", () => ({ useDealsQuery: mocks.deals }));
vi.mock("@/lib/food-events", () => ({ useFoodEventsQuery: mocks.events }));
vi.mock("@/components/ui-bits", () => ({
  DealDetail: ({ deal }: { deal: { company: string } | null }) =>
    deal ? <div role="dialog">{deal.company} details</div> : null,
  EventDetail: ({ event }: { event: { title: string } | null }) =>
    event ? <div role="dialog">{event.title} details</div> : null,
  SSDetail: ({ deal }: { deal: { company: string } | null }) =>
    deal ? <div role="dialog">{deal.company} card details</div> : null,
}));

const query = (data: unknown[] = []) => ({
  data,
  isPending: false,
  isError: false,
  refetch: vi.fn(),
});
const event = (id: string) => ({
  id,
  title: `Campus event ${id}`,
  food: "Refreshments",
  building: "Tanner",
  room: "100",
  start: "7:00 PM",
  formattedDate: "Nov 9",
  isToday: true,
});

beforeEach(() => {
  mocks.store.mockReturnValue({ savedDeals: [], savedEvents: [], user: null, authReady: true });
  mocks.deals.mockReturnValue(query());
  mocks.events.mockReturnValue(query());
});
afterEach(cleanup);

describe("Homepage discovery and saved-item journeys", () => {
  it("offers three distinct discovery paths and honest signed-out guidance", () => {
    render(<Index />);
    const discovery = within(screen.getByRole("region", { name: "Three ways to save" }));
    expect(discovery.getByRole("link", { name: /Student discounts/ })).toHaveAttribute(
      "href",
      "/discounts",
    );
    expect(discovery.getByRole("link", { name: /Starving Student Card/ })).toHaveAttribute(
      "href",
      "/starving-student",
    );
    expect(discovery.getByRole("link", { name: /Free food events/ })).toHaveAttribute(
      "href",
      "/free-food",
    );
    expect(discovery.getAllByRole("link")).toHaveLength(3);
    expect(
      screen.queryByRole("navigation", { name: "Homepage shortcuts" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Saved items currently stay on this browser/)).toBeInTheDocument();
    expect(screen.queryByText("Verified Discounts")).not.toBeInTheDocument();
  });

  it("combines existing saved discounts and events, caps the preview, and opens details", () => {
    mocks.store.mockReturnValue({
      savedDeals: ["d1", "d2", "d3"],
      savedEvents: ["e1"],
      user: { name: "Lot" },
      authReady: true,
    });
    mocks.deals.mockReturnValue(
      query([1, 2, 3].map((n) => ({ id: `d${n}`, company: `Merchant ${n}`, value: "10% off" }))),
    );
    mocks.events.mockReturnValue(query([event("e1")]));
    render(<Index />);
    const hub = within(screen.getByRole("region", { name: "My Hub" }));
    expect(hub.getAllByRole("listitem")).toHaveLength(3);
    fireEvent.click(hub.getByRole("button", { name: "Show all 4 saved items" }));
    expect(hub.getAllByRole("listitem")).toHaveLength(4);
    fireEvent.click(hub.getByRole("button", { name: /Campus event e1/ }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Campus event e1 details");
    fireEvent.click(hub.getByRole("button", { name: "Show fewer saved items" }));
    expect(hub.getAllByRole("listitem")).toHaveLength(3);
  });

  it("keeps today compact without losing the path to additional events", () => {
    mocks.events.mockReturnValue(
      query([event("a"), event("b"), event("c"), event("d"), event("e")]),
    );
    render(<Index />);
    const today = within(screen.getByRole("region", { name: "Today on campus" }));
    expect(today.getAllByRole("listitem")).toHaveLength(4);
    expect(today.getByRole("link", { name: "See all 5 events today" })).toHaveAttribute(
      "href",
      "/free-food",
    );
    fireEvent.click(today.getByRole("button", { name: /Campus event a/ }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Campus event a details");
  });

  it("distinguishes loading and failed saved data from an empty collection and offers retry", () => {
    mocks.store.mockReturnValue({
      savedDeals: [],
      savedEvents: ["e1"],
      user: { name: "Lot" },
      authReady: true,
    });
    mocks.events.mockReturnValue({ ...query(), isPending: true });
    const view = render(<Index />);
    expect(screen.getByText("Loading your saved items…")).toBeInTheDocument();
    expect(screen.queryByText("Your next good find belongs here.")).not.toBeInTheDocument();
    const refetch = vi.fn();
    mocks.events.mockReturnValue({ ...query(), isError: true, refetch });
    view.rerender(<Index />);
    fireEvent.click(screen.getByRole("button", { name: "Try saved items again" }));
    expect(refetch).toHaveBeenCalledOnce();
    expect(screen.getByText(/Your selections haven’t been removed/)).toBeInTheDocument();
  });

  it("does not silently erase references to catalog items that are unavailable", () => {
    mocks.store.mockReturnValue({
      savedDeals: ["missing"],
      savedEvents: [],
      user: { name: "Lot" },
      authReady: true,
    });
    render(<Index />);
    expect(screen.getByText(/couldn’t find these saved items/)).toBeInTheDocument();
    expect(screen.queryByText("Your next good find belongs here.")).not.toBeInTheDocument();
  });

  it("asks guests to sign in without showing saved details or removing their selections", () => {
    mocks.store.mockReturnValue({
      savedDeals: ["d1"],
      savedEvents: [],
      user: null,
      authReady: true,
    });
    mocks.deals.mockReturnValue(
      query([{ id: "d1", company: "Private saved merchant", value: "10% off" }]),
    );
    render(<Index />);
    expect(screen.getByRole("link", { name: "Sign in", exact: true })).toHaveAttribute(
      "href",
      "/signin?next=hub",
    );
    expect(screen.queryByText("Private saved merchant")).not.toBeInTheDocument();
    expect(screen.queryByText(/1 saved/)).not.toBeInTheDocument();
    expect(screen.queryByText("A look at the listings")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Student Steals: discounts, card offers, and free food",
    );
  });

  it("waits for the session before offering sign in or saved content", () => {
    mocks.store.mockReturnValue({ savedDeals: [], savedEvents: [], user: null, authReady: false });
    render(<Index />);
    expect(screen.getByText("Checking your account…")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Sign in", exact: true })).not.toBeInTheDocument();
  });

  it("keeps past saved food events accessible in the collapsible Past Events section", () => {
    mocks.store.mockReturnValue({
      savedDeals: ["d1"],
      savedEvents: ["past1"],
      user: { name: "Jacob" },
      authReady: true,
    });
    mocks.deals.mockReturnValue(query([{ id: "d1", company: "Active Merchant", value: "20% off" }]));
    mocks.events.mockReturnValue(
      query([
        {
          id: "past1",
          title: "Attended Hackathon Bagels",
          food: "Bagels & Cream Cheese",
          building: "TMCB",
          start: "9:00 AM",
          formattedDate: "Nov 1",
          isToday: false,
          dayOffset: -5,
        },
      ])
    );
    render(<Index />);
    const hub = within(screen.getByRole("region", { name: "My Hub" }));
    expect(hub.getByText("Active Merchant")).toBeInTheDocument();
    expect(hub.getByText("🕒 Past Events")).toBeInTheDocument();
    expect(hub.getByText("1")).toBeInTheDocument();

    // Toggle past events open
    fireEvent.click(hub.getByRole("button", { name: /Show past events/ }));
    expect(hub.getByText("Attended Hackathon Bagels")).toBeInTheDocument();
    expect(hub.getByRole("button", { name: /Hide past events/ })).toBeInTheDocument();

    // Click to view past event details
    fireEvent.click(hub.getByRole("button", { name: /Attended Hackathon Bagels/ }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Attended Hackathon Bagels details");
  });
});
