import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AccountForm } from "@/components/AccountForm";
import { PageHeader } from "@/components/ui-bits";
import { signUp } from "@/lib/auth";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Create an Account — Studeats" },
      {
        name: "description",
        content: "Create a profile with your name, school, and optional photo.",
      },
      { property: "og:title", content: "Create an Account — Studeats" },
      { property: "og:description", content: "Create and manage your Studeats profile." },
    ],
  }),
  component: Account,
});

function Account() {
  const navigate = useNavigate();
  const [notice, setNotice] = useState<string | null>(null);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Your student profile" title="Create your account">
        <Link to="/" className="text-sm font-medium text-primary hover:underline">
          ← Back home
        </Link>
      </PageHeader>
      <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
        An account lets you save your profile details. You can browse without signing in. Saved
        offers, events, and card-use tracking currently stay on this browser.
      </p>
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
        Already have an account?{" "}
        <Link to="/signin" className="text-primary underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
