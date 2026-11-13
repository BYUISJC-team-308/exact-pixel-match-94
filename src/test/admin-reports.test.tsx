import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminPage } from "@/routes/admin";
import * as dataIssuesModule from "@/lib/data-issues";
import * as dealsModule from "@/lib/deals";
import * as foodEventsModule from "@/lib/food-events";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (config: any) => config,
  Link: ({ to, children, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

const mockReports: dataIssuesModule.DataIssueReport[] = [
  {
    id: "rep-1",
    itemType: "deal",
    itemId: "deal-101",
    itemLabel: "Waffle Love: Free W Eats",
    issueType: "Offer is expired",
    details: "The cashier said the promotion ended last Friday.",
    pageUrl: "https://studeats.vercel.app/discounts",
    status: "open",
    resolutionNotes: null,
    resolvedAt: null,
    createdAt: "2026-11-13T10:00:00.000Z",
  },
  {
    id: "rep-2",
    itemType: "event",
    itemId: "event-202",
    itemLabel: "ACM Opening Social & Tech Talks",
    issueType: "Location is incorrect",
    details: "Moved from Talmage Building to Clyde Building room 210.",
    pageUrl: "https://studeats.vercel.app/free-food",
    status: "reviewing",
    resolutionNotes: null,
    resolvedAt: null,
    createdAt: "2026-11-12T15:30:00.000Z",
  },
  {
    id: "rep-3",
    itemType: "starving_student",
    itemId: "ss-303",
    itemLabel: "Sub Zero: Free Ice Cream",
    issueType: "Offer details are incorrect",
    details: "Only applies with purchase of regular waffle bowl.",
    pageUrl: "https://studeats.vercel.app/starving-student",
    status: "resolved",
    resolutionNotes: "Updated terms in card offer.",
    resolvedAt: "2026-11-13T09:00:00.000Z",
    createdAt: "2026-11-11T12:00:00.000Z",
  },
];

const mockDeals: any[] = [
  {
    id: "deal-101",
    title: "Free W Eats",
    company: "Waffle Love",
    value: "Free",
    verificationStatus: "community",
    upvotesCount: 1,
    realVotesCount: 0,
    fakeVotesCount: 2,
    submitterUsername: "jiris",
  },
];

const mockFoodEvents: any[] = [
  {
    id: "event-202",
    title: "Late Night Nachos",
    food: "Nachos",
    host: "Student Life",
    building: "Wilkinson Student Center",
    verificationStatus: "community",
    upvotesCount: 3,
    realVotesCount: 1,
    fakeVotesCount: 1,
  },
];

describe("Admin Reports Dashboard (/admin)", () => {
  let queryClient: QueryClient;
  const mockDeleteDeal = vi.fn().mockResolvedValue(undefined);
  const mockDeleteFoodEvent = vi.fn().mockResolvedValue(undefined);
  const mockUpdateReport = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });

    vi.spyOn(dataIssuesModule, "useDataIssueReportsQuery").mockReturnValue({
      data: mockReports,
      isLoading: false,
      isRefetching: false,
      refetch: vi.fn(),
      error: null,
    } as any);

    vi.spyOn(dataIssuesModule, "useUpdateReportStatusMutation").mockReturnValue({
      mutateAsync: mockUpdateReport,
      isPending: false,
    } as any);

    vi.spyOn(dealsModule, "useDealsQuery").mockReturnValue({
      data: mockDeals,
      isLoading: false,
    } as any);

    vi.spyOn(dealsModule, "useDeleteDealMutation").mockReturnValue({
      mutateAsync: mockDeleteDeal,
      isPending: false,
    } as any);

    vi.spyOn(foodEventsModule, "useFoodEventsQuery").mockReturnValue({
      data: mockFoodEvents,
      isLoading: false,
    } as any);

    vi.spyOn(foodEventsModule, "useDeleteFoodEventMutation").mockReturnValue({
      mutateAsync: mockDeleteFoodEvent,
      isPending: false,
    } as any);
  });

  it("renders header, metrics cards, and submitted reports list with deep links", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AdminPage />
      </QueryClientProvider>
    );

    // Title & Header
    expect(screen.getByRole("heading", { name: "Admin Reports" })).toBeInTheDocument();
    expect(screen.getByText("STUDEATS MODERATION & ADMIN")).toBeInTheDocument();

    // Metric Counters
    expect(screen.getByText("Open Reports")).toBeInTheDocument();
    expect(screen.getByText("In Review")).toBeInTheDocument();
    expect(screen.getAllByText("Resolved").length).toBeGreaterThan(0);
    expect(screen.getByText("Disputed Posts")).toBeInTheDocument();

    // Direct deep-link hrefs to specific items
    const openOnPageLinks = screen.getAllByRole("link", { name: /Open on Page/i });
    expect(openOnPageLinks[0]).toHaveAttribute("href", "/discounts?dealId=deal-101");
    expect(openOnPageLinks[1]).toHaveAttribute("href", "/free-food?eventId=event-202");
    expect(openOnPageLinks[2]).toHaveAttribute("href", "/starving-student?dealId=ss-303");
  });

  it("filters reports by search query", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AdminPage />
      </QueryClientProvider>
    );

    const searchInput = screen.getByPlaceholderText("Filter by title, issue, or note…");
    fireEvent.change(searchInput, { target: { value: "cashier" } });

    expect(screen.getByText("Waffle Love: Free W Eats")).toBeInTheDocument();
    expect(screen.queryByText("ACM Opening Social & Tech Talks")).not.toBeInTheDocument();
    expect(screen.queryByText("Sub Zero: Free Ice Cream")).not.toBeInTheDocument();
  });

  it("switches to disputed community listings tab and displays flagged deals/events", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AdminPage />
      </QueryClientProvider>
    );

    const disputedTab = screen.getByRole("button", { name: /Disputed Community Posts/i });
    fireEvent.click(disputedTab);

    // Flagged Deal with fake votes
    expect(screen.getByText("Waffle Love")).toBeInTheDocument();
    expect(screen.getByText(/⚠️ 2 Fake \/ Expired/)).toBeInTheDocument();

    // Flagged Event with ran out votes
    expect(screen.getByText("Late Night Nachos")).toBeInTheDocument();
    expect(screen.getByText(/❌ 1 Ran out/)).toBeInTheDocument();
  });

  it("opens resolve modal and submits status update", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AdminPage />
      </QueryClientProvider>
    );

    // Click Resolve on the first report
    const resolveButtons = screen.getAllByRole("button", { name: /✓ Resolve/i });
    fireEvent.click(resolveButtons[0]);

    // Modal opens
    expect(screen.getByRole("heading", { name: "Resolve Issue Report" })).toBeInTheDocument();

    // Fill in resolution note
    const textarea = screen.getByPlaceholderText(/Verified the discount is no longer active/i);
    fireEvent.change(textarea, { target: { value: "Verified with manager and removed." } });

    // Confirm
    const confirmButton = screen.getByRole("button", { name: "Confirm Resolved" });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockUpdateReport).toHaveBeenCalledWith({
        id: "rep-1",
        status: "resolved",
        resolutionNotes: "Verified with manager and removed.",
      });
    });
  });

  it("allows administrators to delete reported listings and auto-resolves the report", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AdminPage />
      </QueryClientProvider>
    );

    // Click Delete Post on the first report (Waffle Love)
    const deleteButtons = screen.getAllByRole("button", { name: /Delete Post/i });
    fireEvent.click(deleteButtons[0]);

    // Delete Confirmation Modal appears
    expect(screen.getByRole("heading", { name: "Delete Community Listing" })).toBeInTheDocument();
    expect(screen.getByText(/Permanent deletion warning/i)).toBeInTheDocument();

    // Confirm deletion
    const confirmDeleteBtn = screen.getByRole("button", { name: "Delete Permanently" });
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(mockDeleteDeal).toHaveBeenCalledWith("deal-101");
      expect(mockUpdateReport).toHaveBeenCalledWith({
        id: "rep-1",
        status: "resolved",
        resolutionNotes: "Listing permanently deleted by administrator.",
      });
    });
  });

  it("allows quick in-page preview of reported listings", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AdminPage />
      </QueryClientProvider>
    );

    // Click Quick Preview on Waffle Love report
    const previewButtons = screen.getAllByRole("button", { name: /Quick Preview/i });
    fireEvent.click(previewButtons[0]);

    // DealDetail modal opens directly on the admin page
    expect(screen.getByText("Free W Eats")).toBeInTheDocument();
  });
});
