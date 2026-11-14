export const CARD_PAGE_SIZE = 24;
export const discountTypes = [
  "All Deals",
  "Free Only",
  "Discounts Only",
  "Unlimited Only",
] as const;
export const statusFilters = ["Any Status", "Unused / Available", "Used"] as const;
export const sortOptions = [
  { value: "company-asc", label: "Company (A–Z)" },
  { value: "company-desc", label: "Company (Z–A)" },
  { value: "item-asc", label: "Deal Title (A–Z)" },
  { value: "free-first", label: "Free Deals First" },
  { value: "locations-desc", label: "Most Locations" },
  { value: "most-punched", label: "Most Punched" },
] as const;
export type SortOption = (typeof sortOptions)[number]["value"];
export type CardSearch = {
  q: string;
  category: string;
  type: (typeof discountTypes)[number];
  status: (typeof statusFilters)[number];
  sort: SortOption;
  view: "compact" | "grid";
  page: number;
};
export function validateCardSearch(search: Record<string, unknown>): CardSearch {
  const page = Number(search["page"]);
  let view: "compact" | "grid" = "compact";
  if (search["view"] === "grid") {
    view = "grid";
  } else if (search["view"] === "compact") {
    view = "compact";
  } else if (search["view"] === undefined && typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("studeats_catalog_view");
      if (stored === "grid" || stored === "compact") {
        view = stored;
      }
    } catch {}
  }
  return {
    q: typeof search["q"] === "string" ? search["q"] : "",
    category: typeof search["category"] === "string" ? search["category"] : "All categories",
    type: discountTypes.includes(search["type"] as CardSearch["type"])
      ? (search["type"] as CardSearch["type"])
      : "All Deals",
    status: statusFilters.includes(search["status"] as CardSearch["status"])
      ? (search["status"] as CardSearch["status"])
      : "Any Status",
    sort: sortOptions.some((item) => item.value === search["sort"])
      ? (search["sort"] as SortOption)
      : "company-asc",
    view,
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
  };
}
