import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
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
import { AuthRequiredModal } from "@/components/AuthRequiredModal";
import {
  calculateVerificationScore,
  useToggleUpvoteMutation,
  useDealInteractionsQuery,
} from "@/lib/deal-verification";

export const discountTypes = [
  "All Deals",
  "Percent off",
  "Free / Trials",
  "Fixed price",
] as const;
export type DiscountType = (typeof discountTypes)[number];

export const discountStatusFilters = ["All", "Saved", "New"] as const;
export type DiscountStatusFilter = (typeof discountStatusFilters)[number];

export const discountCategories = [
  "All categories",
  "Apparel",
  "Tech",
  "Fitness",
  "Food",
  "AI",
  "Subscription",
  "Groceries",
  "Travel",
] as const;
export type DiscountCategory = (typeof discountCategories)[number];

export const discountSortOptions = [
  { value: "best", label: "Best Deals (Score)" },
  { value: "company-asc", label: "Company (A–Z)" },
  { value: "company-desc", label: "Company (Z–A)" },
  { value: "upvotes", label: "Most Upvoted" },
  { value: "free-first", label: "Free Deals First" },
  { value: "newest", label: "Newest Added" },
] as const;
export type DiscountSortOption = (typeof discountSortOptions)[number]["value"];

export const Route = createFileRoute("/discounts")({
  validateSearch: (search: Record<string, unknown>) => ({
    dealId: typeof search.dealId === "string" ? search.dealId : undefined,
    q: typeof search.q === "string" ? search.q : undefined,
    type:
      typeof search.type === "string" && (discountTypes as readonly string[]).includes(search.type)
        ? (search.type as DiscountType)
        : undefined,
    status:
      typeof search.status === "string" &&
      (discountStatusFilters as readonly string[]).includes(search.status)
        ? (search.status as DiscountStatusFilter)
        : undefined,
    category: typeof search.category === "string" ? search.category : undefined,
    sort:
      typeof search.sort === "string" && discountSortOptions.some((o) => o.value === search.sort)
        ? (search.sort as DiscountSortOption)
        : undefined,
    view:
      search.view === "grid" || search.view === "compact"
        ? (search.view as "grid" | "compact")
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Discount Dashboard — Student Steals" },
      {
        name: "description",
        content:
          "Browse, search, filter and save student discounts on food, tech, AI tools and subscriptions.",
      },
      { property: "og:title", content: "Discount Dashboard — Student Steals" },
      {
        property: "og:description",
        content: "Browse listed student discounts and check provider requirements.",
      },
    ],
  }),
  component: Discounts,
});

function DealCardUpvoteButton({
  deal,
  onRequireAuth,
}: {
  deal: Deal;
  onRequireAuth: (action: string) => void;
}) {
  const { user } = useStore();
  const upvoteMutation = useToggleUpvoteMutation(deal.id);
  const { data: interactions } = useDealInteractionsQuery(deal.id);

  const hasUpvoted = interactions?.hasUpvoted ?? false;
  const count = interactions ? interactions.upvotesCount : (deal.upvotesCount ?? 0);

  const handleUpvote = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      onRequireAuth("upvote deals");
      return;
    }
    upvoteMutation.mutate(undefined, {
      onSuccess: (res) => {
        toast.success(res.upvoted ? `Upvoted ${deal.company}!` : "Upvote removed.");
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : "Failed to upvote.");
      },
    });
  };

  return (
    <button
      type="button"
      onClick={handleUpvote}
      disabled={upvoteMutation.isPending}
      title={user ? (hasUpvoted ? "Remove upvote" : "Upvote this deal") : "Sign in to upvote"}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold transition-all ${
        hasUpvoted
          ? "bg-primary text-primary-foreground shadow-sm scale-105"
          : "bg-secondary text-muted-foreground ring-1 ring-border hover:bg-glass hover:text-foreground active:scale-95"
      }`}
    >
      <span className={hasUpvoted ? "text-primary-foreground" : "text-primary"}>▲</span>
      <span>{count}</span>
    </button>
  );
}

function Discounts() {
  let search: ReturnType<typeof Route.useSearch> | undefined;
  try {
    search = typeof Route.useSearch === "function" ? Route.useSearch() : undefined;
  } catch {
    search = undefined;
  }

  const { savedDeals } = useStore();
  const [q, setQ] = useState(search?.q ?? "");
  const [typeFilter, setTypeFilter] = useState<DiscountType>(search?.type ?? "All Deals");
  const [statusFilter, setStatusFilter] = useState<DiscountStatusFilter>(search?.status ?? "All");
  const [cat, setCat] = useState<string>(search?.category ?? "All categories");
  const [sort, setSort] = useState<DiscountSortOption>(search?.sort ?? "best");
  const [viewMode, setViewMode] = useState<"compact" | "grid">(search?.view ?? "grid");
  const [open, setOpen] = useState<Deal | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authAction, setAuthAction] = useState("upvote deals");

  // Sync viewMode with localStorage on mount if not specified in URL query
  useEffect(() => {
    if (!search?.view && typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("studeats_catalog_view");
        if (stored === "compact" || stored === "grid") {
          setViewMode(stored);
        }
      } catch {}
    }
  }, [search?.view]);

  const handleViewModeChange = (mode: "compact" | "grid") => {
    setViewMode(mode);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("studeats_catalog_view", mode);
      } catch {}
    }
  };

  const {
    data: deals = [],
    isPending,
    isLoading: initialFetchLoading,
    isError,
    refetch,
  } = useDealsQuery();
  const isLoading = isPending ?? initialFetchLoading;

  // Auto-open deal when directed via ?dealId= query parameter
  useEffect(() => {
    if (search?.dealId && deals.length > 0) {
      const target = deals.find((d) => d.id === search.dealId);
      if (target) {
        setOpen(target);
        setTimeout(() => {
          const el = document.getElementById(`deal-${search.dealId}`);
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 150);
      }
    }
  }, [search?.dealId, deals]);

  const t = q.trim().toLowerCase();
  const filtered = deals.filter((d) => {
    // 1. Status Filter
    if (statusFilter === "New" && !d.isNew) return false;
    if (statusFilter === "Saved" && !savedDeals.includes(d.id)) return false;

    // 2. Type Filter
    if (typeFilter === "Percent off" && d.type !== "Percent off") return false;
    if (typeFilter === "Free / Trials" && d.type !== "Free") return false;
    if (typeFilter === "Fixed price" && d.type !== "Fixed price") return false;

    // 3. Category Filter
    if (cat !== "All" && cat !== "All categories") {
      const match =
        d.category === cat || (d.categories && d.categories.includes(cat as DealCategory));
      if (!match) return false;
    }

    // 4. Search Filter
    if (t) {
      const catStr = d.categories ? d.categories.join(" ") : d.category;
      const searchable = `${d.title} ${d.company} ${d.description} ${catStr} ${d.city || ""} ${d.howTo || ""}`.toLowerCase();
      if (!searchable.includes(t)) return false;
    }
    return true;
  });

  // Separate into Verified Deals vs Community Deals
  const rawVerified = filtered.filter((d) => d.verificationStatus !== "community");
  const rawCommunity = filtered.filter((d) => d.verificationStatus === "community");

  const sortDeals = (list: Deal[]) => {
    return [...list].sort((a, b) => {
      if (sort === "best") {
        const scoreA = getDealScore(a);
        const scoreB = getDealScore(b);
        return scoreB - scoreA || a.company.localeCompare(b.company);
      }
      if (sort === "company-asc") {
        return a.company.localeCompare(b.company) || a.title.localeCompare(b.title);
      }
      if (sort === "company-desc") {
        return b.company.localeCompare(a.company) || b.title.localeCompare(a.title);
      }
      if (sort === "upvotes") {
        const upvotesA = a.upvotesCount ?? 0;
        const upvotesB = b.upvotesCount ?? 0;
        return upvotesB - upvotesA || a.company.localeCompare(b.company);
      }
      if (sort === "free-first") {
        const isFreeA = a.type === "Free" ? 0 : 1;
        const isFreeB = b.type === "Free" ? 0 : 1;
        if (isFreeA !== isFreeB) return isFreeA - isFreeB;
        return a.company.localeCompare(b.company);
      }
      if (sort === "newest") {
        const dateA = a.createdAt || "";
        const dateB = b.createdAt || "";
        if (dateA !== dateB) return dateB.localeCompare(dateA);
        const isNewA = a.isNew ? 1 : 0;
        const isNewB = b.isNew ? 1 : 0;
        if (isNewA !== isNewB) return isNewB - isNewA;
        return a.company.localeCompare(b.company);
      }
      return 0;
    });
  };

  const verifiedList = sortDeals(rawVerified);
  const communityList = sortDeals(rawCommunity);

  const resetFilters = () => {
    setQ("");
    setTypeFilter("All Deals");
    setStatusFilter("All");
    setCat("All categories");
    setSort("best");
  };

  // Render Deal as Grid Card
  const renderCard = (d: Deal, isCommunity = false) => {
    const saved = savedDeals.includes(d.id);
    const score = calculateVerificationScore(d.realVotesCount, d.fakeVotesCount);
    return (
      <div
        key={d.id}
        id={`deal-${d.id}`}
        data-deal-id={d.id}
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
                actions.toggleDeal(d.id, { company: d.company, title: d.title });
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
          <div className="mt-3.5">
            {/* Company Name & Logo */}
            <button
              onClick={() => setOpen(d)}
              className="flex items-center gap-3 w-full text-left focus:outline-none"
            >
              <CompanyLogo company={d.company} url={d.url} size={44} />
              <div className="min-w-0 flex-1">
                <h3 className="text-xl font-bold tracking-tight text-foreground truncate group-hover:text-primary transition-colors">
                  {d.company}
                </h3>
                <p className="text-xs text-muted-foreground truncate font-medium">
                  {d.category} · Check provider terms
                </p>
              </div>
            </button>

            {/* Value Pill & Interactive Upvote / Real Status */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center rounded-lg bg-accent/15 px-2.5 py-1 text-sm font-bold text-accent ring-1 ring-accent/30">
                🏷️ {d.value}
              </span>

              <div className="flex items-center gap-1.5 text-xs">
                {score.hasVotes && (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${score.badgeColor}`}>
                    {score.percentage}% Real
                  </span>
                )}
                <DealCardUpvoteButton
                  deal={d}
                  onRequireAuth={(act) => {
                    setAuthAction(act);
                    setAuthOpen(true);
                  }}
                />
              </div>
            </div>

            {/* Submitter Attribution for Community Deals */}
            {isCommunity && (
              <p className="mt-2 text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <span>Posted by</span>
                <span className="text-primary font-semibold">@{d.submitterUsername || "student"}</span>
              </p>
            )}

            {/* Deal Title & Description */}
            <button
              onClick={() => setOpen(d)}
              className="mt-2.5 block w-full text-left focus:outline-none"
            >
              <h4 className="text-sm font-bold text-foreground/90 line-clamp-1">
                {d.title}
              </h4>
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {d.description}
              </p>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border/50">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setOpen(d)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              View redemption details →
            </button>
            {saved && (
              <Link
                to="/"
                hash="my-hub"
                className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary ring-1 ring-primary/30 hover:bg-primary hover:text-primary-foreground transition-all shadow-xs"
                title="Open this saved deal in My Hub on the homepage"
              >
                Go to My Hub →
              </Link>
            )}
          </div>
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

  // Render Deal as Compact List Row (responsive columnar table layout for desktop & mobile)
  const renderListRow = (d: Deal, isCommunity = false) => {
    const saved = savedDeals.includes(d.id);
    const score = calculateVerificationScore(d.realVotesCount, d.fakeVotesCount);

    return (
      <div
        key={d.id}
        id={`deal-${d.id}`}
        data-deal-id={d.id}
        className="glass group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 sm:gap-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm border border-border/70 hover:border-border rounded-xl"
      >
        {/* Deal Info (Opens detail modal) */}
        <button
          onClick={() => setOpen(d)}
          className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 min-w-0 flex-1 text-left rounded-lg focus-visible:outline-2 focus-visible:outline-primary"
          aria-label={`View details for ${d.title} at ${d.company}`}
        >
          {/* Column 1: Company Logo + Name + Category (Fixed width on desktop for perfect vertical alignment) */}
          <div className="flex items-center gap-3 sm:w-48 lg:w-56 shrink-0 min-w-0">
            <CompanyLogo company={d.company} url={d.url} size={40} />
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors truncate">
                {d.company}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground/75 truncate">{d.category}</span>
                {d.isNew && (
                  <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    New
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Column 2: Value Badge (Consistent width/alignment on desktop, inline on mobile) */}
          <div className="shrink-0 sm:w-36 lg:w-40 flex items-center">
            <span className="inline-flex items-center rounded-lg bg-accent/15 px-2.5 py-1 text-xs sm:text-sm font-bold text-accent ring-1 ring-accent/30 text-center truncate max-w-full">
              🏷️ {d.value}
            </span>
          </div>

          {/* Column 3: Title, Badges & Description (Fills remaining horizontal space) */}
          <div className="min-w-0 flex-1 pr-2">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <h4 className="text-sm font-bold text-foreground/90 line-clamp-1">
                {d.title}
              </h4>
              {isCommunity ? (
                <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-accent shrink-0">
                  👥 Community
                </span>
              ) : (
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                  ✓ Verified
                </span>
              )}
              {score.hasVotes && (
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${score.badgeColor} shrink-0`}>
                  {score.percentage}% Real
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1 leading-relaxed">
              {d.description}
              {isCommunity && d.submitterUsername && (
                <span className="ml-1 text-muted-foreground/70 hidden lg:inline">
                  • by @{d.submitterUsername}
                </span>
              )}
            </p>
          </div>
        </button>

        {/* Column 4: Right Actions (Upvote, Save, My Hub, Details) */}
        <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-2.5 sm:pt-0 border-t sm:border-0 border-border/40 sm:w-48">
          <div className="flex items-center gap-2">
            {saved && (
              <Link
                to="/"
                hash="my-hub"
                className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary ring-1 ring-primary/30 hover:bg-primary hover:text-primary-foreground transition-all shadow-xs"
                title="Open this saved deal in My Hub on the homepage"
              >
                Go to My Hub →
              </Link>
            )}

            <button
              type="button"
              onClick={() => setOpen(d)}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold ring-1 ring-border hover:bg-glass"
            >
              Details →
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <DealCardUpvoteButton
              deal={d}
              onRequireAuth={(act) => {
                setAuthAction(act);
                setAuthOpen(true);
              }}
            />

            <button
              onClick={(e) => {
                e.stopPropagation();
                actions.toggleDeal(d.id, { company: d.company, title: d.title });
              }}
              aria-label={saved ? "Unsave deal" : "Save deal"}
              className={`text-2xl transition-transform active:scale-125 ${
                saved ? "text-gold" : "text-muted-foreground/50 hover:text-gold"
              }`}
            >
              {saved ? "★" : "☆"}
            </button>
          </div>
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
          <Link
            to="/map"
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-secondary px-4 text-xs font-semibold text-foreground ring-1 ring-border hover:bg-secondary/80 transition-colors shadow-sm"
          >
            <span>📍</span>
            <span>View on map →</span>
          </Link>
          <SearchInput value={q} onChange={setQ} placeholder="Search company, deal, category" />
        </div>
      </PageHeader>

      {/* Filter and View Layout Controls */}
      <div className="mt-4 space-y-3" aria-label="Filter discounts">
        {/* Mobile View Mode Toggle (Top Left) & Desktop Row 1 Container */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
          {/* View Mode Toggle: Top-left on mobile (order-first), right-aligned on desktop (sm:order-last) */}
          <div className="order-first sm:order-last flex items-center justify-start sm:justify-end">
            <div className="flex items-center gap-1 rounded-full bg-secondary p-1 ring-1 ring-border">
              <button
                type="button"
                onClick={() => handleViewModeChange("compact")}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  viewMode === "compact"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Compact rows view"
              >
                <span>☰</span>
                <span>List</span>
              </button>
              <button
                type="button"
                onClick={() => handleViewModeChange("grid")}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  viewMode === "grid"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Discounts grid view"
              >
                <span>⊞</span>
                <span>Discounts Grid</span>
              </button>
            </div>
          </div>

          {/* Desktop Row 1: Type & Status FilterChips (hidden on mobile, visible on sm+) */}
          <div className="hidden sm:flex flex-wrap items-center gap-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
                Type:
              </span>
              <FilterChips options={discountTypes} value={typeFilter} onChange={setTypeFilter} />
            </div>

            <div className="h-4 w-px bg-border hidden sm:block" />

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
                Status:
              </span>
              <FilterChips
                options={discountStatusFilters}
                value={statusFilter}
                onChange={setStatusFilter}
              />
            </div>
          </div>
        </div>

        {/* Mobile 2x2 Dropdown Grid: Category, Sort, Type, Status (visible on mobile, hidden on sm+) */}
        <div className="grid grid-cols-2 gap-2.5 sm:hidden pt-2 border-t border-border/40">
          {/* 1. Category */}
          <div className="flex flex-col gap-1 min-w-0">
            <label
              htmlFor="mobile-discount-category"
              className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate"
            >
              Category
            </label>
            <select
              id="mobile-discount-category"
              aria-label="Filter discounts by category mobile"
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              className="min-h-11 w-full rounded-xl bg-secondary px-3 text-xs font-medium ring-1 ring-border outline-none cursor-pointer truncate"
            >
              {discountCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Sort */}
          <div className="flex flex-col gap-1 min-w-0">
            <label
              htmlFor="mobile-discount-sort"
              className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate"
            >
              Sort
            </label>
            <select
              id="mobile-discount-sort"
              aria-label="Sort verified discounts mobile"
              value={sort}
              onChange={(e) => setSort(e.target.value as DiscountSortOption)}
              className="min-h-11 w-full rounded-xl bg-secondary px-3 text-xs font-medium ring-1 ring-border outline-none cursor-pointer truncate"
            >
              {discountSortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Type */}
          <div className="flex flex-col gap-1 min-w-0">
            <label
              htmlFor="mobile-discount-type"
              className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate"
            >
              Type
            </label>
            <select
              id="mobile-discount-type"
              aria-label="Filter discounts by type mobile"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as DiscountType)}
              className="min-h-11 w-full rounded-xl bg-secondary px-3 text-xs font-medium ring-1 ring-border outline-none cursor-pointer truncate"
            >
              {discountTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Status */}
          <div className="flex flex-col gap-1 min-w-0">
            <label
              htmlFor="mobile-discount-status"
              className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate"
            >
              Status
            </label>
            <select
              id="mobile-discount-status"
              aria-label="Filter discounts by status mobile"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as DiscountStatusFilter)}
              className="min-h-11 w-full rounded-xl bg-secondary px-3 text-xs font-medium ring-1 ring-border outline-none cursor-pointer truncate"
            >
              {discountStatusFilters.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Desktop Row 2: Category & Unified Sort (hidden on mobile, visible on sm+) */}
        <div className="hidden sm:flex flex-wrap items-center gap-3 pt-1 border-t border-border/40">
          <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
            <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
              Category:
            </span>
            <FilterChips options={discountCategories} value={cat} onChange={setCat} />
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <label
              htmlFor="discount-sort"
              className="shrink-0 whitespace-nowrap font-semibold text-muted-foreground uppercase tracking-wider text-[11px]"
            >
              Sort:
            </label>
            <select
              id="discount-sort"
              aria-label="Sort verified discounts"
              value={sort}
              onChange={(e) => setSort(e.target.value as DiscountSortOption)}
              className="min-h-11 max-w-full rounded-full bg-secondary px-3 text-xs font-medium ring-1 ring-border outline-none cursor-pointer"
            >
              {discountSortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        viewMode === "grid" ? (
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
        ) : (
          <div className="mt-8 grid gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="glass animate-pulse p-4 flex items-center gap-4">
                <div className="size-14 rounded-xl bg-muted shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-48 rounded bg-muted" />
                  <div className="h-3 w-32 rounded bg-muted" />
                </div>
                <div className="h-8 w-16 rounded-full bg-muted shrink-0" />
              </div>
            ))}
          </div>
        )
      )}

      {/* Error State */}
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
                : statusFilter === "Saved"
                  ? "No saved discounts yet"
                  : statusFilter === "New"
                    ? "No new discounts currently"
                    : typeFilter !== "All Deals"
                      ? `No ${typeFilter.toLowerCase()} discounts found`
                      : "No discounts in this category yet"}
            </h4>
            <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
              {q
                ? `No discounts match "${q}". Try a different search or clear the filters.`
                : statusFilter === "Saved"
                  ? "Tap a discount’s star to save it here on this browser."
                  : "No discounts match your selected filters right now. Try resetting filters or check provider terms."}
            </p>
            {(q || cat !== "All categories" || typeFilter !== "All Deals" || statusFilter !== "All") && (
              <button
                onClick={resetFilters}
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

                {viewMode === "grid" ? (
                  <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {verifiedList.map((d) => renderCard(d, false))}
                  </div>
                ) : (
                  <div className="mt-4 space-y-1.5">
                    {/* Desktop Column Header */}
                    <div className="hidden sm:flex items-center justify-between px-4 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      <div className="flex items-center gap-4 flex-1">
                        <span className="w-48 lg:w-56 shrink-0">Company</span>
                        <span className="w-36 lg:w-40 shrink-0">Discount</span>
                        <span className="flex-1">Deal Details</span>
                      </div>
                      <span className="w-48 shrink-0 text-right pr-3">Actions</span>
                    </div>
                    <div className="grid gap-3">
                      {verifiedList.map((d) => renderListRow(d, false))}
                    </div>
                  </div>
                )}
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
              </div>

              {communityList.length > 0 ? (
                viewMode === "grid" ? (
                  <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {communityList.map((d) => renderCard(d, true))}
                  </div>
                ) : (
                  <div className="mt-4 space-y-1.5">
                    {/* Desktop Column Header */}
                    <div className="hidden sm:flex items-center justify-between px-4 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      <div className="flex items-center gap-4 flex-1">
                        <span className="w-48 lg:w-56 shrink-0">Company</span>
                        <span className="w-36 lg:w-40 shrink-0">Discount</span>
                        <span className="flex-1">Deal Details</span>
                      </div>
                      <span className="w-48 shrink-0 text-right pr-3">Actions</span>
                    </div>
                    <div className="grid gap-3">
                      {communityList.map((d) => renderListRow(d, true))}
                    </div>
                  </div>
                )
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
      <AuthRequiredModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        action={authAction}
      />
    </>
  );
}
