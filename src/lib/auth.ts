import { supabase } from "@/lib/supabase";
import { actions, getStoreState, type User } from "@/lib/store";
import { endActivityVisit, logActivityEvent, signupActivityMetadata } from "@/lib/analytics";
import {
  syncAndMergeGuestSaves,
  subscribeToUserSavedChanges,
  fetchUserSavedDeals,
  fetchUserSavedEvents,
  isUuid,
} from "@/lib/saved";

let activeRealtimeUnsub: (() => void) | null = null;
let lastSyncTimestamp = 0;

/**
 * Re-syncs the active authenticated user's saved items from Supabase.
 * Useful on window focus or visibilitychange (e.g. mobile tab wake-up).
 */
export async function syncActiveUserSaves(userId?: string) {
  const accountId = userId || getStoreState().user?.id;
  if (!accountId) return;
  const now = Date.now();
  if (now - lastSyncTimestamp < 2000) return;
  lastSyncTimestamp = now;

  try {
    const [remoteDeals, remoteEvents] = await Promise.all([
      fetchUserSavedDeals(accountId),
      fetchUserSavedEvents(accountId),
    ]);
    const current = getStoreState();
    const nonUuidDeals = current.savedDeals.filter((id) => !isUuid(id));
    const nonUuidEvents = current.savedEvents.filter((id) => !isUuid(id));
    actions.setSavedItems({
      deals: Array.from(new Set([...remoteDeals, ...nonUuidDeals])),
      events: Array.from(new Set([...remoteEvents, ...nonUuidEvents])),
    });
  } catch (err) {
    console.warn("Visibility re-sync error:", err);
  }
}

import { profileUser, saveProfile, type PhotoChange, type ProfileRow } from "@/lib/profile";

async function syncUser(authUserId: string | null, email?: string) {
  if (activeRealtimeUnsub) {
    activeRealtimeUnsub();
    activeRealtimeUnsub = null;
  }
  if (!authUserId) {
    actions.setUser(null);
  } else {
    const { data } = await supabase.from("profiles").select("*").eq("id", authUserId).maybeSingle();
    actions.setUser(data ? await profileUser(data as ProfileRow, authUserId, email) : null);
    try {
      const currentState = getStoreState();
      const merged = await syncAndMergeGuestSaves(
        authUserId,
        currentState.savedDeals,
        currentState.savedEvents,
      );
      actions.setSavedItems(merged);
    } catch (err) {
      console.warn("Could not sync saved items on sign-in:", err);
    }

    // Subscribe to live multi-device database changes
    activeRealtimeUnsub = subscribeToUserSavedChanges(authUserId, (remoteItems) => {
      const current = getStoreState();
      const nonUuidDeals = current.savedDeals.filter((id) => !isUuid(id));
      const nonUuidEvents = current.savedEvents.filter((id) => !isUuid(id));
      actions.setSavedItems({
        deals: Array.from(new Set([...remoteItems.deals, ...nonUuidDeals])),
        events: Array.from(new Set([...remoteItems.events, ...nonUuidEvents])),
      });
    });
  }
  actions.setAuthReady();
}

let started = false;
export function initAuth() {
  if (started || typeof window === "undefined") return;
  started = true;

  // Multi-device visibility and focus re-sync (e.g. mobile tab wake-up)
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        void syncActiveUserSaves();
      }
    });
  }
  if (typeof window !== "undefined") {
    window.addEventListener("focus", () => {
      void syncActiveUserSaves();
    });
  }

  // Fires once on load with the saved session, then on every sign-in / sign-out.
  // Deferred so we never await Supabase calls inside the callback itself.
  supabase.auth.onAuthStateChange((event, session) => {
    setTimeout(() => {
      if (event === "SIGNED_OUT") endActivityVisit();
      const account = session?.user.id;
      if (account && (event === "INITIAL_SESSION" || event === "SIGNED_IN")) {
        void logActivityEvent("session_start", {}, account);
      }
      void syncUser(account ?? null, session?.user.email);
    }, 0);
  });
}

export async function signUp(u: User): Promise<{ error?: string; needsConfirm?: boolean }> {
  const { data, error } = await supabase.auth.signUp({
    email: u.email,
    password: u.password ?? "",
    options: {
      data: {
        username: u.username,
        full_name: u.name,
        school: u.school,
        phone: u.phone ?? null,
        ...signupActivityMetadata(),
      },
    },
  });
  if (error) return { error: error.message };
  if (data.session && u.avatar) {
    await supabase.from("profiles").update({ avatar_url: u.avatar }).eq("id", data.session.user.id);
  }
  return { needsConfirm: !data.session };
}

export async function signIn(email: string, password: string): Promise<string | null> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return error.message;
  return null;
}

export async function signOut() {
  if (activeRealtimeUnsub) {
    activeRealtimeUnsub();
    activeRealtimeUnsub = null;
  }
  await supabase.auth.signOut();
  actions.setUser(null);
  actions.clearSavedItems();
}

export async function updateProfile(
  u: User,
  change: PhotoChange = {},
): Promise<{ error?: string; warning?: string; user?: User }> {
  try {
    const result = await saveProfile(u, change);
    // A sign-out/account switch during the request must not restore the previous identity.
    if (getStoreState().user?.id === result.user.id) actions.setUser(result.user);
    return { ...(result.warning ? { warning: result.warning } : {}), user: result.user };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "We couldn't save your profile. Try again.",
    };
  }
}
