import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import type { Deal } from "@/lib/data";
import { actions, useStore } from "@/lib/store";
import { DealDetail, FilterChips, PageHeader, SearchInput, chipTone, Btn, CompanyLogo } from "@/components/ui-bits";
import { useDealsQuery } from "@/lib/deals";
import { getCompanyCatalogEntry } from "@/lib/company-catalog";

export const Route = createFileRoute("/discounts")({
  head: () => ({
    meta: [
      { title: "Discount Dashboard — Studeats" },
      { name: "description", content: "Browse, search, filter and save student discounts on food, tech, AI tools and subscriptions." },
      { property: "og:title", content: "Discount Dashboard — Studeats" },
      { property: "og:description", content: "Every student discount, sortable and saveable." },
    ],
  }),
  component: Discounts,
});

const cats = ["All", "New", "Saved", "Food", "Tech", "AI", "Subscription", "Fitness", "Travel", "Free", "Percent off"] as const;
type Cat = (typeof cats)[number];

function Discounts() {
  const { savedDeals } = useStore();
  const [cat, setCat] = useState<Cat>("All");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"default" | "company">("default");
  const [open, setOpen] = useState<Deal | null>(null);

  const { data: deals = [], isLoading, isError, refetch } = useDealsQuery();

  const t = q.toLowerCase();
  let list = deals.filter((d) => {
    if (cat === "New" && !d.isNew) return false;
    if (cat === "Saved" && !savedDeals.includes(d.id)) return false;
    if ((cat === "Free" || cat === "Percent off") && d.type !== cat) return false;
    if (!["All", "New", "Saved", "Free", "Percent off"].includes(cat) && d.category !== cat) return false;
    return !t || (d.title + d.company + d.description + d.category).toLowerCase().includes(t);
  });
  if (sort === "company") list = [...list].sort((a, b) => a.company.localeCompare(b.company));

  return (
    <>
      <PageHeader eyebrow={`${deals.length} verified student discounts`} title="Discount Dashboard">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput value={q} onChange={setQ} placeholder="Search company, deal, category" />
          <select value={sort} onChange={(e) => setSort(e.target.value as "default")} className="h-10 rounded-full bg-secondary px-3 text-sm ring-1 ring-border">
            <option value="default">Sort: featured</option>
            <option value="company">Sort: company A–Z</option>
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
        <div className="glass mt-8 p-8 text-center">
          <p className="font-semibold text-destructive">Could not load discounts from database.</p>
          <Btn variant="soft" onClick={() => refetch()} className="mt-4">Try again</Btn>
        </div>
      )}

      {!isLoading && !isError && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((d, i) => {
            const saved = savedDeals.includes(d.id);
            return (
              <div
                key={d.id}
                className="glass group relative flex flex-col justify-between overflow-hidden p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-float border border-border/70 hover:border-border"
              >
                <div>
                  {/* Top Bar: Category Pill & Save Star */}
                  <div className="flex items-center justify-between gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${chipTone(i)}`}>
                      {d.category}{d.isNew && " · New"}
                    </span>
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
                  <button onClick={() => setOpen(d)} className="mt-3.5 block w-full text-left focus:outline-none">
                    {/* 1. Company Name & Logo at the Top */}
                    <div className="flex items-center gap-3">
                      <CompanyLogo company={d.company} url={d.url} size={44} />
                      <div className="min-w-0 flex-1">
                        <h3 className="text-xl font-bold tracking-tight text-foreground truncate group-hover:text-primary transition-colors">
                          {d.company}
                        </h3>
                        <p className="text-xs text-muted-foreground truncate font-medium">
                          {getCompanyCatalogEntry(d.company)?.tagline || d.duration || "Active student discount"}
                        </p>
                      </div>
                    </div>

                    {/* 2. Noticeable Percent Off / Value (smaller than company name) */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-lg bg-accent/15 px-2.5 py-1 text-sm font-bold text-accent ring-1 ring-accent/30">
                        🏷️ {d.value}
                      </span>
                      <span className="text-xs font-semibold text-foreground/85 line-clamp-1">
                        {d.title}
                      </span>
                    </div>

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
          })}
          {list.length === 0 && (
            <div className="col-span-full glass p-10 text-center">
              <div className="text-3xl">🏷️</div>
              <h4 className="mt-3 text-lg font-semibold">
                {q ? "No matching discounts found" : cat === "Saved" ? "No saved discounts yet" : "No discounts in this category yet"}
              </h4>
              <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
                {q 
                  ? `We couldn't find any student perks matching "${q}". Try another search term or clear the filter.`
                  : cat === "Saved"
                  ? "Tap the star icon on any deal card to save your favorite student discounts here for quick access."
                  : "Check back soon! Our automated scraper scans ID.me, tech platforms, and Provo campus favorites every morning."}
              </p>
              {(q || cat !== "All") && (
                <button
                  onClick={() => { setQ(""); setCat("All"); }}
                  className="mt-4 inline-flex items-center rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20"
                >
                  Reset filters
                </button>
              )}
            </div>
          )}
        </div>
      )}
      <DealDetail deal={open} onClose={() => setOpen(null)} />
    </>
  );
}
