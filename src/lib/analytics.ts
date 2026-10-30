import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type ActivityEventType =
  | "session_start"
  | "signup"
  | "deal_saved"
  | "deal_redeemed"
  | "event_saved"
  | "return_visit";

export type ActivityEvent = {
  id?: string;
  user_id?: string | null;
  device_id: string;
  event_type: ActivityEventType | string;
  metadata?: Record<string, unknown>;
  created_at?: string;
};

export type TeamOkrMetrics = {
  totalUsers: number;
  totalSavedDealsCount: number;
  totalEventsLogged: number;
  avgMinutesToFirstSave: number | null; // OKR 1.1: Time from signup to first deal saved
  userSaveConversionRate: number;      // OKR 1.2: Target 50%
  redemptionRate: number;              // OKR 2.1: Target 60%
  sevenDayReturnRate: number;          // OKR 2.2: Target 75%
  eventsByType: Record<string, number>;
};

const LOCAL_STORAGE_KEY = "studeats-activity-logs";

export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "server-device-id";
  let id = localStorage.getItem("studeats-device-id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("studeats-device-id", id);
  }
  return id;
}

// Log an analytics event to Supabase and fallback to localStorage
export async function logActivityEvent(
  eventType: ActivityEventType | string,
  metadata: Record<string, unknown> = {}
) {
  const device_id = getOrCreateDeviceId();
  const event: ActivityEvent = {
    device_id,
    event_type: eventType,
    metadata,
    created_at: new Date().toISOString(),
  };

  // Local backup in localStorage
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      const existing: ActivityEvent[] = raw ? JSON.parse(raw) : [];
      existing.push(event);
      // Keep last 100 events
      if (existing.length > 100) existing.splice(0, existing.length - 100);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(existing));
    } catch {
      // Ignore storage errors
    }
  }

  // Attempt Supabase insert
  try {
    const { error } = await supabase.from("user_activity_logs").insert([event]);
    if (error) {
      console.warn("Could not insert event into Supabase user_activity_logs (table may need creation):", error.message);
    }
  } catch (err) {
    console.warn("Error logging activity event to Supabase:", err);
  }
}

// Compute client-side metrics from activity events
export function computeOkrMetrics(events: ActivityEvent[]): TeamOkrMetrics {
  const eventsByType: Record<string, number> = {};
  const userFirstSeen: Record<string, number> = {};
  const userFirstSave: Record<string, number> = {};
  const userRedeemed = new Set<string>();
  const userSaved = new Set<string>();
  const returnUsers = new Set<string>();

  events.forEach((ev) => {
    eventsByType[ev.event_type] = (eventsByType[ev.event_type] || 0) + 1;
    const uid = (ev.metadata?.username as string) || ev.device_id;
    const time = new Date(ev.created_at || "").getTime();

    if (!userFirstSeen[uid] || time < userFirstSeen[uid]) {
      userFirstSeen[uid] = time;
    }

    if (ev.event_type === "deal_saved") {
      userSaved.add(uid);
      if (!userFirstSave[uid] || time < userFirstSave[uid]) {
        userFirstSave[uid] = time;
      }
    }

    if (ev.event_type === "deal_redeemed") {
      userRedeemed.add(uid);
    }

    if (ev.event_type === "return_visit") {
      returnUsers.add(uid);
    }
  });

  const totalUsers = Math.max(Object.keys(userFirstSeen).length, 1);

  // OKR 1.1: Average time from first seen/account creation to first deal saved
  const saveDurations: number[] = [];
  for (const uid of Object.keys(userFirstSave)) {
    const signupTime = userFirstSeen[uid];
    const saveTime = userFirstSave[uid];
    if (signupTime && saveTime && saveTime >= signupTime) {
      saveDurations.push((saveTime - signupTime) / (1000 * 60)); // minutes
    }
  }

  const avgMinutesToFirstSave =
    saveDurations.length > 0
      ? Math.round(
          (saveDurations.reduce((a, b) => a + b, 0) / saveDurations.length) * 10
        ) / 10
      : null;

  // OKR 1.2: Aim for 50% of users having saved deals
  const userSaveConversionRate = Math.round((userSaved.size / totalUsers) * 100);

  // OKR 2.1: 60% of users return and utilize a "redemption" click
  const redemptionRate = Math.round((userRedeemed.size / totalUsers) * 100);

  // OKR 2.2: At least 75% return and save in first 7 days
  const sevenDayReturnRate = Math.round((returnUsers.size / totalUsers) * 100);

  return {
    totalUsers,
    totalSavedDealsCount: eventsByType["deal_saved"] || 0,
    totalEventsLogged: events.length,
    avgMinutesToFirstSave,
    userSaveConversionRate,
    redemptionRate,
    sevenDayReturnRate,
    eventsByType,
  };
}

export function useAnalyticsMetricsQuery() {
  return useQuery({
    queryKey: ["team_analytics_metrics"],
    queryFn: async () => {
      let events: ActivityEvent[] = [];

      // 1. Try Supabase
      try {
        const { data, error } = await supabase
          .from("user_activity_logs")
          .select("*")
          .order("created_at", { ascending: true })
          .limit(500);

        if (!error && data && data.length > 0) {
          events = data as ActivityEvent[];
        }
      } catch {
        // Fallback to local
      }

      // 2. If Supabase table is empty or not yet created, merge localStorage events
      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (raw) {
            const localEvents: ActivityEvent[] = JSON.parse(raw);
            events = [...events, ...localEvents];
          }
        } catch {}
      }

      return computeOkrMetrics(events);
    },
    staleTime: 1000 * 30, // 30 seconds
    refetchOnWindowFocus: true,
  });
}

export function useSimulateEventMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      eventType,
      metadata = {},
    }: {
      eventType: ActivityEventType;
      metadata?: Record<string, unknown>;
    }) => {
      await logActivityEvent(eventType, metadata);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team_analytics_metrics"] });
    },
  });
}
