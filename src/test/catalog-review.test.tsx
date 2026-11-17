import { beforeEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CatalogReview } from "@/components/CatalogReview";
import {
  sourceProgress,
  type CatalogReview as Review,
  type CatalogSource,
} from "@/lib/catalog-review";
const mocks = vi.hoisted(() => ({ read: vi.fn(), save: vi.fn() }));
vi.mock("@/lib/catalog-review", async (original) => ({
  ...(await original<object>()),
  readCatalogReviews: mocks.read,
  saveCatalogReview: mocks.save,
}));
vi.mock("@/lib/deals", () => ({ useDealsQuery: () => ({ data: [] }) }));
vi.mock("@/lib/supabase", () => ({ supabase: {} }));
const source: CatalogSource = {
  name: "SheerID",
  catalog_url: "https://shop.sheerid.com",
  pass_date: "2026-11-16",
  exhausted: false,
  resume_at: "Page 2",
  notes: "",
  updated_at: "2026-11-16",
};
const review: Review = {
  id: "r1",
  source: "SheerID",
  source_url: "https://example.com",
  company: "Example",
  title: "Student offer",
  merchant_url: "",
  value: "Student pricing",
  category: "Tech",
  deal_type: "Percent off",
  description: "",
  eligibility: "",
  how_to_redeem: "",
  expires_on: null,
  checked_on: null,
  status: "needs_review",
  notes: "",
  deal_id: null,
  updated_at: "2026-11-16",
};
function mount() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <CatalogReview />
    </QueryClientProvider>,
  );
}
beforeEach(() => vi.clearAllMocks());
test("loading does not display a false zero count", () => {
  mocks.read.mockImplementation(() => new Promise(() => {}));
  mount();
  expect(screen.getByText("Loading catalog reviews…")).toBeInTheDocument();
  expect(screen.queryByText(/total tracked/)).not.toBeInTheDocument();
});
test("filters the full catalog beyond the first rendered page", async () => {
  mocks.read.mockResolvedValue({
    sources: [source],
    reviews: Array.from({ length: 25 }, (_, i) => ({
      ...review,
      id: `r${i}`,
      company: i === 24 ? "Last merchant" : `Merchant ${i}`,
    })),
  });
  mount();
  await screen.findByText("25 matching reviews · 25 total tracked");
  expect(screen.queryByText("Last merchant — Student offer")).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Search offers"), { target: { value: "Last merchant" } });
  expect(screen.getByText("Last merchant — Student offer")).toBeInTheDocument();
  expect(screen.getByText("1 matching reviews · 25 total tracked")).toBeInTheDocument();
});
test("stale-save errors keep the review open for recovery", async () => {
  mocks.read.mockResolvedValue({ sources: [source], reviews: [review] });
  mocks.save.mockRejectedValue(new Error("This review changed. Refresh before saving again."));
  mount();
  fireEvent.click(await screen.findByRole("button", { name: "Review Example" }));
  fireEvent.click(screen.getByRole("button", { name: "Save review" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("This review changed");
  expect(screen.getByLabelText("Offer title")).toHaveValue("Student offer");
});
test("completion requires full coverage and no unresolved reviews", () => {
  expect(sourceProgress(source, [{ ...review, status: "published" }]).complete).toBe(false);
  expect(sourceProgress({ ...source, exhausted: true }, [review]).complete).toBe(false);
  expect(sourceProgress({ ...source, exhausted: true }, []).complete).toBe(false);
  expect(
    sourceProgress({ ...source, exhausted: true }, [{ ...review, status: "published" }]).complete,
  ).toBe(true);
});
