import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { MAX_EMAIL_LENGTH } from "@/lib/profile";

export function SignInForm({
  onSubmit,
}: {
  onSubmit: (email: string, password: string) => Promise<string | null>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="glass mx-auto grid max-w-md gap-4 p-4 sm:p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          setErr(await onSubmit(email.trim(), password));
        } catch {
          setErr("Couldn’t sign in. Check your connection and try again.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="block text-sm">
        <span className="font-medium">Email</span>
        <input name="user_email" required type="email" maxLength={MAX_EMAIL_LENGTH} autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)}
          className="mt-1 h-11 w-full rounded-lg bg-glass/80 px-3 ring-1 ring-border outline-none focus:ring-2 focus:ring-ring" />
      </label>
      <label className="block text-sm">
        <span className="font-medium">Password</span>
        <input name="user_password" required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)}
          className="mt-1 h-11 w-full rounded-lg bg-glass/80 px-3 ring-1 ring-border outline-none focus:ring-2 focus:ring-ring" />
      </label>
      {err && <span role="alert" className="text-xs text-destructive">{err}</span>}
      <button type="submit" disabled={busy || !email || !password}
        className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50">
        {busy ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-center text-xs text-muted-foreground">
        New here? <Link to="/account" className="text-primary underline">Create an account</Link>
      </p>
    </form>
  );
}
