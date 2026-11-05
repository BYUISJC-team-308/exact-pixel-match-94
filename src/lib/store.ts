import { useSyncExternalStore } from "react";
import { logActivityEvent } from "@/lib/analytics";

export type User = {
  username: string;
  password: string;
  name: string;
  email: string;
  school: string;
  phone?: string;
  avatar?: string;
};

export type RecentMapSearch = {
  query: string;
  view: "area" | "campus";
  searchedAt: string;
};

type State = { savedDeals: string[]; savedEvents: string[]; usedSS: string[]; ssUsedCounts?: Record<string, number>; recentMapSearches: RecentMapSearch[]; preferredCampus: string; user: User | null };
const KEY = "studeats-state";
const empty: State = { savedDeals: [], savedEvents: [], usedSS: [], ssUsedCounts: {}, recentMapSearches: [], preferredCampus: "byu-provo", user: null };
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
      state = { ...empty, ...parsed, ssUsedCounts: counts };
    } else {
      state = { ...empty, savedDeals: [] };
    }
  } catch {}

  // Auto-log session start
  void logActivityEvent("session_start");
}

function set(next: Partial<State>) {
  state = { ...state, ...next };
  localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}

export function useStore() {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => { load(); return state; },
    () => empty,
  );
}

const toggle = (arr: string[], id: string) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

export function nextRecentMapSearches(current: RecentMapSearch[], query: string, view: RecentMapSearch["view"], searchedAt = new Date().toISOString()) {
  const cleanQuery = query.trim().replace(/\s+/g, " ");
  if (cleanQuery.length < 2) return current;
  const withoutDuplicate = current.filter((item) =>
    item.view !== view || item.query.toLowerCase() !== cleanQuery.toLowerCase()
  );
  return [{ query: cleanQuery, view, searchedAt }, ...withoutDuplicate].slice(0, 8);
}

export const actions = {
  setPreferredCampus: (preferredCampus: string) => set({ preferredCampus }),
  addRecentMapSearch: (query: string, view: RecentMapSearch["view"]) => {
    const next = nextRecentMapSearches(state.recentMapSearches, query, view);
    if (next !== state.recentMapSearches) set({ recentMapSearches: next });
  },
  clearRecentMapSearches: () => set({ recentMapSearches: [] }),
  toggleDeal: (id: string) => {
    const isAdding = !state.savedDeals.includes(id);
    if (isAdding) {
      void logActivityEvent("deal_saved", { dealId: id });
    }
    set({ savedDeals: toggle(state.savedDeals, id) });
  },
  toggleEvent: (id: string) => {
    const isAdding = !state.savedEvents.includes(id);
    if (isAdding) {
      void logActivityEvent("event_saved", { eventId: id });
    }
    set({ savedEvents: toggle(state.savedEvents, id) });
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
      void logActivityEvent("deal_redeemed", { dealId: id, timesUsed: nextCount });
      set({ usedSS: nextUsedSS, ssUsedCounts: counts });
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
  setUser: (user: User | null) => {
    if (user && !state.user) {
      void logActivityEvent("signup", { username: user.username, email: user.email });
    }
    set({ user });
  },
};
