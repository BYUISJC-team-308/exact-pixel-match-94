import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { Index } from "@/routes/index";

const mocks = vi.hoisted(() => ({ store: vi.fn(), deals: vi.fn(), events: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => options,
  Link: ({ to, children, ...props }: { to: string; children: ReactNode; className?: string }) => (
    <a href={to} {...props}>
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
  mocks.store.mockReturnValue({ savedDeals: [], savedEvents: [], user: null });
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
    expect(discovery.getByRole("link", { name: "How it works" })).toHaveAttribute("href", "/help");
    expect(screen.getByRole("link", { name: "My Hub" })).toHaveAttribute("href", "#my-hub");
    expect(screen.getByText(/Saved items currently stay on this browser/)).toBeInTheDocument();
    expect(screen.queryByText("Verified Discounts")).not.toBeInTheDocument();
  });

  it("combines existing saved discounts and events, caps the preview, and opens details", () => {
    mocks.store.mockReturnValue({
      savedDeals: ["d1", "d2", "d3"],
      savedEvents: ["e1"],
      user: { name: "Lot" },
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
    mocks.events.mockReturnValue(query([event("a"), event("b"), event("c")]));
    render(<Index />);
    const today = within(screen.getByRole("region", { name: "Today on campus" }));
    expect(today.getAllByRole("listitem")).toHaveLength(2);
    expect(today.getByRole("link", { name: "See all 3 events today" })).toHaveAttribute(
      "href",
      "/free-food",
    );
    fireEvent.click(today.getByRole("button", { name: /Campus event a/ }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Campus event a details");
  });

  it("distinguishes loading and failed saved data from an empty collection and offers retry", () => {
    mocks.store.mockReturnValue({ savedDeals: [], savedEvents: ["e1"], user: null });
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
    mocks.store.mockReturnValue({ savedDeals: ["missing"], savedEvents: [], user: null });
    render(<Index />);
    expect(screen.getByText(/couldn’t find these saved items/)).toBeInTheDocument();
    expect(screen.queryByText("Your next good find belongs here.")).not.toBeInTheDocument();
  });
});
