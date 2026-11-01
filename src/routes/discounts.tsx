import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import type { Deal } from "@/lib/data";
import { actions, useStore } from "@/lib/store";
import { DealDetail, FilterChips, PageHeader, SearchInput, chipTone, Btn } from "@/components/ui-bits";
import { useDealsQuery } from "@/lib/deals";

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
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass animate-pulse p-5">
              <div className="h-4 w-20 rounded bg-muted" />
              <div className="mt-3 h-8 w-24 rounded bg-muted" />
              <div className="mt-2 h-5 w-3/4 rounded bg-muted" />
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
              <div key={d.id} className="glass group relative overflow-hidden p-5 transition-transform hover:-translate-y-1">
                <div className="flex items-start justify-between">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${chipTone(i)}`}>{d.category}{d.isNew && " · New"}</span>
                  <button onClick={() => actions.toggleDeal(d.id)} aria-label={saved ? "Unsave" : "Save"} className={`text-xl ${saved ? "text-gold" : "text-muted-foreground hover:text-gold"}`}>{saved ? "★" : "☆"}</button>
                </div>
                <button onClick={() => setOpen(d)} className="block w-full text-left">
                  <p className="mt-4 font-display text-4xl font-semibold text-accent">{d.value}</p>
                  <h3 className="mt-2 text-lg font-semibold">{d.title}</h3>
                  <p className="text-xs font-medium text-muted-foreground">{d.company}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{d.description}</p>
                  <span className="mt-4 inline-block text-sm font-medium text-primary">Details →</span>
                </button>
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
