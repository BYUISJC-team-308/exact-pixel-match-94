import { describe, expect, it } from "vitest";
import { nextRecentMapSearches, type RecentMapSearch } from "@/lib/store";

describe("recent map searches", () => {
  it("normalizes, deduplicates, and promotes a repeated search", () => {
    const current: RecentMapSearch[] = [
      { query: "Pizza", view: "area", searchedAt: "older" },
      { query: "TNRB", view: "campus", searchedAt: "oldest" },
    ];
    expect(nextRecentMapSearches(current, "  pizza  ", "area", "new")).toEqual([
      { query: "pizza", view: "area", searchedAt: "new" },
      { query: "TNRB", view: "campus", searchedAt: "oldest" },
    ]);
  });

  it("keeps the eight most recent valid searches", () => {
    const current = Array.from({ length: 8 }, (_, index) => ({
      query: `Search ${index}`, view: "area" as const, searchedAt: String(index),
    }));
    const next = nextRecentMapSearches(current, "New place", "campus", "now");
    expect(next).toHaveLength(8);
    expect(next[0]).toMatchObject({ query: "New place", view: "campus" });
    expect(next.some((item) => item.query === "Search 7")).toBe(false);
  });
});
