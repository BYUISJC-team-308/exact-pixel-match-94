import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ssDeals, type SSDeal } from "@/lib/data";
import { actions, useStore } from "@/lib/store";
import { FilterChips, PageHeader, SSDetail, SearchInput } from "@/components/ui-bits";

export const Route = createFileRoute("/starving-student")({
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

const types = ["All", "Free", "Discount"] as const;
const cats = ["All categories", "Food", "Coffee", "Entertainment", "Services"] as const;

function SSHub() {
  const { usedSS } = useStore();
  const [type, setType] = useState<(typeof types)[number]>("All");
  const [cat, setCat] = useState<(typeof cats)[number]>("All categories");
  const [sort, setSort] = useState<"company" | "type">("company");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<SSDeal | null>(null);
  const t = q.toLowerCase();
  const list = ssDeals
    .filter((d) => (type === "All" || d.type === type) && (cat === "All categories" || d.category === cat) && (!t || (d.company + d.item).toLowerCase().includes(t)))
    .sort((a, b) => {
      const u = Number(usedSS.includes(a.id)) - Number(usedSS.includes(b.id));
      if (u) return u;
      return sort === "company" ? a.company.localeCompare(b.company) : a.type.localeCompare(b.type);
    });

  return (
    <>
      <PageHeader eyebrow={`${usedSS.length} of ${ssDeals.length} used`} title="Starving Student Card Hub">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput value={q} onChange={setQ} placeholder="Search card deals" />
          <Link to="/map" className="inline-flex h-10 items-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground">View on map →</Link>
        </div>
      </PageHeader>
      <div className="flex flex-wrap items-center gap-4">
        <FilterChips options={types} value={type} onChange={setType} />
        <FilterChips options={cats} value={cat} onChange={setCat} />
        <select value={sort} onChange={(e) => setSort(e.target.value as "company")} className="h-9 rounded-full bg-secondary px-3 text-sm ring-1 ring-border">
          <option value="company">Sort: company</option>
          <option value="type">Sort: discount type</option>
        </select>
      </div>
      <div className="mt-6 grid gap-3">
        {list.map((d) => {
          const used = usedSS.includes(d.id);
          return (
            <div key={d.id} className={`glass flex items-center gap-4 p-4 transition-opacity ${used ? "opacity-45" : ""}`}>
              <span className={`grid size-14 shrink-0 place-items-center rounded-lg font-display text-sm font-semibold ${d.type === "Free" ? "bg-gold/15 text-gold" : "bg-accent/10 text-accent"}`}>{d.value}</span>
              <button onClick={() => setOpen(d)} className="min-w-0 flex-1 text-left">
                <h3 className={`text-lg font-semibold ${used ? "line-through" : ""}`}>{d.item}</h3>
                <p className="text-sm text-muted-foreground">{d.company} · {d.category} · {d.address}</p>
              </button>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={used} onChange={() => actions.toggleUsed(d.id)} className="size-4 accent-[var(--primary)]" />
                Used
              </label>
            </div>
          );
        })}
      </div>
      <SSDetail deal={open} onClose={() => setOpen(null)} />
    </>
  );
}
