import { supabase } from "@/lib/supabase";

export const reviewStatuses = [
  "needs_review",
  "ready",
  "published",
  "already_covered",
  "excluded",
  "expired",
] as const;
export type ReviewStatus = (typeof reviewStatuses)[number];
export const statusLabels: Record<ReviewStatus, string> = {
  needs_review: "Needs review",
  ready: "Ready to publish",
  published: "Published",
  already_covered: "Already covered",
  excluded: "Outside scope",
  expired: "Expired",
};
export type CatalogSource = {
  name: string;
  catalog_url: string;
  pass_date: string;
  exhausted: boolean;
  resume_at: string;
  notes: string;
  updated_at: string;
};
export type CatalogReview = {
  id: string;
  source: string;
  source_url: string;
  company: string;
  title: string;
  merchant_url: string;
  value: string;
  category: string;
  deal_type: string;
  description: string;
  eligibility: string;
  how_to_redeem: string;
  expires_on: string | null;
  checked_on: string | null;
  status: ReviewStatus;
  notes: string;
  deal_id: string | null;
  distinct_offer: boolean;
  updated_at: string;
};

export async function readCatalogReviews() {
  const reviews: CatalogReview[] = [];
  for (let from = 0; ; from += 100) {
    const { data, error } = await supabase
      .from("catalog_reviews")
      .select("*")
      .order("id")
      .range(from, from + 99);
    if (error)
      throw new Error(
        "Catalog reviews couldn’t load. Check your connection and administrator access. If this is the first visit, apply the catalog review database migration.",
      );
    reviews.push(...(data as CatalogReview[]));
    if (data.length < 100) break;
  }
  const { data, error } = await supabase.from("catalog_sources").select("*").order("name");
  if (error) throw new Error("Catalog source progress couldn’t load. Try again.");
  return { reviews, sources: data as CatalogSource[] };
}

export async function saveCatalogReview(review: CatalogReview) {
  const { id, updated_at, ...fields } = review;
  const { data, error } = await supabase
    .from("catalog_reviews")
    .update(fields)
    .eq("id", id)
    .eq("updated_at", updated_at)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("This review changed or access expired. Refresh before saving again.");
}

export async function saveCatalogSource(source: CatalogSource) {
  const { name, updated_at, ...fields } = source;
  const { data, error } = await supabase
    .from("catalog_sources")
    .update(fields)
    .eq("name", name)
    .eq("updated_at", updated_at)
    .select("name")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Source progress changed. Refresh before saving again.");
}

export function sourceProgress(source: CatalogSource, reviews: CatalogReview[]) {
  const rows = reviews.filter((row) => row.source === source.name);
  const remaining = rows.filter(
    (row) => row.status === "needs_review" || row.status === "ready",
  ).length;
  return {
    total: rows.length,
    remaining,
    complete: source.exhausted && rows.length > 0 && remaining === 0,
  };
}
