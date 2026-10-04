import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AccountForm } from "@/components/AccountForm";
import { PageHeader } from "@/components/ui-bits";
import { actions } from "@/lib/store";

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
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Free forever" title="Create your account">
        <Link to="/" className="text-sm font-medium text-primary hover:underline">← Back home</Link>
      </PageHeader>
      <AccountForm submitLabel="Create account" onSubmit={(u) => { actions.setUser(u); navigate({ to: "/profile" }); }} />
    </div>
  );
}
