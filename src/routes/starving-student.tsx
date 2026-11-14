import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { SSDeal } from "@/lib/data";
import { getStarvingStudentOffers } from "@/lib/starving-student";
import { actions, useStore } from "@/lib/store";
import {
  CompanyLogo,
  FilterChips,
  Modal,
  PageHeader,
  SSDetail,
  SearchInput,
} from "@/components/ui-bits";

import {
  CARD_PAGE_SIZE,
  discountTypes,
  statusFilters,
  sortOptions,
  validateCardSearch,
  type CardSearch,
  type SortOption,
} from "@/lib/card-catalog";

function PunchDots({ total, count }: { total: number; count: number }) {
  if (total <= 1) return null;
  return (
    <div className="flex items-center gap-1" title={`${count} of ${total} punches used`}>
      {Array.from({ length: total }).map((_, idx) => (
        <span
          key={idx}
          className={`punch-slot size-[18px] text-[9px] font-bold ${
            idx < count ? "punch-slot-filled" : "punch-slot-empty"
          }`}
        >
          {idx < count ? "✓" : idx + 1}
        </span>
      ))}
    </div>
  );
}

export const Route = createFileRoute("/starving-student")({
  loader: () => getStarvingStudentOffers(),
  staleTime: 5 * 60 * 1000,
  validateSearch: validateCardSearch,
  pendingComponent: CatalogPending,
  errorComponent: CatalogError,
  head: () => ({
    meta: [
      { title: "Starving Student Card Hub — Student Steals" },
      {
        name: "description",
        content:
          "Every Starving Student Card deal, sorted by category, with a tracker for deals you've used.",
      },
      { property: "og:title", content: "Starving Student Card Hub — Student Steals" },
      {
        property: "og:description",
        content: "Track which Starving Student Card deals you've used.",
      },
    ],
  }),
  component: SSHub,
});

function CatalogPending() {
  return (
    <div role="status" className="glass my-8 p-6">
      <h1 className="text-2xl font-semibold">Starving Student Card Hub</h1>
      <p className="mt-3">Loading the full card catalog…</p>
    </div>
  );
}
function CatalogError() {
  const router = useRouter();
  return (
    <div role="alert" className="glass my-8 p-6">
      <h1 className="text-2xl font-semibold">Card offers couldn’t load</h1>
      <p className="mt-3">
        Your saved punches haven’t been removed. Check your connection and try again.
      </p>
      <button
        className="mt-4 min-h-11 rounded-full bg-primary px-4 text-primary-foreground focus-visible:outline-2"
        onClick={() => void router.invalidate()}
      >
        Retry card offers
      </button>
    </div>
  );
}

const CATEGORY_ICONS: Record<string, string> = {
  Freebies: "🎁",
  "Treats & Drinks": "🥤",
  "Burgers & Sandwiches": "🍔",
  Pizza: "🍕",
  Restaurants: "🍽️",
  Entertainment: "🎳",
  "Retail, Auto, & More": "🛍️",
  "Health & Beauty": "✨",
};

function SSHub() {
  const ssDeals = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/starving-student" });
  return (
    <CardHub
      ssDeals={ssDeals}
      search={search}
      onSearchChange={(next, replace = false) => {
        void navigate({ search: next, replace, resetScroll: false });
      }}
    />
  );
}

export function CardHub({
  ssDeals,
  search,
  onSearchChange,
}: {
  ssDeals: SSDeal[];
  search: CardSearch;
  onSearchChange: (next: CardSearch, replace?: boolean) => void;
}) {
  const { ssUsedCounts = {} } = useStore();
  const cats = useMemo(
    () => ["All categories", ...new Set(ssDeals.map((deal) => deal.category))],
    [ssDeals],
  );
  const { view: viewMode, type: typeFilter, category: cat, status: statusFilter, sort, q } = search;
  const change = (patch: Partial<CardSearch>, replace = false) =>
    onSearchChange({ ...search, ...patch }, replace);
  const setQ = (q: string) => change({ q, page: 1 }, true);
  const setTypeFilter = (type: CardSearch["type"]) => change({ type, page: 1 });
  const setStatusFilter = (status: CardSearch["status"]) => change({ status, page: 1 });
  const setCat = (category: string) => change({ category, page: 1 });
  const setSort = (sort: SortOption) => change({ sort, page: 1 });
  const setViewMode = (view: CardSearch["view"]) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("studeats_catalog_view", view);
      } catch {}
    }
    change({ view });
  };
  const resultsRef = useRef<HTMLHeadingElement>(null);
  const [open, setOpen] = useState<SSDeal | null>(null);

  // Auto-open deal when directed via ?dealId= query parameter
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const targetId = params.get("dealId");
      if (targetId && ssDeals.length > 0) {
        const found = ssDeals.find((d) => d.id === targetId);
        if (found) {
          setOpen(found);
        }
      }
    }
  }, [ssDeals]);

  // Confirmation state for un-marking a deal
  const [confirmDeal, setConfirmDeal] = useState<SSDeal | null>(null);

  // Animated deal IDs for punching or unpunching
  const [punchedId, setPunchedId] = useState<string | null>(null);
  const [unpunchedId, setUnpunchedId] = useState<string | null>(null);

  const t = q.trim().toLowerCase();

  // Stats calculation
  const totalOffers = ssDeals.length;
  const fullyUsedCount = useMemo(
    () =>
      ssDeals.filter((d) => {
        const count = ssUsedCounts[d.id] || 0;
        const isNoLimit = d.totalUses === null;
        if (isNoLimit) return false;
        return count >= (d.totalUses ?? 1);
      }).length,
    [ssDeals, ssUsedCounts],
  );
  const totalClaimedPunches = Object.values(ssUsedCounts).reduce((a, b) => a + b, 0);

  const filteredDeals = useMemo(
    () =>
      ssDeals
        .filter((d) => {
          // 1. Discount type & unlimited filter
          if (typeFilter === "Free Only" && d.type !== "Free") return false;
          if (typeFilter === "Discounts Only" && d.type !== "Discount") return false;
          if (typeFilter === "Unlimited Only" && d.totalUses !== null) return false;

          // 2. Category filter
          if (cat !== "All categories" && d.category !== cat) return false;

          // 3. Status filter
          const count = ssUsedCounts[d.id] || 0;
          const isNoLimit = d.totalUses === null;
          const isUsed = isNoLimit ? count > 0 : count >= (d.totalUses ?? 1);

          if (statusFilter === "Unused / Available" && isUsed) return false;
          if (statusFilter === "Used" && !isUsed) return false;

          // 4. Search query
          if (t) {
            const text = (
              d.company +
              " " +
              d.item +
              " " +
              d.details +
              " " +
              d.address +
              " " +
              d.locations.map((location) => `${location.address} ${location.city}`).join(" ")
            ).toLowerCase();
            if (!text.includes(t)) return false;
          }
          return true;
        })
        .sort((a, b) => {
          const countA = ssUsedCounts[a.id] || 0;
          const totalA = a.totalUses === null ? Infinity : (a.totalUses ?? 1);
          const isUsedA = countA >= totalA;

          const countB = ssUsedCounts[b.id] || 0;
          const totalB = b.totalUses === null ? Infinity : (b.totalUses ?? 1);
          const isUsedB = countB >= totalB;

          // Group fully used deals at the bottom (unless sorting by most punched)
          if (sort !== "most-punched" && isUsedA !== isUsedB) {
            return Number(isUsedA) - Number(isUsedB);
          }

          if (sort === "company-asc") {
            return a.company.localeCompare(b.company);
          }
          if (sort === "company-desc") {
            return b.company.localeCompare(a.company);
          }
          if (sort === "item-asc") {
            return a.item.localeCompare(b.item);
          }
          if (sort === "free-first") {
            const isFreeA = a.type === "Free" ? 0 : 1;
            const isFreeB = b.type === "Free" ? 0 : 1;
            if (isFreeA !== isFreeB) return isFreeA - isFreeB;
            return a.company.localeCompare(b.company);
          }
          if (sort === "locations-desc") {
            const locDiff = b.locations.length - a.locations.length;
            if (locDiff !== 0) return locDiff;
            return a.company.localeCompare(b.company);
          }
          if (sort === "most-punched") {
            const punchDiff = countB - countA;
            if (punchDiff !== 0) return punchDiff;
            return a.company.localeCompare(b.company);
          }
          return a.company.localeCompare(b.company);
        }),
    [ssDeals, ssUsedCounts, typeFilter, cat, statusFilter, t, sort],
  );

  // Group deals by category
  // Preserve the existing category grouping, but mount only one page of cards.
  const groups = useMemo(() => {
    const map = new Map<string, SSDeal[]>();
    for (const deal of filteredDeals) {
      const group = map.get(deal.category) ?? [];
      group.push(deal);
      map.set(deal.category, group);
    }
    return map;
  }, [filteredDeals]);
  const orderedDeals = useMemo(() => [...groups.values()].flat(), [groups]);
  const pageCount = Math.max(1, Math.ceil(filteredDeals.length / CARD_PAGE_SIZE));
  const page = Math.min(search.page, pageCount);
  const pageDeals = orderedDeals.slice((page - 1) * CARD_PAGE_SIZE, page * CARD_PAGE_SIZE);
  const categoriesPresent = Array.from(new Set(pageDeals.map((d) => d.category)));
  const changePage = (page: number) => {
    change({ page });
    resultsRef.current?.focus({ preventScroll: true });
    resultsRef.current?.scrollIntoView({ behavior: "auto", block: "start" });
  };
  const resetFilters = () => onSearchChange({ ...validateCardSearch({}), view: viewMode });
  const pagination = (label: string) => (
    <nav aria-label={label} className="flex flex-wrap items-center gap-3 py-3">
      <button
        type="button"
        disabled={page === 1}
        onClick={() => changePage(page - 1)}
        className="min-h-11 rounded-full bg-secondary px-4 text-sm font-semibold ring-1 ring-border disabled:opacity-40 focus-visible:outline-2"
      >
        Previous
      </button>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        Page
        <select
          aria-label={`${label} page`}
          value={page}
          onChange={(event) => changePage(Number(event.target.value))}
          className="min-h-11 rounded-lg bg-secondary px-2 ring-1 ring-border focus-visible:outline-2"
        >
          {Array.from({ length: pageCount }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {i + 1}
            </option>
          ))}
        </select>
        of {pageCount}
      </label>
      <button
        type="button"
        disabled={page === pageCount}
        onClick={() => changePage(page + 1)}
        className="min-h-11 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-40 focus-visible:outline-2"
      >
        Next
      </button>
    </nav>
  );

  const handleCardAction = (e: React.MouseEvent, deal: SSDeal) => {
    e.stopPropagation();
    const count = ssUsedCounts[deal.id] || 0;
    const isNoLimit = deal.totalUses === null;
    const total = isNoLimit ? null : (deal.totalUses ?? 1);
    const isFullyUsed = isNoLimit ? false : count >= (total ?? 1);

    // ONLY prompt confirmation if it is already fully used and the user is trying to reset it!
    if (isFullyUsed) {
      setConfirmDeal(deal);
      return;
    }

    // Mobile haptic vibration feedback
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate([25, 45, 25]);
      } catch {}
    }

    // Trigger punch animation and punch deal
    setPunchedId(deal.id);
    setTimeout(() => setPunchedId(null), 800);
    actions.toggleUsed(deal.id, deal.totalUses);

    // Toast feedback
    const nextCount = count + 1;
    const isNowFullyUsed = !isNoLimit && total !== null && nextCount >= total;
    if (isNowFullyUsed) {
      toast.success(`🎉 All punches redeemed at ${deal.company}!`, {
        description: `${deal.item} is now fully stamped.`,
      });
    } else if (total && total > 1) {
      toast.success(`Punched at ${deal.company}!`, {
        description: `${deal.item} (${nextCount}/${total} uses stamped).`,
      });
    } else {
      toast.success(`Punched at ${deal.company}!`, {
        description: `${deal.item} marked as used.`,
      });
    }
  };

  const handleConfirmReset = () => {
    if (confirmDeal) {
      const dealId = confirmDeal.id;
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate([30]);
        } catch {}
      }
      setUnpunchedId(dealId);
      setTimeout(() => setUnpunchedId(null), 800);
      actions.resetUsed(dealId);
      toast.info(`Reset deal at ${confirmDeal.company}`, {
        description: `${confirmDeal.item} is ready to punch again.`,
      });
      setConfirmDeal(null);
    }
  };

  return (
    <>
      <PageHeader eyebrow={`${ssDeals.length} offers`} title="Starving Student Card Hub">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput value={q} onChange={setQ} placeholder="Search card deals" />
          <Link
            to="/map"
            className="inline-flex h-10 items-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            View on map →
          </Link>
        </div>
      </PageHeader>

      {/* 1. Progress & Punchcard Summary Header Banner */}
      <div className="mb-6 rounded-2xl border border-border/80 bg-card/60 p-5 shadow-sm backdrop-blur-md">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-base text-primary">
                💳
              </span>
              <h2 className="text-base font-semibold">Your Digital Punchcard Tracker</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Confirm current terms in the card portal before redeeming. “Used” is saved on this
              device.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="min-w-[76px] shrink-0 rounded-xl bg-secondary/80 px-3.5 py-2 ring-1 ring-border text-center">
              <span className="block text-lg font-bold text-primary">{fullyUsedCount}</span>
              <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">Claimed</span>
            </div>
            <div className="min-w-[76px] shrink-0 rounded-xl bg-secondary/80 px-3.5 py-2 ring-1 ring-border text-center">
              <span className="block text-lg font-bold text-foreground">{totalOffers - fullyUsedCount}</span>
              <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">Available</span>
            </div>
            <div className="min-w-[76px] shrink-0 rounded-xl bg-secondary/80 px-3.5 py-2 ring-1 ring-border text-center">
              <span className="block text-lg font-bold text-accent">{totalOffers}</span>
              <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">Total Deals</span>
            </div>
          </div>
        </div>

        {/* Progress Bar (P30: testing reset-all button removed from public UI) */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground mb-1.5">
            <span>Punchcard Completion</span>
            <span className="font-semibold text-foreground">{totalOffers ? Math.round((fullyUsedCount / totalOffers) * 100) : 0}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary ring-1 ring-border">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{
                width: `${fullyUsedCount === 0 ? 0 : (fullyUsedCount / totalOffers) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Filter and View Layout Controls */}
      <div className="space-y-3" aria-label="Filter card offers">
        {/* Row 1: Deal Type & Card Status & Layout View Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4">
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
                options={statusFilters}
                value={statusFilter}
                onChange={setStatusFilter}
              />
            </div>
          </div>

          {/* View Mode Toggle Button Group */}
          <div className="flex items-center gap-1 rounded-full bg-secondary p-1 ring-1 ring-border">
            <button
              type="button"
              onClick={() => setViewMode("compact")}
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
              onClick={() => setViewMode("grid")}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                viewMode === "grid"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Discounts page grid cards view"
            >
              <span>⊞</span>
              <span>Discounts Grid</span>
            </button>
          </div>
        </div>

        {/* Row 2: Category & Sort */}
        <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-border/40">
          {/* Desktop Category Chips (hidden on mobile, visible on sm+) */}
          <div className="hidden sm:flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
            <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
              Category:
            </span>
            <FilterChips options={cats} value={cat} onChange={setCat} />
          </div>

          {/* Mobile Category Dropdown (visible on mobile, hidden on sm+) */}
          <div className="flex sm:hidden items-center gap-1.5 flex-1 min-w-[140px]">
            <label
              htmlFor="mobile-card-category"
              className="shrink-0 font-semibold text-muted-foreground uppercase tracking-wider text-[11px]"
            >
              Category:
            </label>
            <select
              id="mobile-card-category"
              aria-label="Filter card offers by category"
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              className="min-h-11 w-full rounded-full bg-secondary px-3 text-xs font-medium ring-1 ring-border outline-none cursor-pointer"
            >
              {cats.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <label
              htmlFor="card-sort"
              className="shrink-0 whitespace-nowrap font-semibold text-muted-foreground uppercase tracking-wider text-[11px]"
            >
              Sort:
            </label>
            <select
              id="card-sort"
              aria-label="Sort card offers"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="min-h-11 max-w-full rounded-full bg-secondary px-3 text-xs font-medium ring-1 ring-border outline-none cursor-pointer"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Confirmation Modal when unmarking a single deal */}
      {confirmDeal && (
        <Modal open onClose={() => setConfirmDeal(null)} title="Reset deal to unused?">
          <span className="grid size-10 place-items-center rounded-xl bg-destructive/10 text-xl text-destructive mb-3">
            ⚠️
          </span>
          <h3 className="text-lg font-semibold text-foreground">Reset deal to unused?</h3>
          <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
            Are you sure you want to unmark{" "}
            <strong className="text-foreground">{confirmDeal.item}</strong> from{" "}
            {confirmDeal.company}? This will reset its punchcard count back to 0.
          </p>
          <div className="mt-5 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setConfirmDeal(null)}
              className="rounded-full bg-secondary px-4 py-2 text-xs font-semibold ring-1 ring-border hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmReset}
              className="rounded-full bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 transition-colors shadow-sm"
            >
              Yes, unmark
            </button>
          </div>
        </Modal>
      )}

      {/* 2. Deals List / Grid Output */}
      <div className="mt-8">
        <h2
          ref={resultsRef}
          tabIndex={-1}
          className="scroll-mt-24 rounded-lg text-lg font-semibold focus-visible:outline-2"
          aria-live="polite"
          aria-atomic="true"
        >
          {filteredDeals.length
            ? `Showing ${(page - 1) * CARD_PAGE_SIZE + 1}–${Math.min(page * CARD_PAGE_SIZE, filteredDeals.length)} of ${filteredDeals.length} matching offers`
            : "0 matching offers"}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Search, filters, and sorting include all {totalOffers} offers. Categories stay grouped.
        </p>
        {filteredDeals.length > CARD_PAGE_SIZE && pagination("Top offer pagination")}
      </div>
      <div className="mt-4 space-y-10" aria-label="Card offer results">
        {categoriesPresent.map((categoryName) => {
          const categoryDeals = pageDeals.filter((d) => d.category === categoryName);
          const icon = CATEGORY_ICONS[categoryName] || "🏷️";

          return (
            <section key={categoryName} className="space-y-4">
              {/* Category Section Header */}
              <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-8 place-items-center rounded-xl bg-secondary text-lg ring-1 ring-border">
                    {icon}
                  </span>
                  <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                    {categoryName}
                  </h2>
                </div>
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-border">
                  {groups.get(categoryName)?.length} matching offers
                </span>
              </div>

              {/* View Mode 1: Discounts-Style Grid View */}
              {viewMode === "grid" ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {categoryDeals.map((d) => {
                    const count = ssUsedCounts[d.id] || 0;
                    const isNoLimit = d.totalUses === null;
                    const total = isNoLimit ? null : (d.totalUses ?? 1);
                    const isFullyUsed = isNoLimit ? false : count >= (total ?? 1);
                    const isPunched = punchedId === d.id;
                    const isUnpunched = unpunchedId === d.id;

                    return (
                      <div
                        key={d.id}
                        data-offer-id={d.id}
                        className={`glass group relative flex flex-col justify-between overflow-hidden p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-float border ${
                          isFullyUsed
                            ? "bg-card/90 border-primary/30 shadow-xs"
                            : "border-border/70 hover:border-border"
                        } ${isPunched ? "is-punched-card ring-2 ring-primary" : ""} ${isUnpunched ? "is-unpunched-card" : ""}`}
                      >
                        <div>
                          {/* Top Bar: Value / Badge / Punch Slots */}
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                d.type === "Free"
                                  ? "bg-gold/15 text-gold"
                                  : "bg-accent/15 text-accent"
                              }`}
                            >
                              {d.value}
                            </span>

                            {isFullyUsed ? (
                              <span className="stamp-badge">
                                ✓ REDEEMED
                              </span>
                            ) : isNoLimit ? (
                              <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground ring-1 ring-border">
                                Unlimited
                              </span>
                            ) : total && total > 1 ? (
                              <div className="flex items-center gap-1.5">
                                <PunchDots total={total} count={count} />
                                <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground ring-1 ring-border">
                                  {count > 0 ? `${count}/${total}` : `${total} Uses`}
                                </span>
                              </div>
                            ) : null}
                          </div>

                          {/* Company Logo + Name Header */}
                          <button
                            onClick={() => setOpen(d)}
                            className="mt-3.5 block w-full rounded-lg text-left focus-visible:outline-2"
                            aria-label={`View details for ${d.item} at ${d.company}`}
                          >
                            <div className="flex items-center gap-3">
                              <CompanyLogo company={d.company} url={d.sourceUrl} size={42} />
                              <div className="min-w-0 flex-1">
                                <h3 className="text-lg font-bold tracking-tight text-foreground truncate group-hover:text-primary transition-colors">
                                  {d.company}
                                </h3>
                                <p className="text-xs text-muted-foreground truncate font-medium">
                                  {d.locations.length
                                    ? `${d.locations.length} location${d.locations.length === 1 ? "" : "s"}`
                                    : "Local deal"}
                                </p>
                              </div>
                            </div>

                            {/* Offer Item Title */}
                            <h4 className="mt-3 text-sm font-semibold leading-snug line-clamp-2 text-foreground/90">
                              {d.item}
                            </h4>

                            {d.details && (
                              <p className="mt-2 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                {d.details}
                              </p>
                            )}
                          </button>
                        </div>

                        {/* Card Bottom Action Bar */}
                        <div className="mt-4 flex items-center justify-between pt-3 border-t border-border/50">
                          <button
                            type="button"
                            onClick={() => setOpen(d)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                          >
                            Details →
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleCardAction(e, d)}
                            className={`inline-flex items-center justify-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95 ${
                              isFullyUsed
                                ? "bg-secondary text-foreground/80 ring-1 ring-border hover:bg-destructive/10 hover:text-destructive"
                                : count > 0
                                  ? "bg-primary/20 text-primary ring-1 ring-primary/40 hover:bg-primary hover:text-primary-foreground shadow-sm"
                                  : "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                            }`}
                          >
                            {isFullyUsed ? (
                              <span>✓ Used</span>
                            ) : isNoLimit ? (
                              <span>{count > 0 ? `Record Use (${count} used)` : "Record Use"}</span>
                            ) : count > 0 ? (
                              <span>{total && total > 1 ? `Punch #${count + 1} (${count}/${total})` : "Mark Used"}</span>
                            ) : (
                              <span>{total && total > 1 ? `Punch (0/${total})` : "Mark Used"}</span>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* View Mode 2: Compact Row List View */
                <div className="grid gap-3">
                  {categoryDeals.map((d) => {
                    const count = ssUsedCounts[d.id] || 0;
                    const isNoLimit = d.totalUses === null;
                    const total = isNoLimit ? null : (d.totalUses ?? 1);
                    const isFullyUsed = isNoLimit ? false : count >= (total ?? 1);
                    const isPunched = punchedId === d.id;
                    const isUnpunched = unpunchedId === d.id;

                    return (
                      <div
                        key={d.id}
                        data-offer-id={d.id}
                        className={`glass group relative flex flex-wrap items-center gap-3 p-4 sm:flex-nowrap sm:gap-4 transition-all duration-300 ${
                          isFullyUsed ? "bg-card/90 ring-1 ring-primary/20 shadow-xs" : "hover:-translate-y-0.5 hover:shadow-sm"
                        } ${isPunched ? "is-punched-card ring-2 ring-primary" : ""} ${isUnpunched ? "is-unpunched-card" : ""}`}
                      >
                        {/* Value Badge */}
                        <span
                          className={`grid size-14 shrink-0 place-items-center rounded-xl font-display text-sm font-semibold transition-transform ${
                            d.type === "Free" ? "bg-gold/15 text-gold" : "bg-accent/10 text-accent"
                          }`}
                        >
                          {d.value}
                        </span>

                        {/* Deal Info (Opens detail modal) */}
                        <button
                          onClick={() => setOpen(d)}
                          className="min-w-0 flex-1 text-left rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                          aria-label={`View details for ${d.item} at ${d.company}`}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold sm:text-lg text-foreground group-hover:text-primary transition-colors">
                              {d.item}
                            </h3>

                            {/* Multi-use punch dots & badge */}
                            {isFullyUsed ? (
                              <span className="stamp-badge">
                                ✓ REDEEMED
                              </span>
                            ) : isNoLimit ? (
                              <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground ring-1 ring-border">
                                Unlimited
                              </span>
                            ) : total && total > 1 ? (
                              <div className="flex items-center gap-1.5">
                                <PunchDots total={total} count={count} />
                                <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground ring-1 ring-border">
                                  {count > 0 ? `${count}/${total} Uses` : `${total} Uses`}
                                </span>
                              </div>
                            ) : null}
                          </div>

                          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                            <strong className="text-foreground/90 font-medium">{d.company}</strong>{" "}
                            ·{" "}
                            {d.locations.length
                              ? `${d.locations.length} ${d.locations.length === 1 ? "location" : "locations"}`
                              : "Location not confirmed"}
                          </p>
                        </button>

                        {/* Prominent Action Button */}
                        <div className="flex w-full items-center justify-end sm:w-auto shrink-0">
                          <button
                            type="button"
                            onClick={(e) => handleCardAction(e, d)}
                            title={
                              isFullyUsed
                                ? "Click to unmark/reset this deal"
                                : isNoLimit
                                  ? "Click to record another use"
                                  : "Click to mark this deal as used"
                            }
                            className={`inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 active:scale-95 ${
                              isFullyUsed
                                ? "bg-secondary text-foreground/80 ring-1 ring-border hover:bg-destructive/10 hover:text-destructive hover:ring-destructive/30"
                                : count > 0
                                  ? "bg-primary/20 text-primary ring-1 ring-primary/40 hover:bg-primary hover:text-primary-foreground shadow-sm"
                                  : "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:scale-[1.02]"
                            }`}
                          >
                            {isFullyUsed ? (
                              <span>✓ Used</span>
                            ) : isNoLimit ? (
                              <span>{count > 0 ? `Record Use (${count} used)` : "Record Use"}</span>
                            ) : count > 0 ? (
                              <span>{total && total > 1 ? `Punch #${count + 1} (${count}/${total})` : "Mark Used"}</span>
                            ) : (
                              <span>{total && total > 1 ? `Punch (0/${total})` : "Mark Used"}</span>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}

        {filteredDeals.length === 0 && (
          <div className="glass p-8 text-center" role="status">
            <h2 className="text-xl font-semibold">No card offers found</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Try another search or change the filters.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-4 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Clear search and filters
            </button>
          </div>
        )}
      </div>

      {filteredDeals.length > CARD_PAGE_SIZE && pagination("Bottom offer pagination")}
      <SSDetail deal={open} onClose={() => setOpen(null)} />
    </>
  );
}
