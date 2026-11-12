import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import type { Deal, DealCategory } from "@/lib/data";
import { actions, useStore } from "@/lib/store";
import {
  DealDetail,
  FilterChips,
  PageHeader,
  SearchInput,
  chipTone,
  Btn,
  CompanyLogo,
} from "@/components/ui-bits";
import { useDealsQuery, getDealScore } from "@/lib/deals";
import { SubmitDealModal } from "@/components/SubmitDealModal";
import { calculateVerificationScore } from "@/lib/deal-verification";

export const Route = createFileRoute("/discounts")({
  head: () => ({
    meta: [
      { title: "Discount Dashboard — Studeats" },
      {
        name: "description",
        content:
          "Browse, search, filter and save student discounts on food, tech, AI tools and subscriptions.",
      },
      { property: "og:title", content: "Discount Dashboard — Studeats" },
      {
        property: "og:description",
        content: "Browse listed student discounts and check provider requirements.",
      },
    ],
  }),
  component: Discounts,
});

const cats = [
  "All",
  "New",
  "Saved",
  "Apparel",
  "Tech",
  "Fitness",
  "Food",
  "AI",
  "Subscription",
  "Groceries",
  "Travel",
  "Free",
  "Percent off",
] as const;
type Cat = (typeof cats)[number];

function Discounts() {
  const { savedDeals } = useStore();
  const [cat, setCat] = useState<Cat>("All");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"best" | "company">("best");
  const [communitySort, setCommunitySort] = useState<"upvotes" | "newest" | "rating">("upvotes");
  const [open, setOpen] = useState<Deal | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);

  const {
    data: deals = [],
    isPending,
    isLoading: initialFetchLoading,
    isError,
    refetch,
  } = useDealsQuery();
  const isLoading = isPending ?? initialFetchLoading;

  const t = q.toLowerCase();
  const filtered = deals.filter((d) => {
    if (cat === "New" && !d.isNew) return false;
    if (cat === "Saved" && !savedDeals.includes(d.id)) return false;
    if ((cat === "Free" || cat === "Percent off") && d.type !== cat) return false;
    if (!["All", "New", "Saved", "Free", "Percent off"].includes(cat)) {
      const match =
        d.category === cat || (d.categories && d.categories.includes(cat as DealCategory));
      if (!match) return false;
    }
    const catStr = d.categories ? d.categories.join(" ") : d.category;
    return !t || (d.title + d.company + d.description + catStr).toLowerCase().includes(t);
  });

  // Separate into Verified Deals vs Community Deals
  const rawVerified = filtered.filter((d) => d.verificationStatus !== "community");
  const rawCommunity = filtered.filter((d) => d.verificationStatus === "community");

  let verifiedList = [...rawVerified];
  if (sort === "best") {
    verifiedList.sort(
      (a, b) => getDealScore(b) - getDealScore(a) || a.company.localeCompare(b.company),
    );
  } else if (sort === "company") {
    verifiedList.sort((a, b) => a.company.localeCompare(b.company));
  }

  const communityList = [...rawCommunity].sort((a, b) => {
    if (communitySort === "upvotes") {
      return (b.upvotesCount ?? 0) - (a.upvotesCount ?? 0) || (b.createdAt || "").localeCompare(a.createdAt || "");
    }
    if (communitySort === "newest") {
      return (b.createdAt || "").localeCompare(a.createdAt || "");
    }
    if (communitySort === "rating") {
      const scoreA = calculateVerificationScore(a.realVotesCount, a.fakeVotesCount);
      const scoreB = calculateVerificationScore(b.realVotesCount, b.fakeVotesCount);
      return scoreB.percentage - scoreA.percentage || (b.upvotesCount ?? 0) - (a.upvotesCount ?? 0);
    }
    return 0;
  });

  const renderCard = (d: Deal, isCommunity = false) => {
    const saved = savedDeals.includes(d.id);
    const score = calculateVerificationScore(d.realVotesCount, d.fakeVotesCount);
    return (
      <div
        key={d.id}
        className="glass group relative flex flex-col justify-between overflow-hidden p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-float border border-border/70 hover:border-border"
      >
        <div>
          {/* Top Bar: Verification Badge, Category Pills & Save Star */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {isCommunity ? (
                <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-semibold text-accent">
                  👥 Community
                </span>
              ) : (
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  ✓ Verified
                </span>
              )}
              {(d.categories && d.categories.length > 0 ? d.categories : [d.category]).map(
                (cName, cIdx) => (
                  <span
                    key={cName}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${chipTone(cIdx)}`}
                  >
                    {cName}
                  </span>
                ),
              )}
              {d.isNew && (
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  New
                </span>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                actions.toggleDeal(d.id);
              }}
              aria-label={saved ? "Unsave deal" : "Save deal"}
              className={`text-2xl transition-transform active:scale-125 ${
                saved ? "text-gold" : "text-muted-foreground/50 hover:text-gold"
              }`}
            >
              {saved ? "★" : "☆"}
            </button>
          </div>

          {/* Main Card Content */}
          <button
            onClick={() => setOpen(d)}
            className="mt-3.5 block w-full text-left focus:outline-none"
          >
            {/* 1. Company Name & Logo at the Top */}
            <div className="flex items-center gap-3">
              <CompanyLogo company={d.company} url={d.url} size={44} />
              <div className="min-w-0 flex-1">
                <h3 className="text-xl font-bold tracking-tight text-foreground truncate group-hover:text-primary transition-colors">
                  {d.company}
                </h3>
                <p className="text-xs text-muted-foreground truncate font-medium">
                  {d.category} · Check provider terms
                </p>
              </div>
            </div>

            {/* 2. Noticeable Percent Off / Value & Upvotes */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center rounded-lg bg-accent/15 px-2.5 py-1 text-sm font-bold text-accent ring-1 ring-accent/30">
                🏷️ {d.value}
              </span>

              {isCommunity && (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="rounded-full bg-secondary px-2 py-0.5 font-bold text-foreground ring-1 ring-border">
                    ▲ {d.upvotesCount || 0}
                  </span>
                  {score.hasVotes && (
                    <span className={`rounded-full px-2 py-0.5 font-semibold ${score.badgeColor}`}>
                      {score.percentage}% Real
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Submitter Attribution for Community Deals */}
            {isCommunity && (
              <p className="mt-2 text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <span>Posted by</span>
                <span className="text-primary font-semibold">@{d.submitterUsername || "student"}</span>
              </p>
            )}

            {/* 3. Description */}
            <p className="mt-2.5 text-sm text-muted-foreground line-clamp-3 leading-relaxed">
              {d.description}
            </p>
          </button>
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between pt-3 border-t border-border/50">
          <button
            onClick={() => setOpen(d)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            View redemption details →
          </button>
          {d.url && (
            <a
              href={d.url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Website ↗
            </a>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <PageHeader
        eyebrow={
          isLoading
            ? "Loading discounts…"
            : isError
              ? "Discounts couldn’t load"
              : `${deals.length} student discounts`
        }
        title="Discount Dashboard"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Btn
            onClick={() => setSubmitOpen(true)}
            className="h-10 rounded-full px-4 text-xs font-semibold shadow-sm hover:shadow"
          >
            + Share a Deal
          </Btn>
          <SearchInput value={q} onChange={setQ} placeholder="Search company, deal, category" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as "best" | "company")}
            aria-label="Sort verified discounts"
            className="h-10 rounded-full bg-secondary px-3 text-sm ring-1 ring-border font-medium cursor-pointer"
          >
            <option value="best">Sort: Best deals</option>
            <option value="company">Sort: Alphabetical (A–Z)</option>
          </select>
        </div>
      </PageHeader>
      <FilterChips options={cats} value={cat} onChange={setCat} />

      {isLoading && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="glass animate-pulse p-5">
              <div className="flex items-center justify-between">
                <div className="h-4 w-20 rounded-full bg-muted" />
                <div className="h-5 w-5 rounded bg-muted" />
              </div>
              <div className="mt-4 flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-muted" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-5 w-32 rounded bg-muted" />
                  <div className="h-3 w-20 rounded bg-muted" />
                </div>
              </div>
              <div className="mt-3.5 h-6 w-28 rounded-lg bg-muted" />
              <div className="mt-2.5 h-4 w-full rounded bg-muted" />
              <div className="mt-1.5 h-4 w-3/4 rounded bg-muted" />
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div role="alert" className="glass mt-8 p-8 text-center">
          <p className="font-semibold text-destructive">
            Discounts couldn’t load. Check your connection and try again.
          </p>
          <Btn variant="soft" onClick={() => refetch()} className="mt-4">
            Try again
          </Btn>
        </div>
      )}

      {!isLoading && !isError && (
        filtered.length === 0 ? (
          <div className="mt-6 glass p-10 text-center">
            <div className="text-3xl">🏷️</div>
            <h4 className="mt-3 text-lg font-semibold">
              {q
                ? "No matching discounts found"
                : cat === "Saved"
                  ? "No saved discounts yet"
                  : "No discounts in this category yet"}
            </h4>
            <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
              {q
                ? `No discounts match "${q}". Try a different search or clear the filters.`
                : cat === "Saved"
                  ? "Tap a discount’s star to save it here on this browser."
                  : "No discounts are listed here right now. Try another category or check the provider directly."}
            </p>
            {(q || cat !== "All") && (
              <button
                onClick={() => {
                  setQ("");
                  setCat("All");
                }}
                className="mt-4 inline-flex items-center rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20"
              >
                Reset filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-12 mt-6">
            {/* SECTION 1: VERIFIED DEALS */}
            {verifiedList.length > 0 && (
              <section aria-labelledby="verified-deals-heading">
                <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border/60 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 id="verified-deals-heading" className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                        Verified Deals
                      </h2>
                      <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        {verifiedList.length} verified
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Reviewed and confirmed student offers from our team and official partners.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {verifiedList.map((d) => renderCard(d, false))}
                </div>
              </section>
            )}

            {/* SECTION 2: COMMUNITY DEALS */}
            <section aria-labelledby="community-deals-heading">
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border/60 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 id="community-deals-heading" className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                      Community Deals
                    </h2>
                    <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-semibold text-accent">
                      {communityList.length} submissions
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    User-submitted discounts awaiting review or verified by student votes.
                  </p>
                </div>

                {/* Community Sorting Controls */}
                <div className="flex items-center gap-1.5 text-xs font-medium">
                  <span className="text-muted-foreground">Sort:</span>
                  <select
                    value={communitySort}
                    onChange={(e) => setCommunitySort(e.target.value as "upvotes" | "newest" | "rating")}
                    aria-label="Sort community deals"
                    className="h-8 rounded-lg bg-secondary px-2.5 text-xs ring-1 ring-border font-medium cursor-pointer"
                  >
                    <option value="upvotes">Most Upvoted</option>
                    <option value="newest">Newest</option>
                    <option value="rating">Highest Verification Rating</option>
                  </select>
                </div>
              </div>

              {communityList.length > 0 ? (
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {communityList.map((d) => renderCard(d, true))}
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-border/80 p-8 text-center">
                  <p className="text-sm font-medium text-foreground">No community-submitted deals yet in this filter.</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Know a great student special or happy hour deal? Be the first to share it!
                  </p>
                  <button
                    onClick={() => setSubmitOpen(true)}
                    className="mt-3 inline-flex rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20"
                  >
                    + Share a Deal Now
                  </button>
                </div>
              )}
            </section>
          </div>
        )
      )}

      {open && <DealDetail deal={open} onClose={() => setOpen(null)} />}
      {submitOpen && <SubmitDealModal open={submitOpen} onClose={() => setSubmitOpen(false)} />}
    </>
  );
}
