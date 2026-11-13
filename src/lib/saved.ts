import { supabase } from "@/lib/supabase";

/**
 * Checks whether an ID string is a valid UUID to protect against
 * non-UUID mock or test IDs from crashing Postgres queries.
 */
export function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/**
 * Fetches all deal IDs saved by the authenticated user.
 */
export async function fetchUserSavedDeals(userId: string): Promise<string[]> {
  if (!userId) return [];
  const { data, error } = await supabase
    .from("saved_deals")
    .select("deal_id")
    .eq("user_id", userId);

  if (error) {
    console.warn("fetchUserSavedDeals error:", error.message);
    return [];
  }
  return (data || []).map((row: { deal_id: string }) => row.deal_id);
}

/**
 * Fetches all food event IDs saved by the authenticated user.
 */
export async function fetchUserSavedEvents(userId: string): Promise<string[]> {
  if (!userId) return [];
  const { data, error } = await supabase
    .from("saved_events")
    .select("event_id")
    .eq("user_id", userId);

  if (error) {
    console.warn("fetchUserSavedEvents error:", error.message);
    return [];
  }
  return (data || []).map((row: { event_id: string }) => row.event_id);
}

/**
 * Persists a saved deal for an authenticated user in Supabase.
 */
export async function saveUserDeal(userId: string, dealId: string): Promise<void> {
  if (!userId || !isUuid(dealId)) return;
  const { error } = await supabase
    .from("saved_deals")
    .upsert([{ user_id: userId, deal_id: dealId }], {
      onConflict: "user_id,deal_id",
      ignoreDuplicates: true,
    });

  if (error && error.code !== "23505") {
    throw error;
  }
}

/**
 * Removes a saved deal for an authenticated user in Supabase.
 */
export async function unsaveUserDeal(userId: string, dealId: string): Promise<void> {
  if (!userId || !isUuid(dealId)) return;
  const { error } = await supabase
    .from("saved_deals")
    .delete()
    .eq("user_id", userId)
    .eq("deal_id", dealId);

  if (error) {
    throw error;
  }
}

/**
 * Persists a saved food event for an authenticated user in Supabase.
 */
export async function saveUserEvent(userId: string, eventId: string): Promise<void> {
  if (!userId || !isUuid(eventId)) return;
  const { error } = await supabase
    .from("saved_events")
    .upsert([{ user_id: userId, event_id: eventId }], {
      onConflict: "user_id,event_id",
      ignoreDuplicates: true,
    });

  if (error && error.code !== "23505") {
    throw error;
  }
}

/**
 * Removes a saved food event for an authenticated user in Supabase.
 */
export async function unsaveUserEvent(userId: string, eventId: string): Promise<void> {
  if (!userId || !isUuid(eventId)) return;
  const { error } = await supabase
    .from("saved_events")
    .delete()
    .eq("user_id", userId)
    .eq("event_id", eventId);

  if (error) {
    throw error;
  }
}

/**
 * Merges guest saves into the student's Supabase account on login.
 * Uploads any guest items that aren't already saved remotely,
 * and returns the unified union of all saved deals and events.
 */
export async function syncAndMergeGuestSaves(
  userId: string,
  localDeals: string[] = [],
  localEvents: string[] = []
): Promise<{ deals: string[]; events: string[] }> {
  if (!userId) return { deals: localDeals, events: localEvents };

  try {
    const [remoteDeals, remoteEvents] = await Promise.all([
      fetchUserSavedDeals(userId),
      fetchUserSavedEvents(userId),
    ]);

    // Insert any local guest deals that are valid UUIDs and not already stored remotely
    const newDealsToInsert = localDeals.filter(
      (id) => isUuid(id) && !remoteDeals.includes(id)
    );
    if (newDealsToInsert.length > 0) {
      await supabase.from("saved_deals").upsert(
        newDealsToInsert.map((deal_id) => ({ user_id: userId, deal_id })),
        { onConflict: "user_id,deal_id", ignoreDuplicates: true }
      );
    }

    // Insert any local guest events that are valid UUIDs and not already stored remotely
    const newEventsToInsert = localEvents.filter(
      (id) => isUuid(id) && !remoteEvents.includes(id)
    );
    if (newEventsToInsert.length > 0) {
      await supabase.from("saved_events").upsert(
        newEventsToInsert.map((event_id) => ({ user_id: userId, event_id })),
        { onConflict: "user_id,event_id", ignoreDuplicates: true }
      );
    }

    // Non-UUID local items (e.g. mock test items) are preserved locally
    const nonUuidDeals = localDeals.filter((id) => !isUuid(id));
    const nonUuidEvents = localEvents.filter((id) => !isUuid(id));

    const mergedDeals = Array.from(new Set([...remoteDeals, ...newDealsToInsert, ...nonUuidDeals]));
    const mergedEvents = Array.from(new Set([...remoteEvents, ...newEventsToInsert, ...nonUuidEvents]));

    return { deals: mergedDeals, events: mergedEvents };
  } catch (err) {
    console.warn("syncAndMergeGuestSaves error:", err);
    return { deals: localDeals, events: localEvents };
  }
}
