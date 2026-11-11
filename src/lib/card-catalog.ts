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
    view: search["view"] === "grid" ? "grid" : "compact",
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
  };
}
