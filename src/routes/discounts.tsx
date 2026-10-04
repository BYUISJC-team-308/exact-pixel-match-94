import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { deals, type Deal } from "@/lib/data";
import { actions, useStore } from "@/lib/store";
import { DealDetail, FilterChips, PageHeader, SearchInput, chipTone } from "@/components/ui-bits";

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

const cats = ["All", "New", "Saved", "Food", "Tech", "AI", "Subscription", "Groceries", "Print", "Fitness", "Travel", "Free", "Percent off"] as const;
type Cat = (typeof cats)[number];

function Discounts() {
  const { savedDeals } = useStore();
  const [cat, setCat] = useState<Cat>("All");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"default" | "company">("default");
  const [open, setOpen] = useState<Deal | null>(null);
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
      <PageHeader eyebrow={`${deals.length} student discounts`} title="Discount Dashboard">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput value={q} onChange={setQ} placeholder="Search company, deal, category" />
          <select value={sort} onChange={(e) => setSort(e.target.value as "default")} className="h-10 rounded-full bg-secondary px-3 text-sm ring-1 ring-border">
            <option value="default">Sort: featured</option>
            <option value="company">Sort: company A–Z</option>
          </select>
        </div>
      </PageHeader>
      <FilterChips options={cats} value={cat} onChange={setCat} />
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
        {list.length === 0 && <p className="text-sm text-muted-foreground">No discounts match.</p>}
      </div>
      <DealDetail deal={open} onClose={() => setOpen(null)} />
    </>
  );
}
