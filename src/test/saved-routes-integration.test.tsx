import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentType, ReactNode } from "react";
import { Route as DiscountsRoute } from "@/routes/discounts";
import { Route as FoodRoute } from "@/routes/free-food";
import { Index } from "@/routes/index";
import { DealDetail, EventDetail } from "@/components/ui-bits";
import { actions } from "@/lib/store";
import type { Deal } from "@/lib/data";
import type { NormalizedFoodEvent } from "@/lib/food-events";

const mocks = vi.hoisted(() => ({
  store: vi.fn(),
  deals: vi.fn(),
  events: vi.fn(),
  retry: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => options,
  useNavigate: () => mocks.navigate,
  Link: ({
    to,
    children,
    ...props
  }: {
    to: string;
    children: ReactNode;
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/auth", () => ({
  initAuth: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn(),
}));

vi.mock("@/lib/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/store")>();
  return {
    ...actual,
    useStore: mocks.store,
    actions: {
      ...actual.actions,
      toggleDeal: vi.fn(),
      toggleEvent: vi.fn(),
    },
  };
});

vi.mock("@/lib/deals", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/deals")>();
  return {
    ...actual,
    useDealsQuery: mocks.deals,
    useUserSubmittedDealsQuery: () => ({ data: [], isLoading: false }),
    useDeleteDealMutation: () => ({ mutateAsync: vi.fn() }),
    getDealScore: () => 0,
  };
});

vi.mock("@/lib/food-events", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/food-events")>();
  return {
    ...actual,
    useFoodEventsQuery: mocks.events,
    useFoodEventInteractionsQuery: () => ({ data: { userVote: null, upvoted: false } }),
    useVoteFoodEventMutation: () => ({ mutateAsync: vi.fn() }),
    useToggleFoodEventUpvoteMutation: () => ({ mutateAsync: vi.fn() }),
    useDeleteFoodEventMutation: () => ({ mutateAsync: vi.fn() }),
  };
});

vi.mock("@/components/SubmitDealModal", () => ({ SubmitDealModal: () => null }));
vi.mock("@/components/SubmitFoodEventModal", () => ({ SubmitFoodEventModal: () => null }));
vi.mock("@/components/AnalyticsDrawerModal", () => ({ AnalyticsDrawerModal: () => null }));

const routePage = (route: unknown) => (route as { component: ComponentType }).component;
const Discounts = routePage(DiscountsRoute);
const Food = routePage(FoodRoute);

const mockDeals: Deal[] = [
  {
    id: "d-uuid-1",
    title: "15% off Waffles",
    company: "Waffle Love",
    category: "Food",
    type: "Percent off",
    value: "15% off",
    description: "Show student ID at register",
    howTo: "In store",
    duration: "Ongoing",
    url: "https://example.com/waffles",
  },
  {
    id: "d-uuid-2",
    title: "Free Donut with Drink",
    company: "Daylight Donuts",
    category: "Food",
    type: "Free",
    value: "Free Donut",
    description: "With any medium drink",
    howTo: "In store",
    duration: "Ongoing",
    url: "https://example.com/donuts",
  },
];

const mockEvents: NormalizedFoodEvent[] = [
  {
    id: "e-uuid-1",
    title: "Upcoming Pizza Social",
    host: "ACM Club",
    food: "Pepperoni & Cheese Pizza",
    start: "6:00 PM",
    end: "7:30 PM",
    building: "TMCB",
    room: "1170",
    details: "Come meet officers and eat free pizza",
    dayOffset: 0,
    isToday: true,
    isThisWeek: true,
    category: "academic",
    formattedDate: "Today",
    x: 50,
    y: 50,
    eventDateObj: new Date(),
  },
  {
    id: "e-uuid-past",
    title: "Past Hackathon Bagels",
    host: "BYU Developers",
    food: "Einstein Bagels",
    start: "8:00 AM",
    end: "9:00 AM",
    building: "EB",
    room: "Atrium",
    details: "Breakfast before coding kick-off",
    dayOffset: -3,
    isToday: false,
    isThisWeek: false,
    category: "academic",
    formattedDate: "3 days ago",
    x: 50,
    y: 50,
    eventDateObj: new Date(Date.now() - 86400000 * 3),
  },
];

describe("Saved Routes & Component UI Integration Tests (P03 & P04)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.store.mockReturnValue({
      user: { name: "Jacob", username: "jacobirish", id: "user-uuid" },
      authReady: true,
      savedDeals: [],
      savedEvents: [],
      preferredCampus: "byu-provo",
    });
    mocks.deals.mockReturnValue({ data: mockDeals, isPending: false, isError: false });
    mocks.events.mockReturnValue({ data: mockEvents, isPending: false, isError: false });
  });

  afterEach(() => {
    cleanup();
  });

  describe("Discounts Page (/discounts)", () => {
    it("renders unselected star for unsaved deal and calls toggleDeal with metadata on click", () => {
      render(<Discounts />);

      // Find the first save button
      const saveBtn = screen.getAllByRole("button", { name: "Save deal" })[0];
      expect(saveBtn).toHaveTextContent("☆");

      fireEvent.click(saveBtn);

      expect(actions.toggleDeal).toHaveBeenCalledWith(
        "d-uuid-2",
        expect.objectContaining({ company: "Daylight Donuts", title: "Free Donut with Drink" })
      );
    });

    it("renders filled star when deal is already saved", () => {
      mocks.store.mockReturnValue({
        user: null,
        authReady: true,
        savedDeals: ["d-uuid-1"],
        savedEvents: [],
        preferredCampus: "byu-provo",
      });

      render(<Discounts />);

      const unsaveBtn = screen.getByRole("button", { name: "Unsave deal" });
      expect(unsaveBtn).toHaveTextContent("★");

      fireEvent.click(unsaveBtn);
      expect(actions.toggleDeal).toHaveBeenCalledWith("d-uuid-1", expect.any(Object));
    });

    it("filters to only saved deals when Saved category tab is clicked", () => {
      mocks.store.mockReturnValue({
        user: null,
        authReady: true,
        savedDeals: ["d-uuid-2"], // Only Daylight Donuts is saved
        savedEvents: [],
        preferredCampus: "byu-provo",
      });

      render(<Discounts />);

      // Initially all deals are visible
      expect(screen.getByText("Waffle Love")).toBeInTheDocument();
      expect(screen.getByText("Daylight Donuts")).toBeInTheDocument();

      // Click on "Saved" category pill
      const savedCategoryBtn = screen.getByRole("button", { name: /^Saved/ });
      fireEvent.click(savedCategoryBtn);

      // Now only Daylight Donuts should remain visible
      expect(screen.queryByText("Waffle Love")).not.toBeInTheDocument();
      expect(screen.getByText("Daylight Donuts")).toBeInTheDocument();
    });
  });

  describe("Free Food Feed (/free-food)", () => {
    it("renders save button for food events and dispatches toggleEvent with metadata", () => {
      render(<Food />);

      const saveButtons = screen.getAllByRole("button", { name: "Save event to hub" });
      expect(saveButtons[0]).toHaveTextContent("☆");

      fireEvent.click(saveButtons[0]);

      expect(actions.toggleEvent).toHaveBeenCalledWith(
        "e-uuid-1",
        expect.objectContaining({ title: "Upcoming Pizza Social" })
      );
    });

    it("displays filled star when food event is saved", () => {
      mocks.store.mockReturnValue({
        user: null,
        authReady: true,
        savedDeals: [],
        savedEvents: ["e-uuid-1"],
        preferredCampus: "byu-provo",
      });

      render(<Food />);

      const saveButtons = screen.getAllByRole("button", { name: "Save event to hub" });
      expect(saveButtons[0]).toHaveTextContent("★");
    });
  });

  describe("Detail Modals (DealDetail & EventDetail)", () => {
    it("toggles save state directly inside DealDetail modal", () => {
      mocks.store.mockReturnValue({
        user: null,
        authReady: true,
        savedDeals: [],
        savedEvents: [],
        preferredCampus: "byu-provo",
      });

      render(<DealDetail deal={mockDeals[0]} onClose={vi.fn()} />);

      const modalSaveBtn = screen.getByRole("button", { name: /Save to hub/ });
      expect(modalSaveBtn).toHaveTextContent("☆ Save to hub");

      fireEvent.click(modalSaveBtn);

      expect(actions.toggleDeal).toHaveBeenCalledWith(
        "d-uuid-1",
        expect.objectContaining({ company: "Waffle Love" })
      );
    });

    it("shows saved indicator inside DealDetail modal when deal is saved", () => {
      mocks.store.mockReturnValue({
        user: null,
        authReady: true,
        savedDeals: ["d-uuid-1"],
        savedEvents: [],
        preferredCampus: "byu-provo",
      });

      render(<DealDetail deal={mockDeals[0]} onClose={vi.fn()} />);

      expect(screen.getByRole("button", { name: /Saved to hub/ })).toHaveTextContent("★ Saved to hub");
    });

    it("toggles save state directly inside EventDetail modal", () => {
      mocks.store.mockReturnValue({
        user: null,
        authReady: true,
        savedDeals: [],
        savedEvents: [],
        preferredCampus: "byu-provo",
      });

      render(<EventDetail event={mockEvents[0]} onClose={vi.fn()} />);

      const eventSaveBtn = screen.getByRole("button", { name: /Save to hub/ });
      expect(eventSaveBtn).toHaveTextContent("☆ Save to hub");

      fireEvent.click(eventSaveBtn);

      expect(actions.toggleEvent).toHaveBeenCalledWith(
        "e-uuid-1",
        expect.objectContaining({ title: "Upcoming Pizza Social" })
      );
    });
  });

  describe("Homepage My Hub Partitioning & Past Events Collapsible (/#my-hub)", () => {
    it("partitions upcoming events into main list and past events into collapsible section", () => {
      mocks.store.mockReturnValue({
        user: { name: "Jacob", username: "jacobirish" },
        authReady: true,
        savedDeals: ["d-uuid-1"],
        savedEvents: ["e-uuid-1", "e-uuid-past"],
        preferredCampus: "byu-provo",
      });

      render(<Index />);
      const hub = within(screen.getByRole("region", { name: "My Hub" }));

      // Active items appear in primary list
      expect(hub.getByText("Waffle Love")).toBeInTheDocument();
      expect(hub.getByText("Upcoming Pizza Social")).toBeInTheDocument();

      // Past event is not visible initially in active list
      expect(hub.queryByText("Past Hackathon Bagels")).not.toBeInTheDocument();

      // Past events toggle bar is present
      const pastToggle = hub.getByRole("button", { name: /Show past events/ });
      expect(pastToggle).toBeInTheDocument();
      expect(within(pastToggle).getByText("1")).toBeInTheDocument();

      // Open collapsible
      fireEvent.click(pastToggle);

      // Now past event is visible with strikethrough styling
      expect(hub.getByText("Past Hackathon Bagels")).toBeInTheDocument();
      expect(hub.getByRole("button", { name: /Hide past events/ })).toBeInTheDocument();
    });

    it("displays dedicated empty message when user only has past events saved", () => {
      mocks.store.mockReturnValue({
        user: { name: "Jacob", username: "jacobirish" },
        authReady: true,
        savedDeals: [],
        savedEvents: ["e-uuid-past"],
        preferredCampus: "byu-provo",
      });

      render(<Index />);
      const hub = within(screen.getByRole("region", { name: "My Hub" }));

      expect(
        hub.getByText(/No upcoming items saved\. Review your past attended events below:/i)
      ).toBeInTheDocument();
      expect(hub.getByRole("button", { name: /Show past events/ })).toBeInTheDocument();
    });
  });
});
