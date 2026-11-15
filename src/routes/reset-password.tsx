import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  completePasswordRecovery,
  recoveryAccount,
  subscribeToRecovery,
} from "@/lib/password-recovery";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password | Student Steals" }] }),
  component: ResetPassword,
});

function ResetPassword() {
  const account = useSyncExternalStore(subscribeToRecovery, recoveryAccount, () => null);
  const [checked, setChecked] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "INITIAL_SESSION") setChecked(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <section className="glass mx-auto mt-10 w-full max-w-md p-5 sm:p-6">
      <h1 className="text-3xl font-semibold">Reset password</h1>
      {done ? (
        <p className="mt-4" role="status">
          Password updated.
        </p>
      ) : account ? (
        <form
          className="mt-4 grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (busy) return;
            setError("");
            if (password !== confirm) {
              setError("The passwords don’t match.");
              return;
            }
            setBusy(true);
            try {
              const message = await completePasswordRecovery(password);
              if (message) setError(message);
              else {
                setDone(true);
                setPassword("");
                setConfirm("");
              }
            } catch {
              setError("Couldn’t update your password. Check your connection and try again.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <fieldset disabled={busy} className="grid min-w-0 gap-4">
            <label className="grid gap-1 text-sm">
              New password
              <input
                className="h-11 rounded-lg bg-background px-3 ring-1 ring-border"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              Confirm new password
              <input
                className="h-11 rounded-lg bg-background px-3 ring-1 ring-border"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
              />
            </label>
            <button
              className="min-h-11 rounded-full bg-primary px-4 font-semibold text-primary-foreground"
              type="submit"
            >
              {busy ? "Updating password…" : "Update password"}
            </button>
          </fieldset>
        </form>
      ) : (
        <p className="mt-4" role="status">
          {checked
            ? "Open a reset link from your email. If your link expired, request another one."
            : "Checking your reset link…"}
        </p>
      )}
      {error && (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {done ? (
        <Link className="mt-4 inline-flex min-h-11 items-center underline" to="/profile">
          Return to your profile
        </Link>
      ) : (
        <Link
          className="mt-4 inline-flex min-h-11 items-center underline"
          to="/signin"
          search={{ recovery: true }}
        >
          Request a reset link
        </Link>
      )}
    </section>
  );
}
