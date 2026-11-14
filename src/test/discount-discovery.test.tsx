import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentType } from "react";
import { Route as DiscountsRoute } from "@/routes/discounts";
import type { Deal } from "@/lib/data";

const mocks = vi.hoisted(() => ({
  store: vi.fn(),
  deals: vi.fn(),
  toggleUpvote: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => options,
  useNavigate: () => vi.fn(),
  Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/store")>();
  return {
    ...actual,
    useStore: mocks.store,
    actions: {
      ...actual.actions,
      toggleDeal: vi.fn(),
    },
  };
});

vi.mock("@/lib/deals", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/deals")>();
  return {
    ...actual,
    useDealsQuery: mocks.deals,
    getDealScore: (d: Deal) => (d.company === "Apple" ? 100 : 50),
  };
});

vi.mock("@/lib/deal-verification", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/deal-verification")>();
  return {
    ...actual,
    useToggleUpvoteMutation: () => ({ mutate: mocks.toggleUpvote, isPending: false }),
    useDealInteractionsQuery: () => ({ data: { hasUpvoted: false, upvotesCount: 5 } }),
  };
});

vi.mock("@/components/SubmitDealModal", () => ({ SubmitDealModal: () => null }));
vi.mock("@/components/AuthRequiredModal", () => ({ AuthRequiredModal: () => null }));

const routePage = (route: unknown) => (route as { component: ComponentType }).component;
const Discounts = routePage(DiscountsRoute);

const mockDeals: Deal[] = [
  {
    id: "deal-1",
    title: "10% off Macs",
    company: "Apple",
    category: "Tech",
    type: "Percent off",
    value: "10% off",
    description: "Education discount on laptops",
    howTo: "UNiDAYS verification",
    duration: "Ongoing",
    url: "https://apple.com/edu",
    isNew: false,
    upvotesCount: 20,
    createdAt: "2026-11-01T00:00:00Z",
  },
  {
    id: "deal-2",
    title: "Free Fountain Drink",
    company: "Zupas",
    category: "Food",
    type: "Free",
    value: "Free Drink",
    description: "Free fountain drink with student combo",
    howTo: "Show student ID at register",
    duration: "Ongoing",
    url: "https://zupas.com",
    isNew: true,
    upvotesCount: 45,
    createdAt: "2026-11-10T00:00:00Z",
  },
  {
    id: "deal-3",
    title: "$5 Student Lunch Combo",
    company: "Subway",
    category: "Food",
    type: "Fixed price",
    value: "$5 combo",
    description: "6-inch sandwich and drink for $5",
    howTo: "Show ID at checkout",
    duration: "Ongoing",
    url: "https://subway.com",
    isNew: false,
    upvotesCount: 12,
    createdAt: "2026-10-15T00:00:00Z",
  },
];

describe("Discount Dashboard Discovery & Layout Unification (P21)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.store.mockReturnValue({
      user: null,
      authReady: true,
      savedDeals: [],
    });
    mocks.deals.mockReturnValue({ data: mockDeals, isPending: false, isError: false });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders both List and Discounts Grid view mode toggles and switches layout", () => {
    render(<Discounts />);

    // Default view is Grid
    const listBtn = screen.getByRole("button", { name: /List/i });
    const gridBtn = screen.getByRole("button", { name: /Discounts Grid/i });
    expect(listBtn).toBeInTheDocument();
    expect(gridBtn).toBeInTheDocument();

    // Verify all deals are displayed
    expect(screen.getByText("Apple")).toBeInTheDocument();
    expect(screen.getByText("Zupas")).toBeInTheDocument();
    expect(screen.getByText("Subway")).toBeInTheDocument();

    // Switch to List mode
    fireEvent.click(listBtn);

    // Verify localStorage persistence was updated
    expect(localStorage.getItem("studeats_catalog_view")).toBe("compact");

    // In list mode, items still render with company and title
    expect(screen.getByText("Apple")).toBeInTheDocument();
    expect(screen.getByText("Zupas")).toBeInTheDocument();
    expect(screen.getByText("Subway")).toBeInTheDocument();

    // Switch back to Discounts Grid mode
    fireEvent.click(gridBtn);
    expect(localStorage.getItem("studeats_catalog_view")).toBe("grid");
  });

  it("filters deals by Type (Percent off, Free / Trials, Fixed price)", () => {
    render(<Discounts />);

    // Click "Free / Trials" chip
    const freeTypeBtn = screen.getByRole("button", { name: "Free / Trials" });
    fireEvent.click(freeTypeBtn);

    // Only Zupas (Free Drink) should remain
    expect(screen.getByText("Zupas")).toBeInTheDocument();
    expect(screen.queryByText("Apple")).not.toBeInTheDocument();
    expect(screen.queryByText("Subway")).not.toBeInTheDocument();

    // Click "Percent off" chip
    const percentTypeBtn = screen.getByRole("button", { name: "Percent off" });
    fireEvent.click(percentTypeBtn);

    // Only Apple (Percent off) should remain
    expect(screen.getByText("Apple")).toBeInTheDocument();
    expect(screen.queryByText("Zupas")).not.toBeInTheDocument();
    expect(screen.queryByText("Subway")).not.toBeInTheDocument();

    // Reset to All Deals
    const allDealsBtn = screen.getByRole("button", { name: "All Deals" });
    fireEvent.click(allDealsBtn);
    expect(screen.getByText("Apple")).toBeInTheDocument();
    expect(screen.getByText("Zupas")).toBeInTheDocument();
    expect(screen.getByText("Subway")).toBeInTheDocument();
  });

  it("filters deals by Status (New and Saved)", () => {
    mocks.store.mockReturnValue({
      user: null,
      authReady: true,
      savedDeals: ["deal-3"],
    });

    render(<Discounts />);

    // Click "New" chip
    const newBtn = screen.getByRole("button", { name: "New" });
    fireEvent.click(newBtn);

    // Only Zupas is isNew: true
    expect(screen.getByText("Zupas")).toBeInTheDocument();
    expect(screen.queryByText("Apple")).not.toBeInTheDocument();
    expect(screen.queryByText("Subway")).not.toBeInTheDocument();

    // Click "Saved" chip
    const savedBtn = screen.getByRole("button", { name: "Saved" });
    fireEvent.click(savedBtn);

    // Only Subway is in savedDeals
    expect(screen.getByText("Subway")).toBeInTheDocument();
    expect(screen.queryByText("Apple")).not.toBeInTheDocument();
    expect(screen.queryByText("Zupas")).not.toBeInTheDocument();
  });

  it("filters deals by Category chips", () => {
    render(<Discounts />);

    // Click "Tech" category chip
    const techBtn = screen.getByRole("button", { name: "Tech" });
    fireEvent.click(techBtn);

    expect(screen.getByText("Apple")).toBeInTheDocument();
    expect(screen.queryByText("Zupas")).not.toBeInTheDocument();
    expect(screen.queryByText("Subway")).not.toBeInTheDocument();

    // Click "Food" category chip
    const foodBtn = screen.getByRole("button", { name: "Food" });
    fireEvent.click(foodBtn);

    expect(screen.queryByText("Apple")).not.toBeInTheDocument();
    expect(screen.getByText("Zupas")).toBeInTheDocument();
    expect(screen.getByText("Subway")).toBeInTheDocument();
  });

  it("sorts deals using the unified sort dropdown", () => {
    render(<Discounts />);

    const sortSelect = screen.getByLabelText("Sort verified discounts");

    // Sort by Company (A–Z)
    fireEvent.change(sortSelect, { target: { value: "company-asc" } });
    const headingsAsc = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent?.trim());
    expect(headingsAsc).toEqual(["Apple", "Subway", "Zupas"]);

    // Sort by Company (Z–A)
    fireEvent.change(sortSelect, { target: { value: "company-desc" } });
    const headingsDesc = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent?.trim());
    expect(headingsDesc).toEqual(["Zupas", "Subway", "Apple"]);

    // Sort by Most Upvoted (Zupas has 45, Apple 20, Subway 12)
    fireEvent.change(sortSelect, { target: { value: "upvotes" } });
    const headingsUpvotes = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent?.trim());
    expect(headingsUpvotes).toEqual(["Zupas", "Apple", "Subway"]);

    // Sort by Free Deals First (Zupas is free)
    fireEvent.change(sortSelect, { target: { value: "free-first" } });
    const headingsFree = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent?.trim());
    expect(headingsFree[0]).toBe("Zupas");
  });

  it("shows helpful no-results guidance with a reset button that restores all criteria", () => {
    render(<Discounts />);

    // Search for a non-existent brand
    const searchInput = screen.getByPlaceholderText("Search company, deal, category");
    fireEvent.change(searchInput, { target: { value: "NonExistentBrand12345" } });

    expect(screen.getByText("No matching discounts found")).toBeInTheDocument();
    expect(screen.getByText(/Try a different search or clear the filters/i)).toBeInTheDocument();

    // Click Reset filters
    const resetBtn = screen.getByRole("button", { name: "Reset filters" });
    fireEvent.click(resetBtn);

    // All deals restored
    expect(screen.getByText("Apple")).toBeInTheDocument();
    expect(screen.getByText("Zupas")).toBeInTheDocument();
    expect(screen.getByText("Subway")).toBeInTheDocument();
  });
});
