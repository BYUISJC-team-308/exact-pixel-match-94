import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { FoodEvent } from "@/lib/data";

export type DbFoodEvent = {
  id: string;
  title: string;
  host: string;
  food: string;
  event_date: string; // YYYY-MM-DD
  start_time: string; // HH:mm:ss
  end_time: string;   // HH:mm:ss
  building: string;
  room?: string | null;
  details?: string | null;
  created_at?: string;
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
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Detect BYU campus buildings vs off-campus Utah County venues
export function detectLocationCategory(building: string): "on_campus" | "off_campus" {
  const campusKeywords = [
    "byu", "wsc", "wilkinson", "jkb", "marb", "jsb", "esc", "hbll", "library",
    "talmage", "tmb", "crabtree", "cb", "benson", "eyring", "hfac", "moa",
    "richards", "rb", "smith fieldhouse", "sfh", "student union", "quad",
    "brick oven", "creamery", "heritage", "helaman", "campus"
  ];
  const bLower = (building || "").toLowerCase();
  const isCampus = campusKeywords.some((k) => bLower.includes(k));
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

export function normalizeFoodEvent(row: DbFoodEvent): NormalizedFoodEvent {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Parse YYYY-MM-DD into a localized Date object
  const [year, month, day] = (row.event_date || "").split("-").map(Number);
  const eventDateObj = year && month && day ? new Date(year, month - 1, day) : new Date();
  eventDateObj.setHours(0, 0, 0, 0);

  const diffTime = eventDateObj.getTime() - today.getTime();
  const dayOffset = Math.round(diffTime / (1000 * 60 * 60 * 24));
  const isToday = dayOffset === 0;
  const isThisWeek = dayOffset >= 0 && dayOffset < 7;
  const category = detectLocationCategory(row.building);

  const startFormatted = formatTimeString(row.start_time);
  const endFormatted = formatTimeString(row.end_time);

  return {
    id: row.id,
    title: row.title || "Free Food Event",
    host: row.host || "Campus Host",
    food: row.food || "Free Food",
    dayOffset,
    start: startFormatted || row.start_time || "12:00",
    end: endFormatted || row.end_time || "13:00",
    building: row.building || "Campus",
    room: row.room || "",
    details: row.details || "No extra details provided.",
    x: 50,
    y: 50,
    eventDateObj,
    isToday,
    isThisWeek,
    category,
    formattedDate: eventDateObj.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    }),
    formattedTime: startFormatted && endFormatted ? `${startFormatted} – ${endFormatted}` : startFormatted,
  };
}

export async function fetchFoodEvents(): Promise<NormalizedFoodEvent[]> {
  const { data, error } = await supabase
    .from("food_events")
    .select("*")
    .order("event_date", { ascending: true });

  if (error) {
    console.error("Error fetching food_events from Supabase:", error);
    throw error;
  }

  return (data || []).map(normalizeFoodEvent);
}

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
  room?: string;
  details?: string;
};

export async function insertFoodEvent(input: NewFoodEventInput) {
  const { data, error } = await supabase
    .from("food_events")
    .insert([input])
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
