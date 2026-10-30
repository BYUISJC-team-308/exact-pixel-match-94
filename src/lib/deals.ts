import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Deal } from "@/lib/data";

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
};

export function normalizeDeal(row: DbDeal): Deal {
  return {
    id: row.id,
    title: row.title || "Student Discount",
    company: row.company || "Local Provider",
    category: (row.category as Deal["category"]) || "Food",
    type: (row.deal_type as Deal["type"]) || "Percent off",
    value: row.value || "Discount",
    description: row.description || "",
    howTo: row.how_to_redeem || "Show your valid student ID at checkout.",
    duration: row.duration || "Ongoing",
    url: row.url || "",
    isNew: Boolean(row.is_new),
  };
}

export async function fetchDeals(): Promise<Deal[]> {
  const { data, error } = await supabase
    .from("deals")
    .select("*")
    .order("title", { ascending: true });

  if (error) {
    console.error("Error fetching deals from Supabase:", error);
    return [];
  }

  return (data || []).map(normalizeDeal);
}

export function useDealsQuery() {
  return useQuery({
    queryKey: ["deals_list"],
    queryFn: fetchDeals,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
  });
}
