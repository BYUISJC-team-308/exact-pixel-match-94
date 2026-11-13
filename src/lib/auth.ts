import { supabase } from "@/lib/supabase";
import { actions, getStoreState, type User } from "@/lib/store";
import { endActivityVisit, logActivityEvent, signupActivityMetadata } from "@/lib/analytics";
import { syncAndMergeGuestSaves } from "@/lib/saved";

type ProfileRow = {
  username: string;
  full_name: string | null;
  email: string | null;
  school: string;
  phone: string | null;
  avatar_url: string | null;
};

function toUser(p: ProfileRow, id?: string): User {
  return {
    ...(id ? { id } : {}),
    username: p.username,
    name: p.full_name ?? p.username,
    email: p.email ?? "",
    school: p.school,
    ...(p.phone ? { phone: p.phone } : {}),
    ...(p.avatar_url ? { avatar: p.avatar_url } : {}),
  };
}

async function syncUser(authUserId: string | null) {
  if (!authUserId) {
    actions.setUser(null);
  } else {
    const { data } = await supabase.from("profiles").select("*").eq("id", authUserId).maybeSingle();
    actions.setUser(data ? toUser(data as ProfileRow, authUserId) : null);
    try {
      const currentState = getStoreState();
      const merged = await syncAndMergeGuestSaves(
        authUserId,
        currentState.savedDeals,
        currentState.savedEvents
      );
      actions.setSavedItems(merged);
    } catch (err) {
      console.warn("Could not sync saved items on sign-in:", err);
    }
  }
  actions.setAuthReady();
}

let started = false;
export function initAuth() {
  if (started || typeof window === "undefined") return;
  started = true;
  // Fires once on load with the saved session, then on every sign-in / sign-out.
  // Deferred so we never await Supabase calls inside the callback itself.
  supabase.auth.onAuthStateChange((event, session) => {
    setTimeout(() => {
      if (event === "SIGNED_OUT") endActivityVisit();
      const account = session?.user.id;
      if (account && (event === "INITIAL_SESSION" || event === "SIGNED_IN")) {
        void logActivityEvent("session_start", {}, account);
      }
      void syncUser(account ?? null);
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
  await supabase.auth.signOut();
  actions.setUser(null);
  actions.clearSavedItems();
}

export async function updateProfile(u: User): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) return "You're signed out. Please sign in again.";
  const { error } = await supabase
    .from("profiles")
    .update({
      username: u.username,
      full_name: u.name,
      school: u.school,
      phone: u.phone ?? null,
      avatar_url: u.avatar ?? null,
    })
    .eq("id", id);
  if (error) return error.code === "23505" ? "That username is already taken." : error.message;
  actions.setUser({ ...u });
  return null;
}
