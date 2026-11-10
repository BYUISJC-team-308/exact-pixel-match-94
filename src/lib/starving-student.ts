import { createServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { SSDeal } from "@/lib/data";

type OfferRow = {
  id: string;
  source_key: string | null;
  category: string;
  company: string;
  item: string;
  deal_type: "Free" | "Discount";
  value: string;
  details: string | null;
  source_url: string | null;
  captured_at: string | null;
  locations: { address: string; city: string; lat: number; lng: number }[] | null;
  total_uses?: number | null;
};

const offerColumns =
  "id,source_key,category,company,item,deal_type,value,details,source_url,captured_at,locations,total_uses";

function normalizeOffer(offer: OfferRow): SSDeal {
  return {
    id: offer.id,
    company: offer.company,
    item: offer.item,
    type: offer.deal_type,
    value: offer.value,
    category: offer.category,
    address: offer.locations?.[0]?.address ?? "Location not confirmed",
    details: offer.details ?? "",
    x: 50,
    y: 50,
    sourceUrl: offer.source_url ?? "",
    capturedAt: offer.captured_at ?? "",
    locations: offer.locations ?? [],
    totalUses: offer.total_uses !== undefined ? offer.total_uses : 1,
  };
}

export async function fetchStarvingStudentOffers(): Promise<SSDeal[]> {
  const { data, error } = await supabase
    .from("ss_deals")
    .select(offerColumns)
    .order("company", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as OfferRow[]).map(normalizeOffer);
}

// The homepage needs one real example, not the whole card catalog.
export async function fetchHomepageCardOffers(): Promise<SSDeal[]> {
  const { data, error } = await supabase
    .from("ss_deals")
    .select(offerColumns)
    .order("company", { ascending: true })
    .order("id", { ascending: true })
    .limit(1);
  if (error) throw error;
  return ((data ?? []) as OfferRow[]).map(normalizeOffer);
}

export function useHomepageCardOffersQuery() {
  return useQuery({
    queryKey: ["homepage-card-offers"],
    queryFn: fetchHomepageCardOffers,
    staleTime: 300_000,
  });
}

export const getStarvingStudentOffers = createServerFn({ method: "GET" }).handler(
  fetchStarvingStudentOffers,
);
