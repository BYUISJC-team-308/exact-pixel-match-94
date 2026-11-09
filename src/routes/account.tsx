import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AccountForm } from "@/components/AccountForm";
import { PageHeader } from "@/components/ui-bits";
import { signUp } from "@/lib/auth";

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
  const [notice, setNotice] = useState<string | null>(null);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Free forever" title="Create your account">
        <Link to="/" className="text-sm font-medium text-primary hover:underline">← Back home</Link>
      </PageHeader>
      <AccountForm
        submitLabel="Create account"
        onSubmit={async (u) => {
          const res = await signUp(u);
          if (res.error) return res.error;
          if (res.needsConfirm) {
            setNotice("Check your email to confirm your account, then sign in.");
            return null;
          }
          navigate({ to: "/profile" });
          return null;
        }}
      />
      {notice && <p className="mt-3 text-sm font-medium text-primary">{notice}</p>}
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Already have an account? <Link to="/signin" className="text-primary underline">Sign in</Link>
      </p>
    </div>
  );
}
