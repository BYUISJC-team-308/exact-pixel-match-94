import { useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabase";

export type User = {
  id: string;
  username: string;
  name: string;
  email: string;
  school: string;
  phone?: string;
  avatar?: string;
};

type State = { savedDeals: string[]; savedEvents: string[]; usedSS: string[]; user: User | null; ready: boolean };
const empty: State = { savedDeals: [], savedEvents: [], usedSS: [], user: null, ready: false };
let state: State = empty;
let started = false;
const listeners = new Set<() => void>();

function set(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

function profile(authUser: { id: string; email?: string; user_metadata?: Record<string, unknown> }): User {
  const metadata = authUser.user_metadata ?? {};
  return {
    id: authUser.id,
    email: authUser.email ?? "",
    username: String(metadata["username"] ?? ""),
    name: String(metadata["name"] ?? ""),
    school: String(metadata["school"] ?? ""),
    phone: String(metadata["phone"] ?? ""),
    avatar: String(metadata["avatar"] ?? ""),
  };
}

async function loadSaved(userId: string) {
  const { data, error } = await supabase.from("saved_items")
    .select("item_type,item_id").eq("user_id", userId);
  if (error) { console.error("Could not load saved items:", error.message); return; }
  if (state.user?.id !== userId) return;
  set({
    savedDeals: (data ?? []).filter((item) => item.item_type === "discount").map((item) => item.item_id),
    savedEvents: (data ?? []).filter((item) => item.item_type === "food_event").map((item) => item.item_id),
  });
}

function initialize() {
  if (started || typeof window === "undefined") return;
  started = true;
  // Preserve the non-sensitive tracker before deleting the old state,
  // which included a plain-text password.
  try {
    const legacy = JSON.parse(localStorage.getItem("studeats-state") ?? "{}");
    if (Array.isArray(legacy.usedSS) && !localStorage.getItem("studeats-used-ss")) {
      localStorage.setItem("studeats-used-ss", JSON.stringify(legacy.usedSS.filter((id: unknown) => typeof id === "string")));
    }
  } catch { /* Ignore corrupt legacy state. */ }
  localStorage.removeItem("studeats-state");
  try {
    const used = JSON.parse(localStorage.getItem("studeats-used-ss") ?? "[]");
    if (Array.isArray(used)) set({ usedSS: used.filter((id): id is string => typeof id === "string") });
  } catch { /* Ignore corrupt local preferences. */ }
  void supabase.auth.getUser().then(({ data, error }) => {
    if (error || !data.user) { set({ ...empty, usedSS: state.usedSS, ready: true }); return; }
    set({ user: profile(data.user), ready: true });
    void loadSaved(data.user.id);
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    if (!session?.user) set({ ...empty, usedSS: state.usedSS, ready: true });
    else {
      set({ user: profile(session.user), ready: true });
      void loadSaved(session.user.id);
    }
  });
}

export function useStore() {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    () => { initialize(); return state; },
    () => empty,
  );
}

async function toggleSaved(itemType: "discount" | "food_event", itemId: string) {
  initialize();
  const user = state.user;
  if (!user) { window.alert("Sign in to save items to your account."); return; }
  const key = itemType === "discount" ? "savedDeals" : "savedEvents";
  if (state[key].includes(itemId)) {
    const { error } = await supabase.from("saved_items").delete()
      .eq("user_id", user.id).eq("item_type", itemType).eq("item_id", itemId);
    if (error) { window.alert(`Could not remove saved item: ${error.message}`); return; }
    set({ [key]: state[key].filter((id) => id !== itemId) });
    return;
  }
  const { error } = await supabase.from("saved_items")
    .insert({ user_id: user.id, item_type: itemType, item_id: itemId });
  if (error) { window.alert(`Could not save item: ${error.message}`); return; }
  set({ [key]: [...state[key], itemId] });
}

export const actions = {
  toggleDeal: (id: string) => { void toggleSaved("discount", id); },
  toggleEvent: (id: string) => { void toggleSaved("food_event", id); },
  toggleUsed: (id: string) => {
    const usedSS = state.usedSS.includes(id) ? state.usedSS.filter((item) => item !== id) : [...state.usedSS, id];
    set({ usedSS });
    localStorage.setItem("studeats-used-ss", JSON.stringify(usedSS));
  },
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },
  updateProfile: async (next: Omit<User, "id">) => {
    const { data, error } = await supabase.auth.updateUser({
      data: { username: next.username, name: next.name, school: next.school, phone: next.phone },
    });
    if (error) throw error;
    if (data.user) set({ user: profile(data.user) });
  },
};
