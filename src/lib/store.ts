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

type State = { savedDeals: string[]; savedEvents: string[]; usedSS: string[]; user: User | null };
const KEY = "studeats-state";
const empty: State = { savedDeals: [], savedEvents: [], usedSS: [], user: null };
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
      state = { ...empty, ...parsed };
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

export const actions = {
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
  toggleUsed: (id: string) => {
    const isAdding = !state.usedSS.includes(id);
    if (isAdding) {
      void logActivityEvent("deal_redeemed", { dealId: id });
    }
    set({ usedSS: toggle(state.usedSS, id) });
  },
  setUser: (user: User | null) => {
    if (user && !state.user) {
      void logActivityEvent("signup", { username: user.username, email: user.email });
    }
    set({ user });
  },
};
