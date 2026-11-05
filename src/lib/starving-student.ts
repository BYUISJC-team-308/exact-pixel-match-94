import { createServerFn } from "@tanstack/react-start";
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

export async function fetchStarvingStudentOffers(): Promise<SSDeal[]> {
  const { data, error } = await supabase
    .from("ss_deals")
    .select("id,source_key,category,company,item,deal_type,value,details,source_url,captured_at,locations,total_uses")
    .order("company", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as OfferRow[]).map((offer) => ({
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
  }));
}

export const getStarvingStudentOffers = createServerFn({ method: "GET" }).handler(
  fetchStarvingStudentOffers,
);
