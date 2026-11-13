import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { logActivityEvent } from "@/lib/analytics";
import {
  saveUserDeal,
  unsaveUserDeal,
  saveUserEvent,
  unsaveUserEvent,
} from "@/lib/saved";

export type User = {
  id?: string;
  username: string;
  password?: string;
  name: string;
  email: string;
  school: string;
  phone?: string;
  avatar?: string;
  avatarPath?: string;
};

export type RecentMapSearch = {
  query: string;
  view: "area" | "campus";
  searchedAt: string;
};

type State = {
  savedDeals: string[];
  savedEvents: string[];
  usedSS: string[];
  ssUsedCounts?: Record<string, number>;
  recentMapSearches: RecentMapSearch[];
  preferredCampus: string;
  user: User | null;
  authReady: boolean;
};

const KEY = "studeats-state";
const empty: State = {
  savedDeals: [],
  savedEvents: [],
  usedSS: [],
  ssUsedCounts: {},
  recentMapSearches: [],
  preferredCampus: "byu-provo",
  user: null,
  authReady: false,
};

let state: State = empty;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Clean out any legacy mock deal IDs
      if (Array.isArray(parsed.savedDeals)) {
        parsed.savedDeals = parsed.savedDeals.filter(
          (id: string) => !["d1", "d2", "d3", "d4", "d5", "d6", "d7", "d8", "d9", "d10"].includes(id)
        );
      }
      if (!Array.isArray(parsed.recentMapSearches)) parsed.recentMapSearches = [];
      const counts = parsed.ssUsedCounts || {};
      if (Array.isArray(parsed.usedSS)) {
        parsed.usedSS.forEach((id: string) => {
          if (!counts[id]) counts[id] = 1;
        });
      }
      // User now comes from the Supabase session; never trust a locally saved one
      state = { ...empty, ...parsed, ssUsedCounts: counts, user: null, authReady: false };
      localStorage.setItem(KEY, JSON.stringify({ ...state, user: null, authReady: false }));
    } else {
      state = { ...empty, savedDeals: [] };
    }
  } catch {
    // Keep default state if browser storage is unavailable.
  }
}

function set(next: Partial<State>) {
  state = { ...state, ...next };
  localStorage.setItem(KEY, JSON.stringify({ ...state, user: null, authReady: false }));
  listeners.forEach((l) => l());
}

export function getStoreState(): State {
  load();
  return state;
}

export function useStore() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => {
      load();
      return state;
    },
    () => empty
  );
}

const toggle = (arr: string[], id: string) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

export function nextRecentMapSearches(
  current: RecentMapSearch[],
  query: string,
  view: RecentMapSearch["view"],
  searchedAt = new Date().toISOString()
) {
  const cleanQuery = query.trim().replace(/\s+/g, " ");
  if (cleanQuery.length < 2) return current;
  const withoutDuplicate = current.filter(
    (item) => item.view !== view || item.query.toLowerCase() !== cleanQuery.toLowerCase()
  );
  return [{ query: cleanQuery, view, searchedAt }, ...withoutDuplicate].slice(0, 8);
}

function navigateToHub() {
  if (typeof window === "undefined") return;
  const hubEl = document.getElementById("my-hub");
  if (hubEl && window.location.pathname === "/") {
    hubEl.scrollIntoView({ behavior: "smooth" });
  } else {
    window.location.href = "/#my-hub";
  }
}

export const actions = {
  setPreferredCampus: (preferredCampus: string) => set({ preferredCampus }),
  addRecentMapSearch: (query: string, view: RecentMapSearch["view"]) => {
    const next = nextRecentMapSearches(state.recentMapSearches, query, view);
    if (next !== state.recentMapSearches) set({ recentMapSearches: next });
  },
  clearRecentMapSearches: () => set({ recentMapSearches: [] }),
  setSavedItems: ({
    deals,
    events,
  }: {
    deals?: string[];
    events?: string[];
  }) => {
    const next: Partial<State> = {};
    if (deals !== undefined) next.savedDeals = deals;
    if (events !== undefined) next.savedEvents = events;
    set(next);
  },
  clearSavedItems: () => {
    set({ savedDeals: [], savedEvents: [] });
  },
  toggleDeal: (id: string, metadata?: { title?: string; company?: string }) => {
    const prevSaved = state.savedDeals;
    const isAdding = !prevSaved.includes(id);
    const nextSaved = toggle(prevSaved, id);
    set({ savedDeals: nextSaved });

    const label = metadata?.company || metadata?.title || "Deal";
    if (isAdding) {
      void logActivityEvent("deal_saved", { dealId: id });
      toast.success(`Saved ${label} to My Hub!`, {
        action: {
          label: "View My Hub",
          onClick: navigateToHub,
        },
      });
    } else {
      toast.info(`Removed ${label} from My Hub`);
    }

    // Persist to user account if signed in
    const userId = state.user?.id;
    if (userId) {
      (async () => {
        try {
          if (isAdding) {
            await saveUserDeal(userId, id);
          } else {
            await unsaveUserDeal(userId, id);
          }
        } catch (err) {
          console.error("Account deal save failed, rolling back:", err);
          set({ savedDeals: prevSaved });
          toast.error("Could not sync saved deal to your account. Check your connection.");
        }
      })();
    }
  },
  toggleEvent: (id: string, metadata?: { title?: string }) => {
    const prevSaved = state.savedEvents;
    const isAdding = !prevSaved.includes(id);
    const nextSaved = toggle(prevSaved, id);
    set({ savedEvents: nextSaved });

    const label = metadata?.title || "Event";
    if (isAdding) {
      void logActivityEvent("event_saved", { eventId: id });
      toast.success(`Saved "${label}" to My Hub!`, {
        action: {
          label: "View My Hub",
          onClick: navigateToHub,
        },
      });
    } else {
      toast.info(`Removed "${label}" from My Hub`);
    }

    // Persist to user account if signed in
    const userId = state.user?.id;
    if (userId) {
      (async () => {
        try {
          if (isAdding) {
            await saveUserEvent(userId, id);
          } else {
            await unsaveUserEvent(userId, id);
          }
        } catch (err) {
          console.error("Account food event save failed, rolling back:", err);
          set({ savedEvents: prevSaved });
          toast.error("Could not sync saved event to your account. Check your connection.");
        }
      })();
    }
  },
  toggleUsed: (id: string, maxUses?: number | null) => {
    const counts = { ...(state.ssUsedCounts || {}) };
    const current = counts[id] || 0;
    const isNoLimit = maxUses === null;
    const limit = isNoLimit ? Infinity : (maxUses ?? 1);

    if (current >= limit) {
      delete counts[id];
      const nextUsedSS = state.usedSS.filter((x) => x !== id);
      set({ usedSS: nextUsedSS, ssUsedCounts: counts });
    } else {
      const nextCount = current + 1;
      counts[id] = nextCount;
      const nextUsedSS = state.usedSS.includes(id) ? state.usedSS : [...state.usedSS, id];
      set({ usedSS: nextUsedSS, ssUsedCounts: counts });
      void logActivityEvent("deal_redeemed", { dealId: id });
    }
  },
  decrementUsed: (id: string) => {
    const counts = { ...(state.ssUsedCounts || {}) };
    const current = counts[id] || 0;
    if (current <= 1) {
      delete counts[id];
      const nextUsedSS = state.usedSS.filter((x) => x !== id);
      set({ usedSS: nextUsedSS, ssUsedCounts: counts });
    } else {
      counts[id] = current - 1;
      set({ ssUsedCounts: counts });
    }
  },
  resetUsed: (id: string) => {
    const counts = { ...(state.ssUsedCounts || {}) };
    delete counts[id];
    set({ usedSS: state.usedSS.filter((x) => x !== id), ssUsedCounts: counts });
  },
  resetAllUsedSS: () => {
    set({ usedSS: [], ssUsedCounts: {} });
  },
  setUser: (user: User | null) => set({ user }),
  setAuthReady: () => set({ authReady: true }),
};