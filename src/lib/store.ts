import { useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabase";

function deviceId() {
  let id = localStorage.getItem("studeats-device-id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("studeats-device-id", id);
  }
  return id;
}

async function loadPinsFromDb() {
  const { data, error } = await supabase
    .from("pinned_deals")
    .select("deal_id")
    .eq("device_id", deviceId());
  if (error) return console.error(error);
  set({ savedDeals: (data ?? []).map((r) => r.deal_id) });
}

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
  void loadPinsFromDb();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = { ...empty, ...JSON.parse(raw) };
    else state = { ...empty, savedDeals: ["d1", "d2", "d3"] };
  } catch {}
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
  toggleDeal: async (id: string) => {
  const dev = deviceId();
  const { error } = state.savedDeals.includes(id)
    ? await supabase.from("pinned_deals").delete().eq("device_id", dev).eq("deal_id", id)
    : await supabase.from("pinned_deals").insert({ device_id: dev, deal_id: id });
  if (error) return console.error(error);
  await loadPinsFromDb(); // updated list comes back from the database
},
  toggleEvent: (id: string) => set({ savedEvents: toggle(state.savedEvents, id) }),
  toggleUsed: (id: string) => set({ usedSS: toggle(state.usedSS, id) }),
  setUser: (user: User | null) => set({ user }),
};
