import { campusDateTime, campusCalendarDate, DISPLAY_LOCALE } from "@/lib/campus-time";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/lib/supabase";
import type { FoodEvent } from "@/lib/data";
import type { DealVoteType } from "@/lib/deal-verification";
import buildingRecords from "@/lib/byu-buildings.json";

export type DbFoodEvent = {
  id: string;
  title: string;
  host: string;
  food: string;
  event_date: string; // YYYY-MM-DD
  start_time: string; // HH:mm:ss
  end_time: string;   // HH:mm:ss
  building: string;
  building_id?: string | null;
  campus_id?: string | null;
  room?: string | null;
  details?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  location_note?: string | null;
  user_id?: string | null;
  verification_status?: string | null;
  upvotes_count?: number | null;
  real_votes_count?: number | null;
  fake_votes_count?: number | null;
  created_at?: string;
  profiles?: { username?: string | null; full_name?: string | null } | null;
};

export type FoodEventCategory = "all" | "on_campus" | "off_campus";

export type NormalizedFoodEvent = FoodEvent & {
  eventDateObj: Date;
  isToday: boolean;
  isThisWeek: boolean;
  category: "on_campus" | "off_campus";
  formattedDate: string;
  formattedTime: string;
};

export function getLocalDateString(d = new Date()): string {
  return campusDateTime(d).date;
}

// Detect BYU campus buildings vs off-campus Utah County venues
export function detectLocationCategory(building: string): "on_campus" | "off_campus" {
  const normalized = (building || "").trim().toLowerCase();
  const matchesOfficialBuilding = buildingRecords.some((record) => {
    const code = record.code.trim().toLowerCase();
    const name = record.name.trim().toLowerCase();
    const label = record.label?.trim().toLowerCase();
    return Boolean(
      (code && new RegExp(`(^|[^a-z0-9])${code}([^a-z0-9]|$)`).test(normalized)) ||
      (name && normalized.includes(name)) ||
      (label && normalized.includes(label)),
    );
  });
  if (matchesOfficialBuilding) return "on_campus";

  const campusKeywords = [
    "byu", "wsc", "wilkinson", "jkb", "marb", "jsb", "esc", "hbll", "library",
    "talmage", "tmb", "crabtree", "cb", "benson", "eyring", "hfac", "moa",
    "richards", "rb", "smith fieldhouse", "sfh", "student union", "quad",
    "brick oven", "creamery", "heritage", "helaman", "campus"
  ];
  const isCampus = campusKeywords.some((k) => normalized.includes(k));
  return isCampus ? "on_campus" : "off_campus";
}

function formatTimeString(timeStr: string): string {
  if (!timeStr) return "";
  const parts = timeStr.split(":");
  if (parts.length >= 2) {
    const hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    const ampm = hours >= 12 ? "PM" : "AM";
    const h12 = hours % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  }
  return timeStr;
}

/**
 * Extracts and cleans requirements / eligibility from event details or notes.
 * Removes boilerplate like "Additional attendance restrictions are not stated."
 */
export function extractRequirements(details?: string | null): string | null {
  if (!details) return null;
  const match = details.match(/(?:Requirements|Eligibility):\s*([^\n]+)/i);
  if (!match) return null;

  const raw = match[1]
    .replace(/Additional attendance restrictions are not stated\.?/i, "")
    .replace(/Other attendance restrictions are not stated\.?/i, "")
    .replace(/Specific major, membership or ID restrictions are not stated\.?/i, "")
    .replace(/Attendance restrictions are not stated\.?/i, "")
    .trim();

  if (!raw || /^(none|not stated|open to all)\b/i.test(raw)) {
    return null;
  }
  return raw;
}

/**
 * Standardizes event descriptions into clean, readable copy:
 * - Keeps the natural event description/summary.
 * - Formats known requirements (e.g. "Requirements: Open to CS, IS and Math students").
 * - Formats registration instructions ("Registration: Go to Handshake to register.").
 * - Drops robotic disclaimers, timestamps, audit statements, and unneeded cost text.
 */
export function standardizeEventDescription(raw?: string | null): string {
  if (!raw) return "No extra details provided.";

  const text = raw.trim();

  // If text doesn't contain disjointed Handshake metadata keywords, clean basic HTML and return
  if (!/(?:Eligibility|Registration|Cost|Food serving time|Organizer statement|Checked \d{4}):/i.test(text)) {
    return text.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s\s+/g, " ").trim();
  }

  // Extract sections from disjointed text
  const parts = text.split(/\n\s*\n/);
  let summary = "";
  let requirements = "";
  let registration = "";
  let cost = "";
  let sourceUrl = "";

  for (const part of parts) {
    const trimmed = part.trim();
    if (/^Eligibility:/i.test(trimmed)) {
      let val = trimmed.replace(/^Eligibility:\s*/i, "").trim();
      val = val
        .replace(/Additional attendance restrictions are not stated\.?/i, "")
        .replace(/Other attendance restrictions are not stated\.?/i, "")
        .replace(/Specific major, membership or ID restrictions are not stated\.?/i, "")
        .replace(/Attendance restrictions are not stated\.?/i, "")
        .trim();
      if (val && !/^(none|not stated|open to all)\b/i.test(val)) {
        requirements = val;
      }
    } else if (/^Registration:/i.test(trimmed)) {
      if (/register/i.test(trimmed)) {
        registration = "Go to Handshake to register.";
      }
    } else if (/^Cost:/i.test(trimmed)) {
      const val = trimmed.replace(/^Cost:\s*/i, "").trim();
      if (!/no price is stated|free|check the source/i.test(val) && /\$\d+/.test(val)) {
        cost = val;
      }
    } else if (/^Source:\s*(https:\/\/[^\s]+)/i.test(trimmed)) {
      sourceUrl = trimmed.match(/^Source:\s*(https:\/\/[^\s]+)/i)?.[1] || "";
    } else if (/^(Food serving time|Checked \d|Times are|Organizer statement)/i.test(trimmed)) {
      // Discard disclaimer / audit lines
      continue;
    } else {
      if (!summary) {
        summary = trimmed;
      } else {
        summary += " " + trimmed;
      }
    }
  }

  const output: string[] = [];
  if (summary) output.push(summary);
  if (requirements) output.push(`Requirements: ${requirements}`);
  if (registration) output.push(`Registration: ${registration}`);
  if (cost) output.push(`Cost: ${cost}`);
  if (sourceUrl) output.push(`Source: ${sourceUrl}`);

  return output.join("\n\n");
}

export function normalizeFoodEvent(row: DbFoodEvent, now = new Date()): NormalizedFoodEvent {
  const today = campusCalendarDate(now);

  // Parse YYYY-MM-DD into a localized Date object
  const [year, month, day] = (row.event_date || "").split("-").map(Number);
  const eventDateObj = year && month && day ? new Date(year, month - 1, day) : campusCalendarDate(now);
  eventDateObj.setHours(0, 0, 0, 0);

  const dayNumber = (date: Date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const diffTime = dayNumber(eventDateObj) - dayNumber(today);
  const dayOffset = Math.round(diffTime / (1000 * 60 * 60 * 24));
  const isToday = dayOffset === 0;
  const isThisWeek = dayOffset >= 0 && dayOffset < 7;
  const category = detectLocationCategory(row.building);

  const startFormatted = formatTimeString(row.start_time);
  const endFormatted = formatTimeString(row.end_time);

  return {
    id: row.id,
    title: row.title || "Free Food Event",
    host: row.host || "Organizer not provided",
    food: row.food || "Food not specified",
    dayOffset,
    start: startFormatted || row.start_time || "12:00",
    end: endFormatted || row.end_time || "13:00",
    building: row.building || "Location not provided",
    buildingId: row.building_id || undefined,
    campusId: row.campus_id || undefined,
    date: row.event_date || undefined,
    room: row.room || "",
    details: standardizeEventDescription(row.details),
    requirements: extractRequirements(row.details) || undefined,
    address: row.address || undefined,
    latitude: Number.isFinite(Number(row.latitude)) ? Number(row.latitude) : undefined,
    longitude: Number.isFinite(Number(row.longitude)) ? Number(row.longitude) : undefined,
    locationNote: row.location_note || undefined,
    isCommunity: Boolean(
      row.verification_status === "community" ||
      row.location_note?.toLowerCase().includes("community") ||
      row.host?.toLowerCase().includes("student host")
    ),
    userId: row.user_id || undefined,
    submitterUsername: row.profiles?.username || undefined,
    submitterName: row.profiles?.full_name || undefined,
    verificationStatus: row.verification_status || (row.location_note?.toLowerCase().includes("community") ? "community" : "verified"),
    upvotesCount: Number(row.upvotes_count) || 0,
    realVotesCount: Number(row.real_votes_count) || 0,
    fakeVotesCount: Number(row.fake_votes_count) || 0,
    x: 50,
    y: 50,
    eventDateObj,
    isToday,
    isThisWeek,
    category,
    formattedDate: eventDateObj.toLocaleDateString(DISPLAY_LOCALE, {
      weekday: "short",
      month: "short",
      day: "numeric",
    }),
    formattedTime: startFormatted && endFormatted ? `${startFormatted} – ${endFormatted}` : startFormatted,
  };
}

export async function fetchFoodEvents(): Promise<NormalizedFoodEvent[]> {
  try {
    const { data, error } = await supabase
      .from("food_events")
      .select("*, profiles:user_id(username, full_name)")
      .order("event_date", { ascending: true });

    if (!error && data) {
      return data.map((row) => normalizeFoodEvent(row as DbFoodEvent));
    }
  } catch {
    // fallback if foreign key relation is warming up
  }

  const { data: fallbackData, error: fallbackError } = await supabase
    .from("food_events")
    .select("*")
    .order("event_date", { ascending: true });

  if (fallbackError) {
    console.error("Error fetching food_events from Supabase:", fallbackError);
    throw fallbackError;
  }

  return (fallbackData || []).map((row) => normalizeFoodEvent(row as DbFoodEvent));
}

export const getMapFoodEvents = createServerFn({ method: "GET" }).handler(async (): Promise<DbFoodEvent[]> => {
  const { data, error } = await supabase
    .from("food_events")
    .select("*")
    .order("event_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as DbFoodEvent[];
});

export function useFoodEventsQuery() {
  return useQuery({
    queryKey: ["food_events"],
    queryFn: fetchFoodEvents,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });
}

export type NewFoodEventInput = {
  title: string;
  host: string;
  food: string;
  event_date: string;
  start_time: string;
  end_time: string;
  building: string;
  building_id?: string;
  campus_id?: string;
  room?: string;
  details?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  location_note?: string;
  user_id?: string | null;
  verification_status?: string;
};

export async function geocodeEventAddress(address: string) {
  const key = import.meta.env["VITE_MAPTILER_KEY"];
  if (!key) throw new Error("Map geocoding is not configured.");
  const response = await fetch(`https://api.maptiler.com/geocoding/${encodeURIComponent(address)}.json?key=${encodeURIComponent(key)}&country=us&limit=1`);
  if (!response.ok) throw new Error("Could not verify that address.");
  const result = await response.json() as { features?: Array<{ center?: [number, number] }> };
  const center = result.features?.[0]?.center;
  if (!center) throw new Error("No map location was found for that address.");
  return { latitude: center[1], longitude: center[0] };
}

export async function insertFoodEvent(input: NewFoodEventInput) {
  const { data: sessionData } = await supabase.auth.getSession();
  const activeUserId = sessionData?.session?.user?.id ?? input.user_id ?? null;

  const payload = {
    ...input,
    user_id: activeUserId,
    verification_status: input.verification_status || "community",
    upvotes_count: 0,
    real_votes_count: 0,
    fake_votes_count: 0,
  };

  const { data, error } = await supabase
    .from("food_events")
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error("Failed to insert food event into Supabase:", error);
    throw error;
  }
  return data;
}

export function useSubmitFoodEventMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: insertFoodEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["food_events"] });
    },
  });
}

// ----------------------------------------------------
// Community Verification & Upvoting for Food Events
// ----------------------------------------------------

export type FoodEventInteractionState = {
  userVote: DealVoteType | null;
  hasUpvoted: boolean;
  upvotesCount: number;
  realVotesCount: number;
  fakeVotesCount: number;
};

export async function voteOnFoodEvent(eventId: string, voteType: DealVoteType): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) {
    throw new Error("You must be signed in to verify food events.");
  }

  const { error } = await supabase
    .from("food_event_votes")
    .upsert(
      {
        event_id: eventId,
        user_id: userId,
        vote_type: voteType,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "event_id,user_id" }
    );

  if (error) {
    console.error("Failed to record food event vote:", error);
    throw error;
  }
}

export async function removeFoodEventVote(eventId: string): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) return;

  const { error } = await supabase
    .from("food_event_votes")
    .delete()
    .match({ event_id: eventId, user_id: userId });

  if (error) {
    console.error("Failed to remove food event vote:", error);
    throw error;
  }
}

export async function toggleFoodEventUpvote(eventId: string): Promise<{ upvoted: boolean }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) {
    throw new Error("You must be signed in to upvote food events.");
  }

  const { data: existing } = await supabase
    .from("food_event_upvotes")
    .select("id")
    .match({ event_id: eventId, user_id: userId })
    .maybeSingle();

  if (existing) {
    const { error: delError } = await supabase
      .from("food_event_upvotes")
      .delete()
      .match({ event_id: eventId, user_id: userId });
    if (delError) throw delError;
    return { upvoted: false };
  } else {
    const { error: insError } = await supabase
      .from("food_event_upvotes")
      .insert([{ event_id: eventId, user_id: userId }]);
    if (insError) throw insError;
    return { upvoted: true };
  }
}

export async function fetchFoodEventInteractions(eventId: string): Promise<FoodEventInteractionState> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;

  const { data: eventData } = await supabase
    .from("food_events")
    .select("upvotes_count, real_votes_count, fake_votes_count")
    .eq("id", eventId)
    .maybeSingle();

  let userVote: DealVoteType | null = null;
  let hasUpvoted = false;

  if (userId) {
    const [voteRes, upvoteRes] = await Promise.all([
      supabase.from("food_event_votes").select("vote_type").match({ event_id: eventId, user_id: userId }).maybeSingle(),
      supabase.from("food_event_upvotes").select("id").match({ event_id: eventId, user_id: userId }).maybeSingle(),
    ]);
    if (voteRes.data?.vote_type === "real" || voteRes.data?.vote_type === "fake") {
      userVote = voteRes.data.vote_type;
    }
    hasUpvoted = Boolean(upvoteRes.data?.id);
  }

  return {
    userVote,
    hasUpvoted,
    upvotesCount: Number(eventData?.upvotes_count) || 0,
    realVotesCount: Number(eventData?.real_votes_count) || 0,
    fakeVotesCount: Number(eventData?.fake_votes_count) || 0,
  };
}

export function useVoteFoodEventMutation(eventId: string) {
  try {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({ voteType, remove }: { voteType: DealVoteType; remove?: boolean }) => {
        if (remove) return removeFoodEventVote(eventId);
        return voteOnFoodEvent(eventId, voteType);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["food_events"] });
        queryClient.invalidateQueries({ queryKey: ["food_event_interactions", eventId] });
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

export function useToggleFoodEventUpvoteMutation(eventId: string) {
  try {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: () => toggleFoodEventUpvote(eventId),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["food_events"] });
        queryClient.invalidateQueries({ queryKey: ["food_event_interactions", eventId] });
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

export function useFoodEventInteractionsQuery(eventId: string) {
  try {
    return useQuery({
      queryKey: ["food_event_interactions", eventId],
      queryFn: () => fetchFoodEventInteractions(eventId),
      staleTime: 1000 * 30,
    });
  } catch {
    return {
      data: undefined,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useQuery<FoodEventInteractionState>>;
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function deleteFoodEvent(eventId: string, reportId?: string): Promise<void> {
  // 1. Try atomic security-definer RPC function first
  const { error: rpcError } = await supabase.rpc("admin_delete_listing", {
    p_item_type: "event",
    p_item_id: eventId,
    p_report_id: reportId ?? null,
  });

  if (!rpcError) {
    return;
  }

  // 2. If it is a valid UUID, attempt direct table deletion
  if (UUID_REGEX.test(eventId)) {
    const { error } = await supabase.from("food_events").delete().eq("id", eventId);
    if (error) {
      console.error("Error deleting food event from Supabase:", error, rpcError);
      throw new Error(error.message || rpcError.message || "Failed to delete food event");
    }
  } else {
    // If not a UUID, it doesn't exist in the UUID table
    console.warn(`Event ID "${eventId}" is not a UUID; skipping direct food_events table deletion.`);
  }

  // 3. If a reportId is present, mark the report as resolved
  if (reportId && UUID_REGEX.test(reportId)) {
    await supabase
      .from("data_issue_reports")
      .update({
        status: "resolved",
        resolution_notes: "Listing permanently deleted by administrator.",
        resolved_at: new Date().toISOString(),
      })
      .eq("id", reportId);
  }
}

export function useDeleteFoodEventMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: string | { id: string; reportId?: string }) => {
      const eventId = typeof args === "string" ? args : args.id;
      const reportId = typeof args === "string" ? undefined : args.reportId;
      return deleteFoodEvent(eventId, reportId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["food_events_query"] });
      void queryClient.invalidateQueries({ queryKey: ["data_issue_reports"] });
    },
  });
}
