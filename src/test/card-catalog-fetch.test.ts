import { beforeEach, expect, it, vi } from "vitest";
import { fetchStarvingStudentOffers } from "@/lib/starving-student";
const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  order: vi.fn(),
  range: vi.fn(),
}));
vi.mock("@/lib/supabase", () => ({ supabase: { from: mocks.from } }));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({ handler: (fn: unknown) => fn }),
}));
const row = (i: number) => ({
  id: `offer-${i}`,
  company: "Merchant",
  item: `Deal ${i}`,
  deal_type: "Free",
  category: "Freebies",
  value: "Free",
  locations: [],
  total_uses: i === 1000 ? null : 3,
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.from.mockReturnValue({ select: mocks.select });
  mocks.select.mockReturnValue({ order: mocks.order });
  mocks.order.mockReturnValue({ order: mocks.order, range: mocks.range });
});
it("loads beyond Supabase's response cap without discarding later offers or usage fields", async () => {
  mocks.range
    .mockResolvedValueOnce({ data: Array.from({ length: 1000 }, (_, i) => row(i)), error: null })
    .mockResolvedValueOnce({ data: [row(1000)], error: null });
  const result = await fetchStarvingStudentOffers();
  expect(result).toHaveLength(1001);
  expect(result[1000]).toMatchObject({ id: "offer-1000", totalUses: null });
  expect(mocks.range.mock.calls).toEqual([
    [0, 999],
    [1000, 1999],
  ]);
  expect(mocks.order).toHaveBeenCalledWith("id", { ascending: true });
});
it("uses one request for 633 rows and propagates failures rather than a partial/empty catalog", async () => {
  mocks.range.mockResolvedValueOnce({
    data: Array.from({ length: 633 }, (_, i) => row(i)),
    error: null,
  });
  expect(await fetchStarvingStudentOffers()).toHaveLength(633);
  expect(mocks.range).toHaveBeenCalledTimes(1);
  mocks.range
    .mockResolvedValueOnce({ data: Array.from({ length: 1000 }, (_, i) => row(i)), error: null })
    .mockResolvedValueOnce({ data: null, error: new Error("Connection lost") });
  await expect(fetchStarvingStudentOffers()).rejects.toThrow("Connection lost");
});
