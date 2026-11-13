import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/lib/supabase";
import type { Deal, DealCategory } from "@/lib/data";
import { cleanOfferText, getCompanyCatalogEntry } from "@/lib/company-catalog";

export type DbDeal = {
  id: string;
  title: string;
  company: string;
  category: string;
  categories?: string[] | null;
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
  user_id?: string | null;
  verification_status?: string | null;
  upvotes_count?: number | null;
  real_votes_count?: number | null;
  fake_votes_count?: number | null;
  created_at?: string | null;
  profiles?: { username?: string | null; full_name?: string | null } | null;
};

export function isCanadianOnlyDeal(row: { title?: string | null; description?: string | null }): boolean {
  const text = `${row.title || ""} ${row.description || ""}`.toLowerCase();
  const hasCanada = text.includes("canadian") || text.includes("canada");
  const hasUS = text.includes("u.s") || text.includes("us ") || text.includes("united states") || text.includes("utah");
  return hasCanada && !hasUS;
}

export function deduplicateDeals<T extends { company?: string; url?: string | null; value?: string | null }>(items: T[]): T[] {
  const seenOffers = new Set<string>();
  const seenCompanyOffers = new Set<string>();
  const result: T[] = [];

  for (const item of items) {
    const offerMatch = item.url?.match(/offer\/(\d+)/i);
    if (offerMatch) {
      const offerKey = `idme:${offerMatch[1]}`;
      if (seenOffers.has(offerKey)) continue;
      seenOffers.add(offerKey);
    }

    const compKey = (item.company || "").trim().toLowerCase();
    const valKey = (item.value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (compKey && valKey) {
      const pairKey = `${compKey}:${valKey}`;
      if (seenCompanyOffers.has(pairKey)) continue;
      seenCompanyOffers.add(pairKey);
    }

    result.push(item);
  }

  return result;
}

export function getDealScore(d: { type?: string; value?: string; title?: string }): number {
  const val = (d.value || "").toLowerCase();
  const type = (d.type || "").toLowerCase();
  const title = (d.title || "").toLowerCase();
  const combined = `${val} ${title}`;

  const isFree =
    type === "free" ||
    val === "free" ||
    val.includes("100% free") ||
    val.includes("free pro") ||
    val.includes("free credit") ||
    val.includes("months free") ||
    val.includes("year free") ||
    val.includes("free software") ||
    title.includes("free edition") ||
    title.includes("free trial") ||
    title.includes("free subscription");

  if (isFree && !val.includes("free shipping") && !val.includes("free delivery")) {
    const dollarMatch = combined.match(/\$(\d+)/);
    const dollar = dollarMatch ? parseInt(dollarMatch[1], 10) : 100;
    return 1000 + Math.min(dollar, 500);
  }

  const pctMatch = val.match(/(\d+)\s*%/);
  if (pctMatch) {
    const pct = parseInt(pctMatch[1], 10);
    return 400 + pct;
  }

  const fixedMatch = val.match(/\$(\d+)\s*off/);
  if (fixedMatch) {
    const amt = parseInt(fixedMatch[1], 10);
    return 200 + amt;
  }

  if (val.includes("cash back")) {
    const cbMatch = val.match(/([\d.]+)\s*%/);
    const cb = cbMatch ? parseFloat(cbMatch[1]) : 2;
    return 50 + cb;
  }

  return 100;
}



export function normalizeDeal(row: DbDeal): Deal {
  const rawTitle = row.title || "Student Discount";
  const rawValue = row.value || "Discount";
  const rawDesc = row.description || "";
  const catalogEntry = getCompanyCatalogEntry(row.company);

  const primaryCategory = ((row.category as DealCategory) || catalogEntry?.category || "Tech") as DealCategory;
  const combinedCategories = [
    ...(Array.isArray(row.categories) ? row.categories : []),
    ...(catalogEntry?.categories || []),
    catalogEntry?.category,
    primaryCategory,
  ].filter(Boolean) as DealCategory[];

  const allCategories = [...new Set(combinedCategories)] as DealCategory[];

  return {
    id: row.id,
    title: cleanOfferText(rawTitle) || "Discount",
    company: row.company || "Local Provider",
    category: primaryCategory,
    categories: allCategories.length > 0 ? allCategories : [primaryCategory],
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
    userId: row.user_id || undefined,
    submitterUsername: row.profiles?.username || undefined,
    submitterName: row.profiles?.full_name || undefined,
    verificationStatus: (row.verification_status as Deal["verificationStatus"]) || "verified",
    upvotesCount: Number(row.upvotes_count) || 0,
    realVotesCount: Number(row.real_votes_count) || 0,
    fakeVotesCount: Number(row.fake_votes_count) || 0,
    createdAt: row.created_at || undefined,
  };
}

export const getMapDeals = createServerFn({ method: "GET" }).handler(async (): Promise<DbDeal[]> => {
  const { data, error } = await supabase.from("deals").select("*").order("title", { ascending: true });
  if (error) throw error;
  const filtered = ((data ?? []) as DbDeal[]).filter((d) => !isCanadianOnlyDeal(d));
  return deduplicateDeals(filtered);
});

export async function fetchDeals(): Promise<Deal[]> {
  // First attempt to query with submitter profile relation
  let rawDeals: DbDeal[] = [];
  const { data, error } = await supabase
    .from("deals")
    .select("*, profiles(username, full_name)")
    .order("title", { ascending: true });

  if (!error && data) {
    rawDeals = data as DbDeal[];
  } else {
    // Graceful fallback if relationship is not yet indexed or schema is pending migration
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("deals")
      .select("*")
      .order("title", { ascending: true });

    if (fallbackError) {
      console.error("Error fetching deals from Supabase:", fallbackError);
      throw fallbackError;
    }
    rawDeals = (fallbackData || []) as DbDeal[];
  }

  const validDeals = rawDeals.filter((d) => !isCanadianOnlyDeal(d));
  const dedupedRaw = deduplicateDeals(validDeals);
  return dedupedRaw.map(normalizeDeal);
}

export function useDealsQuery() {
  return useQuery({
    queryKey: ["deals_list"],
    queryFn: fetchDeals,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
  });
}

export async function deleteDeal(dealId: string, reportId?: string): Promise<void> {
  // 1. Try atomic security-definer RPC function first
  const { error: rpcError } = await supabase.rpc("admin_delete_listing", {
    p_item_type: "deal",
    p_item_id: dealId,
    p_report_id: reportId ?? null,
  });

  if (!rpcError) {
    return;
  }

  // 2. Fallback to direct table deletion
  const { error } = await supabase.from("deals").delete().eq("id", dealId);
  if (error) {
    console.error("Error deleting deal from Supabase:", error, rpcError);
    throw new Error(error.message || rpcError.message || "Failed to delete deal");
  }
}

export function useDeleteDealMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: string | { id: string; reportId?: string }) => {
      const dealId = typeof args === "string" ? args : args.id;
      const reportId = typeof args === "string" ? undefined : args.reportId;
      return deleteDeal(dealId, reportId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["deals_list"] });
      void queryClient.invalidateQueries({ queryKey: ["data_issue_reports"] });
    },
  });
}
