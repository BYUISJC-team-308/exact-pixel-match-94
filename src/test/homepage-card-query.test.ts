import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchHomepageCardOffers } from "@/lib/starving-student";
import { fetchDeals } from "@/lib/deals";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
}));
vi.mock("@/lib/supabase", () => ({ supabase: { from: mocks.from } }));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({ handler: (handler: unknown) => handler }),
}));
beforeEach(() => {
  mocks.from.mockReturnValue({ select: mocks.select });
  mocks.select.mockReturnValue({ order: mocks.order });
  mocks.order.mockReturnValue({ order: mocks.order, limit: mocks.limit });
});
describe("Homepage card preview", () => {
  it("requests one offer and keeps its real detail and usage fields", async () => {
    mocks.limit.mockResolvedValue({
      data: [
        {
          id: "s1",
          company: "Merchant",
          item: "An offer",
          value: "Offer",
          category: "Food",
          deal_type: "Discount",
          total_uses: 3,
          source_url: "https://example.com/offer",
          locations: [{ address: "Provo", city: "Provo", lat: 40, lng: -111 }],
        },
      ],
      error: null,
    });
    const result = await fetchHomepageCardOffers();
    expect(mocks.limit).toHaveBeenCalledWith(1);
    expect(result[0]).toMatchObject({
      id: "s1",
      company: "Merchant",
      totalUses: 3,
      address: "Provo",
      sourceUrl: "https://example.com/offer",
    });
  });
  it("propagates a failed read instead of showing an empty catalog", async () => {
    const error = new Error("Connection failed");
    mocks.limit.mockResolvedValue({ data: null, error });
    await expect(fetchHomepageCardOffers()).rejects.toBe(error);
  });
  it("keeps a failed discount read distinct from a genuinely empty catalog", async () => {
    const error = new Error("Discount connection failed");
    mocks.order.mockResolvedValue({ data: null, error });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await expect(fetchDeals()).rejects.toBe(error);
    } finally {
      log.mockRestore();
    }
  });
});
