import { supabase } from "@/lib/supabase";

let recoveryUserId: string | null = null;
const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") {
      recoveryUserId = session?.user.id ?? null;
    } else if (event === "SIGNED_OUT" || session?.user.id !== recoveryUserId) {
      recoveryUserId = null;
    }
    listeners.forEach((listener) => listener());
  });
}

export function subscribeToRecovery(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const recoveryAccount = () => recoveryUserId;

export async function requestPasswordRecovery(email: string) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: new URL("/reset-password", window.location.origin).href,
  });
}

export async function completePasswordRecovery(password: string) {
  const account = recoveryUserId;
  const { data } = await supabase.auth.getSession();
  if (!account || recoveryUserId !== account || data.session?.user.id !== account) {
    return "This reset link is no longer active. Request a new one.";
  }
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return error.message;
  recoveryUserId = null;
  listeners.forEach((listener) => listener());
  return null;
}
