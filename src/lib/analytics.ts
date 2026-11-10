import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  let user_id: string | null = null;
  try {
    const { data } = await supabase.auth.getSession();
    user_id = data.session?.user.id ?? null;
  } catch {}
  const event: ActivityEvent = {
    user_id,
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

// Production OKR reads live in team-okr.ts and use the restricted aggregate RPC.
// The P06 logger above is preserved for its owner to extend independently.

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
