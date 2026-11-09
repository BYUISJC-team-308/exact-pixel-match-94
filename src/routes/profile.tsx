import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AccountForm } from "@/components/AccountForm";
import { Btn, PageHeader } from "@/components/ui-bits";
import { useStore } from "@/lib/store";
import { signOut, updateProfile } from "@/lib/auth";
import { AnalyticsDrawerModal } from "@/components/AnalyticsDrawerModal";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your Profile — Studeats" },
      { name: "description", content: "View and update your Studeats account information and review team analytics." },
      { property: "og:title", content: "Your Profile — Studeats" },
      { property: "og:description", content: "Manage your Studeats account." },
    ],
  }),
  component: Profile,
});

function Profile() {
  const { user, authReady } = useStore();
  const [saved, setSaved] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);

  if (!authReady) {
    return <p className="py-20 text-center text-muted-foreground">Loading…</p>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <h1 className="text-3xl font-semibold">No account yet</h1>
        <p className="mt-2 text-muted-foreground">Create one to save deals and events.</p>
        <div className="mt-6 flex justify-center gap-2">
          <Link
            to="/account"
            className="inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
          >
            Create account
          </Link>
          <Link
            to="/signin"
            className="inline-flex rounded-full bg-secondary px-4 py-2.5 text-sm font-medium ring-1 ring-border hover:bg-glass"
          >
            Sign in
          </Link>
          <button
            onClick={() => setAnalyticsOpen(true)}
            className="inline-flex rounded-full bg-secondary px-4 py-2.5 text-sm font-medium ring-1 ring-border hover:bg-glass"
          >
            📊 Team Analytics
          </button>
        </div>
        <AnalyticsDrawerModal open={analyticsOpen} onClose={() => setAnalyticsOpen(false)} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow={`@${user.username} · ${user.school}`}
        title={`Hi, ${user.name.split(" ")[0]}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setAnalyticsOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-4 py-2 text-sm font-semibold text-accent hover:bg-accent/25 transition-colors"
          >
            📊 Team OKRs
          </button>
          <Link
            to="/"
            className="inline-flex items-center rounded-full bg-secondary px-4 py-2 text-sm font-medium ring-1 ring-border hover:bg-glass transition-colors"
          >
            ← Home
          </Link>
          <Btn variant="soft" onClick={() => void signOut()}>
            Sign out
          </Btn>
        </div>
      </PageHeader>

      {saved && <p className="mb-3 text-sm font-medium text-primary">Changes saved.</p>}
      <AccountForm
        initial={user}
        submitLabel="Save changes"
        onSubmit={async (u) => {
          setSaved(false);
          const err = await updateProfile(u);
          if (err) return err;
          setSaved(true);
          return null;
        }}
      />

      {/* Embedded Admin Drawer / Profile Modal (Question 3 Answer) */}
      <AnalyticsDrawerModal open={analyticsOpen} onClose={() => setAnalyticsOpen(false)} />
    </div>
  );
}