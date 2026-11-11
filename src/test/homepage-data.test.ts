import { beforeEach, describe, expect, it, vi } from "vitest";
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
describe("Homepage discount data", () => {
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
