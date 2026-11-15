import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { requestPasswordRecovery } from "@/lib/password-recovery";
import { MAX_EMAIL_LENGTH } from "@/lib/profile";

export function PasswordRecoveryForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  return (
    <form
      className="glass mx-auto grid max-w-md gap-4 p-4 sm:p-6"
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy) return;
        setBusy(true);
        setSent(false);
        setError("");
        try {
          const { error } = await requestPasswordRecovery(email.trim());
          if (error) setError("Couldn’t request a reset link. Wait a moment and try again.");
          else setSent(true);
        } catch {
          setError("Couldn’t request a reset link. Check your connection and try again.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="grid gap-1 text-sm">
        Account email
        <input
          className="h-11 rounded-lg bg-background px-3 ring-1 ring-border"
          type="email"
          maxLength={MAX_EMAIL_LENGTH}
          autoComplete="email"
          required
          value={email}
          disabled={busy}
          onChange={(event) => {
            setEmail(event.target.value);
            setSent(false);
            setError("");
          }}
        />
      </label>
      <button
        type="submit"
        disabled={busy || sent}
        className="min-h-11 rounded-full bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-60"
      >
        {busy ? "Requesting link…" : "Email a reset link"}
      </button>
      {sent && (
        <p role="status">If that address has an account, check your inbox for a reset link.</p>
      )}
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      <Link className="inline-flex min-h-11 items-center underline" to="/signin" search={{}}>
        Back to sign in
      </Link>
    </form>
  );
}
