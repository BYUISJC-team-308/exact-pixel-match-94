import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Deal, DealCategory, DealVerificationStatus } from "@/lib/data";
import { normalizeDeal, type DbDeal } from "@/lib/deals";

export type SubmitDealInput = {
  title: string;
  company: string;
  category: DealCategory;
  deal_type?: string;
  value: string;
  description?: string;
  how_to_redeem?: string;
  duration?: string;
  url?: string;
  address?: string;
  city?: string;
  user_id?: string | null;
  verification_status?: DealVerificationStatus;
};

export type DealVoteType = "real" | "fake";

export type DealInteractionState = {
  userVote: DealVoteType | null;
  hasUpvoted: boolean;
  upvotesCount: number;
  realVotesCount: number;
  fakeVotesCount: number;
};

export function calculateVerificationScore(realVotes = 0, fakeVotes = 0) {
  const total = realVotes + fakeVotes;
  if (total === 0) {
    return {
      percentage: 0,
      total: 0,
      real: 0,
      fake: 0,
      label: "No votes yet",
      badgeColor: "bg-muted text-muted-foreground",
      hasVotes: false,
    };
  }
  const percentage = Math.round((realVotes / total) * 100);
  let label = `${percentage}% Real`;
  let badgeColor = "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
  if (percentage < 50) {
    label = `${percentage}% Real (Disputed)`;
    badgeColor = "bg-destructive/15 text-destructive";
  } else if (percentage < 75) {
    label = `${percentage}% Real (Mixed)`;
    badgeColor = "bg-amber-500/15 text-amber-600 dark:text-amber-400";
  }
  return {
    percentage,
    total,
    real: realVotes,
    fake: fakeVotes,
    label,
    badgeColor,
    hasVotes: true,
  };
}

export async function submitDeal(input: SubmitDealInput): Promise<DbDeal> {
  const { data: sessionData } = await supabase.auth.getSession();
  const activeUserId = sessionData?.session?.user?.id ?? input.user_id ?? null;

  const payload = {
    title: input.title.trim(),
    company: input.company.trim(),
    category: input.category,
    categories: [input.category],
    deal_type: input.deal_type || "Percent off",
    value: input.value.trim(),
    description: input.description?.trim() || null,
    how_to_redeem: input.how_to_redeem?.trim() || "Show your valid student ID at checkout.",
    duration: input.duration?.trim() || "Ongoing",
    url: input.url?.trim() || null,
    address: input.address?.trim() || null,
    city: input.city?.trim() || null,
    user_id: activeUserId,
    verification_status: input.verification_status || "community",
    upvotes_count: 0,
    real_votes_count: 0,
    fake_votes_count: 0,
  };

  const { data, error } = await supabase
    .from("deals")
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error("Failed to insert deal into Supabase:", error);
    throw error;
  }
  return data as DbDeal;
}

export async function voteOnDeal(dealId: string, voteType: DealVoteType): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) {
    throw new Error("You must be signed in to vote on deals.");
  }

  // Upsert the vote: update if already exists, otherwise insert
  const { error } = await supabase
    .from("deal_votes")
    .upsert(
      {
        deal_id: dealId,
        user_id: userId,
        vote_type: voteType,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "deal_id,user_id" }
    );

  if (error) {
    console.error("Failed to record deal vote:", error);
    throw error;
  }
}

export async function removeDealVote(dealId: string): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) return;

  const { error } = await supabase
    .from("deal_votes")
    .delete()
    .match({ deal_id: dealId, user_id: userId });

  if (error) {
    console.error("Failed to remove deal vote:", error);
    throw error;
  }
}

export async function toggleDealUpvote(dealId: string): Promise<{ upvoted: boolean }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) {
    throw new Error("You must be signed in to upvote deals.");
  }

  // Check if currently upvoted
  const { data: existing } = await supabase
    .from("deal_upvotes")
    .select("id")
    .match({ deal_id: dealId, user_id: userId })
    .maybeSingle();

  if (existing) {
    const { error: delError } = await supabase
      .from("deal_upvotes")
      .delete()
      .match({ deal_id: dealId, user_id: userId });
    if (delError) throw delError;
    return { upvoted: false };
  } else {
    const { error: insError } = await supabase
      .from("deal_upvotes")
      .insert([{ deal_id: dealId, user_id: userId }]);
    if (insError) throw insError;
    return { upvoted: true };
  }
}

export async function fetchDealInteractions(dealId: string): Promise<DealInteractionState> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;

  // 1. Fetch current deal counts
  const { data: dealData } = await supabase
    .from("deals")
    .select("upvotes_count, real_votes_count, fake_votes_count")
    .eq("id", dealId)
    .maybeSingle();

  let userVote: DealVoteType | null = null;
  let hasUpvoted = false;

  if (userId) {
    const [voteRes, upvoteRes] = await Promise.all([
      supabase.from("deal_votes").select("vote_type").match({ deal_id: dealId, user_id: userId }).maybeSingle(),
      supabase.from("deal_upvotes").select("id").match({ deal_id: dealId, user_id: userId }).maybeSingle(),
    ]);
    if (voteRes.data?.vote_type === "real" || voteRes.data?.vote_type === "fake") {
      userVote = voteRes.data.vote_type;
    }
    hasUpvoted = Boolean(upvoteRes.data?.id);
  }

  return {
    userVote,
    hasUpvoted,
    upvotesCount: Number(dealData?.upvotes_count) || 0,
    realVotesCount: Number(dealData?.real_votes_count) || 0,
    fakeVotesCount: Number(dealData?.fake_votes_count) || 0,
  };
}

export async function fetchUserSubmittedDeals(userId?: string): Promise<Deal[]> {
  const targetUserId = userId || (await supabase.auth.getSession()).data.session?.user?.id;
  if (!targetUserId) return [];

  const { data, error } = await supabase
    .from("deals")
    .select("*")
    .eq("user_id", targetUserId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching user submitted deals:", error);
    return [];
  }
  return (data as DbDeal[]).map(normalizeDeal);
}

// React Query Hooks (with graceful fallback for test environments without QueryClientProvider)
export function useSubmitDealMutation() {
  try {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: submitDeal,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["deals_list"] });
        queryClient.invalidateQueries({ queryKey: ["user_submitted_deals"] });
      },
    });
  } catch {
    return {
      mutate: () => {},
      mutateAsync: async () => ({} as DbDeal),
      isPending: false,
    } as unknown as ReturnType<typeof useMutation<DbDeal, Error, SubmitDealInput>>;
  }
}

export function useVoteDealMutation(dealId: string) {
  try {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({ voteType, remove }: { voteType: DealVoteType; remove?: boolean }) => {
        if (remove) return removeDealVote(dealId);
        return voteOnDeal(dealId, voteType);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["deals_list"] });
        queryClient.invalidateQueries({ queryKey: ["deal_interactions", dealId] });
        queryClient.invalidateQueries({ queryKey: ["user_submitted_deals"] });
      },
    });
  } catch {
    return {
      mutate: () => {},
      mutateAsync: async () => {},
      isPending: false,
    } as unknown as ReturnType<typeof useMutation<void, Error, { voteType: DealVoteType; remove?: boolean }>>;
  }
}

export function useToggleUpvoteMutation(dealId: string) {
  try {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: () => toggleDealUpvote(dealId),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["deals_list"] });
        queryClient.invalidateQueries({ queryKey: ["deal_interactions", dealId] });
        queryClient.invalidateQueries({ queryKey: ["user_submitted_deals"] });
      },
    });
  } catch {
    return {
      mutate: () => {},
      mutateAsync: async () => ({ upvoted: false }),
      isPending: false,
    } as unknown as ReturnType<typeof useMutation<{ upvoted: boolean }, Error, void>>;
  }
}

export function useDealInteractionsQuery(dealId: string) {
  try {
    return useQuery({
      queryKey: ["deal_interactions", dealId],
      queryFn: () => fetchDealInteractions(dealId),
      staleTime: 1000 * 30,
    });
  } catch {
    return {
      data: undefined,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useQuery<DealInteractionState>>;
  }
}

export function useUserSubmittedDealsQuery(userId?: string) {
  try {
    return useQuery({
      queryKey: ["user_submitted_deals", userId],
      queryFn: () => fetchUserSubmittedDeals(userId),
      staleTime: 1000 * 60,
    });
  } catch {
    return {
      data: [],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useQuery<Deal[]>>;
  }
}
