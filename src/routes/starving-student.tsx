import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import type { SSDeal } from "@/lib/data";
import { getStarvingStudentOffers } from "@/lib/starving-student";
import { actions, useStore } from "@/lib/store";
import { FilterChips, PageHeader, SSDetail, SearchInput } from "@/components/ui-bits";

export const Route = createFileRoute("/starving-student")({
  loader: () => getStarvingStudentOffers(),
  head: () => ({
    meta: [
      { title: "Starving Student Card Hub — Studeats" },
      { name: "description", content: "Every Starving Student Card deal, sorted by free vs discount, with a tracker for deals you've used." },
      { property: "og:title", content: "Starving Student Card Hub — Studeats" },
      { property: "og:description", content: "Track which Starving Student Card deals you've used." },
    ],
  }),
  component: SSHub,
});

const discountTypes = ["All Deals", "Free Only", "Discounts Only"] as const;
const statusFilters = ["Any Status", "Unused / Available", "Fully Redeemed"] as const;

function SSHub() {
  const { ssUsedCounts = {} } = useStore();
  const ssDeals = Route.useLoaderData();
  const cats = ["All categories", ...new Set(ssDeals.map((deal) => deal.category))];

  const [typeFilter, setTypeFilter] = useState<(typeof discountTypes)[number]>("All Deals");
  const [cat, setCat] = useState("All categories");
  const [statusFilter, setStatusFilter] = useState<(typeof statusFilters)[number]>("Any Status");
  const [sort, setSort] = useState<"company" | "type">("company");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<SSDeal | null>(null);

  // Confirmation state for un-marking a deal or unmarking all
  const [confirmDeal, setConfirmDeal] = useState<SSDeal | null>(null);
  const [confirmResetAll, setConfirmResetAll] = useState(false);

  // Animated deal IDs for punching or unpunching
  const [punchedId, setPunchedId] = useState<string | null>(null);
  const [unpunchedId, setUnpunchedId] = useState<string | null>(null);

  const t = q.trim().toLowerCase();

  // Stats calculation
  const totalOffers = ssDeals.length;
  const fullyUsedCount = ssDeals.filter((d) => {
    const count = ssUsedCounts[d.id] || 0;
    const isNoLimit = d.totalUses === null;
    if (isNoLimit) return false;
    return count >= (d.totalUses ?? 1);
  }).length;
  const totalClaimedPunches = Object.values(ssUsedCounts).reduce((a, b) => a + b, 0);

  const list = ssDeals
    .filter((d) => {
      // 1. Discount type filter
      if (typeFilter === "Free Only" && d.type !== "Free") return false;
      if (typeFilter === "Discounts Only" && d.type !== "Discount") return false;

      // 2. Category filter
      if (cat !== "All categories" && d.category !== cat) return false;

      // 3. Status filter
      const count = ssUsedCounts[d.id] || 0;
      const isNoLimit = d.totalUses === null;
      const isUsed = isNoLimit ? count > 0 : count >= (d.totalUses ?? 1);

      if (statusFilter === "Unused / Available" && isUsed) return false;
      if (statusFilter === "Fully Redeemed" && !isUsed) return false;

      // 4. Search query
      if (t) {
        const text = (d.company + " " + d.item + " " + d.details + " " + d.address).toLowerCase();
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

      // Group fully used deals at the bottom
      if (isUsedA !== isUsedB) return Number(isUsedA) - Number(isUsedB);

      return sort === "company" ? a.company.localeCompare(b.company) : a.type.localeCompare(b.type);
    });

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

    // Trigger punch animation and punch deal
    setPunchedId(deal.id);
    setTimeout(() => setPunchedId(null), 800);
    actions.toggleUsed(deal.id, deal.totalUses);
  };

  const handleConfirmReset = () => {
    if (confirmDeal) {
      const dealId = confirmDeal.id;
      setUnpunchedId(dealId);
      setTimeout(() => setUnpunchedId(null), 800);
      actions.resetUsed(dealId);
      setConfirmDeal(null);
    }
  };

  const handleResetAll = () => {
    actions.resetAllUsedSS();
    setConfirmResetAll(false);
  };

  return (
    <>
      <PageHeader eyebrow={`${ssDeals.length} offers`} title="Starving Student Card Hub">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput value={q} onChange={setQ} placeholder="Search card deals" />
          <Link to="/map" className="inline-flex h-10 items-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground">
            View on map →
          </Link>
        </div>
      </PageHeader>

      {/* 1. Progress & Punchcard Summary Header Banner */}
      <div className="mb-6 rounded-2xl border border-border/80 bg-card/60 p-5 shadow-sm backdrop-blur-md">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-base text-primary">💳</span>
              <h2 className="text-base font-semibold">Your Digital Punchcard Tracker</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Confirm current terms in the card portal before redeeming. “Used” is saved on this device.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-secondary/80 px-3.5 py-2 ring-1 ring-border text-center">
              <span className="block text-lg font-bold text-primary">{fullyUsedCount}</span>
              <span className="text-[11px] font-medium text-muted-foreground">Claimed</span>
            </div>
            <div className="rounded-xl bg-secondary/80 px-3.5 py-2 ring-1 ring-border text-center">
              <span className="block text-lg font-bold text-foreground">{totalOffers - fullyUsedCount}</span>
              <span className="text-[11px] font-medium text-muted-foreground">Available</span>
            </div>
            <div className="rounded-xl bg-secondary/80 px-3.5 py-2 ring-1 ring-border text-center">
              <span className="block text-lg font-bold text-accent">{totalOffers}</span>
              <span className="text-[11px] font-medium text-muted-foreground">Total Deals</span>
            </div>
          </div>
        </div>

        {/* Progress Bar & Testing Reset All Control */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground mb-1.5">
            <div className="flex items-center gap-2">
              <span>Punchcard Completion</span>
              {totalClaimedPunches > 0 && (
                <button
                  type="button"
                  onClick={() => setConfirmResetAll(true)}
                  className="rounded-full bg-secondary/90 px-2.5 py-0.5 text-[10px] font-medium text-destructive ring-1 ring-destructive/30 hover:bg-destructive/10 transition-colors"
                  title="Testing control: reset all saved card punches"
                >
                  Reset all used deals
                </button>
              )}
            </div>
            <span>{Math.round((fullyUsedCount / totalOffers) * 100)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary ring-1 ring-border">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${fullyUsedCount === 0 ? 0 : Math.max(2, (fullyUsedCount / totalOffers) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filter and sorting controls with clear grouping */}
      <div className="space-y-3" aria-label="Filter card offers">
        {/* Row 1: Deal Type & Card Status */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">Type:</span>
            <FilterChips options={discountTypes} value={typeFilter} onChange={setTypeFilter} />
          </div>

          <div className="h-4 w-px bg-border hidden sm:block" />

          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">Status:</span>
            <FilterChips options={statusFilters} value={statusFilter} onChange={setStatusFilter} />
          </div>
        </div>

        {/* Row 2: Category & Sort */}
        <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-border/40">
          <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
            <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">Category:</span>
            <FilterChips options={cats} value={cat} onChange={setCat} />
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">Sort:</span>
            <select
              aria-label="Sort card offers"
              value={sort}
              onChange={(e) => setSort(e.target.value as "company" | "type")}
              className="h-9 rounded-full bg-secondary px-3 text-xs font-medium ring-1 ring-border outline-none"
            >
              <option value="company">Company (A-Z)</option>
              <option value="type">Discount type</option>
            </select>
          </div>
        </div>
      </div>

      {/* Confirmation Modal when unmarking a single deal */}
      {confirmDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-popover p-6 shadow-float ring-1 ring-border">
            <span className="grid size-10 place-items-center rounded-xl bg-destructive/10 text-xl text-destructive mb-3">⚠️</span>
            <h3 className="text-lg font-semibold text-foreground">Reset deal to unused?</h3>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to unmark <strong className="text-foreground">{confirmDeal.item}</strong> from {confirmDeal.company}? This will reset its punchcard count back to 0.
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
          </div>
        </div>
      )}

      {/* Confirmation Modal when resetting ALL deals */}
      {confirmResetAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-popover p-6 shadow-float ring-1 ring-border">
            <span className="grid size-10 place-items-center rounded-xl bg-destructive/10 text-xl text-destructive mb-3">🔄</span>
            <h3 className="text-lg font-semibold text-foreground">Reset all used deals?</h3>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              This will clear all redeemed punches across the entire Starving Student Card Hub on this device.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmResetAll(false)}
                className="rounded-full bg-secondary px-4 py-2 text-xs font-semibold ring-1 ring-border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetAll}
                className="rounded-full bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 transition-colors shadow-sm"
              >
                Yes, reset all
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Deals List with Prominent "Mark as Used" Actions */}
      <div className="mt-6 grid gap-3">
        {list.map((d) => {
          const count = ssUsedCounts[d.id] || 0;
          const isNoLimit = d.totalUses === null;
          const total = isNoLimit ? null : (d.totalUses ?? 1);
          const isFullyUsed = isNoLimit ? false : count >= (total ?? 1);
          const isPunched = punchedId === d.id;
          const isUnpunched = unpunchedId === d.id;

          return (
            <div
              key={d.id}
              className={`glass group relative flex flex-wrap items-center gap-3 p-4 sm:flex-nowrap sm:gap-4 transition-all duration-300 ${
                isFullyUsed ? "bg-muted/40 opacity-70" : "hover:-translate-y-0.5 hover:shadow-sm"
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
                  <h3 className={`text-base font-semibold sm:text-lg transition-colors ${isFullyUsed ? "line-through text-muted-foreground" : "text-foreground group-hover:text-primary"}`}>
                    {d.item}
                  </h3>

                  {/* Multi-use badge: never show fractions for unlimited */}
                  {isNoLimit ? (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground ring-1 ring-border">
                      {count > 0 ? `Unlimited (${count} used)` : "Unlimited Uses"}
                    </span>
                  ) : total && total > 1 ? (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground ring-1 ring-border">
                      {count > 0 ? `${count}/${total} Uses` : `${total} Uses`}
                    </span>
                  ) : null}

                  {/* Stamped punch badge if fully used */}
                  {isFullyUsed && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary animate-punch">
                      <span>✓</span>
                      <span>REDEEMED</span>
                    </span>
                  )}
                </div>

                <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                  <strong className="text-foreground/90 font-medium">{d.company}</strong> · {d.category} ·{" "}
                  {d.locations.length ? `${d.locations.length} ${d.locations.length === 1 ? "location" : "locations"}` : "Location not confirmed"}
                </p>
              </button>

              {/* Prominent "Mark as Used" Action Button */}
              <div className="flex w-full items-center justify-end sm:w-auto shrink-0">
                <button
                  type="button"
                  onClick={(e) => handleCardAction(e, d)}
                  title={isFullyUsed ? "Click to unmark/reset this deal" : isNoLimit ? "Click to record a use" : "Click to mark this deal as used"}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 active:scale-95 ${
                    isFullyUsed
                      ? "bg-secondary text-foreground/80 ring-1 ring-border hover:bg-destructive/10 hover:text-destructive hover:ring-destructive/30"
                      : count > 0
                      ? "bg-primary/20 text-primary ring-1 ring-primary/40 hover:bg-primary hover:text-primary-foreground shadow-sm"
                      : "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:scale-[1.02]"
                  }`}
                >
                  {isFullyUsed ? (
                    <>
                      <span>✓ Used</span>
                      <span className="text-[10px] opacity-70">({count}/{total})</span>
                    </>
                  ) : count > 0 ? (
                    <>
                      <span>Punch Use {count + 1}</span>
                      {isNoLimit ? (
                        <span className="text-[10px] opacity-80">(Used {count}x)</span>
                      ) : (
                        <span className="text-[10px] opacity-80">({count}/{total})</span>
                      )}
                    </>
                  ) : (
                    <>
                      <span>Mark Used</span>
                      {!isNoLimit && total && total > 1 && <span className="text-[10px] opacity-80">(0/{total})</span>}
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}

        {list.length === 0 && (
          <div className="glass p-8 text-center" role="status">
            <h2 className="text-xl font-semibold">No card offers found</h2>
            <p className="mt-2 text-sm text-muted-foreground">Try another search or change the filters.</p>
            <button
              type="button"
              onClick={() => {
                setQ("");
                setTypeFilter("All Deals");
                setStatusFilter("Any Status");
                setCat("All categories");
              }}
              className="mt-4 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Clear search and filters
            </button>
          </div>
        )}
      </div>

      <SSDetail deal={open} onClose={() => setOpen(null)} />
    </>
  );
}
