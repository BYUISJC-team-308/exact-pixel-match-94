import { useQuery } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/lib/supabase";
import type { Deal } from "@/lib/data";
import { cleanOfferText } from "@/lib/company-catalog";

export type DbDeal = {
  id: string;
  title: string;
  company: string;
  category: string;
  deal_type?: string | null;
  value: string;
  description?: string | null;
  how_to_redeem?: string | null;
  duration?: string | null;
  url?: string | null;
  is_new?: boolean | null;
  address?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export function isCanadianOnlyDeal(row: { title?: string | null; description?: string | null }): boolean {
  const text = `${row.title || ""} ${row.description || ""}`.toLowerCase();
  const hasCanada = text.includes("canadian") || text.includes("canada");
  const hasUS = text.includes("u.s") || text.includes("us ") || text.includes("united states") || text.includes("utah");
  return hasCanada && !hasUS;
}

export function normalizeDeal(row: DbDeal): Deal {
  const rawTitle = row.title || "Student Discount";
  const rawValue = row.value || "Discount";
  const rawDesc = row.description || "";

  return {
    id: row.id,
    title: cleanOfferText(rawTitle) || "Discount",
    company: row.company || "Local Provider",
    category: (row.category as Deal["category"]) || "Food",
    type: (row.deal_type as Deal["type"]) || "Percent off",
    value: cleanOfferText(rawValue) || "Discount",
    description: cleanOfferText(rawDesc),
    howTo: row.how_to_redeem || "Show your valid student ID at checkout.",
    duration: row.duration || "Ongoing",
    url: row.url || "",
    isNew: Boolean(row.is_new),
    address: row.address || undefined,
    city: row.city || undefined,
    latitude: Number.isFinite(Number(row.latitude)) ? Number(row.latitude) : undefined,
    longitude: Number.isFinite(Number(row.longitude)) ? Number(row.longitude) : undefined,
  };
}

export const getMapDeals = createServerFn({ method: "GET" }).handler(async (): Promise<DbDeal[]> => {
  const { data, error } = await supabase.from("deals").select("*").order("title", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as DbDeal[]).filter((d) => !isCanadianOnlyDeal(d));
});

export async function fetchDeals(): Promise<Deal[]> {
  const { data, error } = await supabase
    .from("deals")
    .select("*")
    .order("title", { ascending: true });

  if (error) {
    console.error("Error fetching deals from Supabase:", error);
    return [];
  }

  return (data || [])
    .filter((d) => !isCanadianOnlyDeal(d))
    .map(normalizeDeal);
}

export function useDealsQuery() {
  return useQuery({
    queryKey: ["deals_list"],
    queryFn: fetchDeals,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
  });
}
