import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { SSDeal } from "@/lib/data";

type OfferRow = {
  id: string;
  category: string;
  company: string;
  offer_text: string;
  terms: string | null;
  source_url: string;
  captured_at: string;
  locations: { address: string; city: string; lat: number; lng: number }[] | null;
};

export async function fetchStarvingStudentOffers(): Promise<SSDeal[]> {
  const { data, error } = await supabase
    .from("starving_student_offers")
    .select("id,category,company,offer_text,terms,source_url,captured_at,locations")
    .order("company", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as OfferRow[]).map((offer) => ({
    id: offer.id,
    company: offer.company,
    item: offer.offer_text,
    type: offer.category === "Freebies" || offer.offer_text.toUpperCase().startsWith("FREE!") ? "Free" : "Discount",
    value: offer.category === "Freebies" ? "Free" : "Offer",
    category: offer.category,
    address: offer.locations?.[0]?.address ?? "Location not confirmed",
    details: offer.terms ?? "",
    x: 50,
    y: 50,
    sourceUrl: offer.source_url,
    capturedAt: offer.captured_at,
    locations: offer.locations ?? [],
  }));
}

export function useStarvingStudentOffersQuery() {
  return useQuery({
    queryKey: ["starving_student_offers"],
    queryFn: fetchStarvingStudentOffers,
    staleTime: 5 * 60 * 1000,
  });
}
