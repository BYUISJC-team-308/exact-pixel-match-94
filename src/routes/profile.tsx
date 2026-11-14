import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ProfileEditor } from "@/components/ProfileEditor";
import { Btn, PageHeader, DealDetail } from "@/components/ui-bits";
import { useStore } from "@/lib/store";
import { signOut } from "@/lib/auth";
import { AnalyticsDrawerModal } from "@/components/AnalyticsDrawerModal";
import {
  useUserSubmittedDealsQuery,
  calculateVerificationScore,
} from "@/lib/deal-verification";
import type { Deal } from "@/lib/data";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your Profile — Student Steals" },
      {
        name: "description",
        content: "View and update your Student Steals profile.",
      },
      { property: "og:title", content: "Your Profile — Student Steals" },
      { property: "og:description", content: "Manage your Student Steals account." },
    ],
  }),
  component: Profile,
});

function Profile() {
  const { user, authReady, savedDeals = [], savedEvents = [] } = useStore();
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);

  const { data: userDeals = [], isLoading: loadingDeals } = useUserSubmittedDealsQuery();

  if (!authReady) {
    return (
      <p className="py-20 text-center text-muted-foreground" role="status">
        Checking your account…
      </p>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <h1 className="text-3xl font-semibold">Sign in to your profile</h1>
        <p className="mt-2 text-muted-foreground">
          Sign in to edit your profile and photo, and view your saved offers and events.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
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
            📊 Team OKRs
          </button>
          <Link
            to="/admin"
            className="inline-flex rounded-full bg-secondary px-4 py-2.5 text-sm font-medium ring-1 ring-border hover:bg-glass"
          >
            🛡️ Admin Reports
          </Link>
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
            className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-4 py-2 text-sm font-semibold text-primary hover:bg-accent/25 transition-colors"
          >
            📊 Team OKRs
          </button>
          <Link
            to="/admin"
            className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-4 py-2 text-sm font-semibold ring-1 ring-border hover:bg-glass transition-colors"
          >
            🛡️ Admin Reports
          </Link>
          <a
            href="/#my-hub"
            className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-4 py-2 text-sm font-semibold ring-1 ring-border hover:bg-glass transition-colors"
          >
            ★ My Hub
          </a>
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

      <ProfileEditor key={user.id} initial={user} />

      {/* Account Saved Items Overview */}
      <section className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm" aria-labelledby="saved-overview-heading">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 id="saved-overview-heading" className="text-xl font-bold tracking-tight text-foreground">
                My Saved Items
              </h2>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {(savedDeals?.length ?? 0) + (savedEvents?.length ?? 0)} total
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Discounts and food events synced to your account across your devices.
            </p>
          </div>
          <a
            href="/#my-hub"
            className="inline-flex items-center rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Open My Hub →
          </a>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border/70 bg-secondary/40 p-3.5">
            <span className="text-xs font-medium text-muted-foreground">Saved Deals</span>
            <p className="mt-1 text-2xl font-bold text-foreground">{savedDeals?.length ?? 0}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-secondary/40 p-3.5">
            <span className="text-xs font-medium text-muted-foreground">Saved Food Events</span>
            <p className="mt-1 text-2xl font-bold text-foreground">{savedEvents?.length ?? 0}</p>
          </div>
          <div className="col-span-2 rounded-xl border border-border/70 bg-secondary/40 p-3.5 sm:col-span-1">
            <span className="text-xs font-medium text-muted-foreground">Cloud Sync</span>
            <p className="mt-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">✓ Supabase Active</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">Live multi-device sync</p>
          </div>
        </div>
      </section>

      {/* User Submission History Section */}
      <section className="mt-10 rounded-2xl border border-border bg-card p-6 shadow-sm" aria-labelledby="submissions-heading">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 id="submissions-heading" className="text-xl font-bold tracking-tight text-foreground">
                My Submitted Deals
              </h2>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {userDeals.length} {userDeals.length === 1 ? "deal" : "deals"}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Deals you’ve contributed to the student community and their verification status.
            </p>
          </div>
          <Link
            to="/discounts"
            className="inline-flex items-center rounded-full bg-secondary px-3.5 py-1.5 text-xs font-semibold ring-1 ring-border hover:bg-glass"
          >
            + Post another deal
          </Link>
        </div>

        {loadingDeals ? (
          <p className="py-8 text-center text-xs text-muted-foreground">Loading your deal submissions…</p>
        ) : userDeals.length > 0 ? (
          <div className="mt-4 divide-y divide-border/50">
            {userDeals.map((deal) => {
              const score = calculateVerificationScore(deal.realVotesCount, deal.fakeVotesCount);
              const isVerified = deal.verificationStatus === "verified";
              return (
                <div
                  key={deal.id}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-foreground text-sm truncate">{deal.company}</h3>
                      <span className="rounded-lg bg-accent/15 px-2 py-0.5 text-xs font-bold text-accent">
                        {deal.value}
                      </span>
                      {isVerified ? (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          ✓ Team Verified
                        </span>
                      ) : (
                        <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-accent">
                          👥 Community Active
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{deal.title}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full bg-secondary px-2.5 py-1 font-semibold text-foreground ring-1 ring-border">
                      ▲ {deal.upvotesCount || 0} upvotes
                    </span>
                    <span className={`rounded-full px-2.5 py-1 font-semibold ${score.badgeColor}`}>
                      {score.hasVotes ? `${score.percentage}% Real (${score.total})` : "No votes yet"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedDeal(deal)}
                      className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary hover:bg-primary/20"
                    >
                      View →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-dashed border-border/80 p-8 text-center">
            <span className="text-2xl">🏷️</span>
            <p className="mt-2 text-sm font-semibold text-foreground">No deal submissions yet</p>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
              Found a student special or local discount? Share it with other students on the Discount Dashboard.
            </p>
            <Link
              to="/discounts"
              className="mt-4 inline-flex items-center rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Browse & Share Deals
            </Link>
          </div>
        )}
      </section>

      {/* Embedded Admin Drawer / Profile Modal (Question 3 Answer) */}
      <AnalyticsDrawerModal open={analyticsOpen} onClose={() => setAnalyticsOpen(false)} />
      <DealDetail deal={selectedDeal} onClose={() => setSelectedDeal(null)} />
    </div>
  );
}
