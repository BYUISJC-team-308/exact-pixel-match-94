import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AccountForm } from "@/components/AccountForm";
import { Btn, PageHeader } from "@/components/ui-bits";
import { actions, useStore } from "@/lib/store";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your Profile — Studeats" },
      { name: "description", content: "View and update your Studeats account information." },
      { property: "og:title", content: "Your Profile — Studeats" },
      { property: "og:description", content: "Manage your Studeats account." },
    ],
  }),
  component: Profile,
});

function Profile() {
  const { user } = useStore();
  const [saved, setSaved] = useState(false);
  if (!user) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <h1 className="text-3xl font-semibold">No account yet</h1>
        <p className="mt-2 text-muted-foreground">Create one to save deals and events.</p>
        <Link to="/account" className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">Create account</Link>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow={`@${user.username} · ${user.school}`} title={`Hi, ${user.name.split(" ")[0]}`}>
        <div className="flex gap-2">
          <Link to="/" className="inline-flex items-center rounded-full bg-secondary px-4 py-2 text-sm font-medium ring-1 ring-border">← Home</Link>
          <Btn variant="soft" onClick={() => actions.setUser(null)}>Sign out</Btn>
        </div>
      </PageHeader>
      {saved && <p className="mb-3 text-sm font-medium text-primary">Changes saved.</p>}
      <AccountForm initial={user} submitLabel="Save changes" onSubmit={(u) => { actions.setUser(u); setSaved(true); }} />
    </div>
  );
}
