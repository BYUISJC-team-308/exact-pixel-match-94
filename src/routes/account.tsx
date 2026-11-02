import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AccountForm, type AccountInput } from "@/components/AccountForm";
import { PageHeader } from "@/components/ui-bits";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Create an Account — Studeats" },
      { name: "description", content: "Sign up to save discounts, free food events and your school info." },
      { property: "og:title", content: "Create an Account — Studeats" },
      { property: "og:description", content: "Save deals and events with a free Studeats account." },
    ],
  }),
  component: Account,
});

function Account() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function signUp(input: AccountInput) {
    setBusy(true);
    setMessage("");
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password ?? "",
      options: { data: {
        username: input.username,
        name: input.name,
        school: input.school,
        phone: input.phone ?? "",
      } },
    });
    setBusy(false);
    if (error) { setMessage(error.message); return; }
    if (data.session) void navigate({ to: "/profile" });
    else setMessage("Check your email to confirm your account, then sign in.");
  }

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) { setMessage(error.message); return; }
    void navigate({ to: "/profile" });
  }
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Free forever" title="Create your account">
        <Link to="/" className="text-sm font-medium text-primary hover:underline">← Back home</Link>
      </PageHeader>
      <div className="mb-5 flex gap-3">
        <button type="button" onClick={() => { setMode("signup"); setMessage(""); }} aria-pressed={mode === "signup"} className="rounded-full bg-secondary px-4 py-2 text-sm">Create account</button>
        <button type="button" onClick={() => { setMode("signin"); setMessage(""); }} aria-pressed={mode === "signin"} className="rounded-full bg-secondary px-4 py-2 text-sm">Sign in</button>
      </div>
      {message && <p role="status" className="mb-4 text-sm">{message}</p>}
      {mode === "signup" ? (
        <div aria-busy={busy}><AccountForm submitLabel="Create account" requirePassword onSubmit={(input) => { void signUp(input); }} /></div>
      ) : (
        <form onSubmit={(event) => { void signIn(event); }} className="glass grid max-w-md gap-4 p-6" aria-busy={busy}>
          <label className="text-sm">Email<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 h-11 w-full rounded-lg bg-glass/80 px-3 ring-1 ring-border" /></label>
          <label className="text-sm">Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 h-11 w-full rounded-lg bg-glass/80 px-3 ring-1 ring-border" /></label>
          <button type="submit" disabled={busy} className="rounded-full bg-primary px-5 py-2.5 text-sm text-primary-foreground disabled:opacity-50">Sign in</button>
        </form>
      )}
    </div>
  );
}
