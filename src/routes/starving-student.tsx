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

const types = ["All", "Free", "Discount"] as const;

function SSHub() {
  const { usedSS } = useStore();
  const ssDeals = Route.useLoaderData();
  const cats = ["All categories", ...new Set(ssDeals.map((deal) => deal.category))];
  const [type, setType] = useState<(typeof types)[number]>("All");
  const [cat, setCat] = useState("All categories");
  const [sort, setSort] = useState<"company" | "type">("company");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<SSDeal | null>(null);
  const t = q.trim().toLowerCase();
  const list = ssDeals
    .filter((d) => (type === "All" || d.type === type) && (cat === "All categories" || d.category === cat) && (!t || (d.company + d.item + d.details + d.address).toLowerCase().includes(t)))
    .sort((a, b) => {
      const u = Number(usedSS.includes(a.id)) - Number(usedSS.includes(b.id));
      if (u) return u;
      return sort === "company" ? a.company.localeCompare(b.company) : a.type.localeCompare(b.type);
    });

  return (
    <>
      <PageHeader eyebrow={`${ssDeals.length} offers`} title="Starving Student Card Hub">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput value={q} onChange={setQ} placeholder="Search card deals" />
          <Link to="/map" className="inline-flex h-10 items-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground">View on map →</Link>
        </div>
      </PageHeader>
      <p className="mb-5 text-sm text-muted-foreground">Confirm current terms in the card portal before redeeming. “Used” is your personal reminder on this device.</p>
      <div className="flex flex-wrap items-center gap-4" aria-label="Filter card offers">
        <FilterChips options={types} value={type} onChange={setType} />
        <FilterChips options={cats} value={cat} onChange={setCat} />
        <select aria-label="Sort card offers" value={sort} onChange={(e) => setSort(e.target.value as "company" | "type")} className="h-9 rounded-full bg-secondary px-3 text-sm ring-1 ring-border">
          <option value="company">Sort: company</option>
          <option value="type">Sort: discount type</option>
        </select>
      </div>

      <div className="mt-6 grid gap-3">
        {list.map((d) => {
          const used = usedSS.includes(d.id);
          return (
            <div key={d.id} className={`glass flex flex-wrap items-center gap-3 p-4 sm:flex-nowrap sm:gap-4 transition-opacity ${used ? "opacity-60" : ""}`}>
              <span className={`grid size-14 shrink-0 place-items-center rounded-lg font-display text-sm font-semibold ${d.type === "Free" ? "bg-gold/15 text-gold" : "bg-accent/10 text-accent"}`}>{d.value}</span>
              <button onClick={() => setOpen(d)} className="min-w-0 flex-1 text-left rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" aria-label={`View details for ${d.item} at ${d.company}`}>
                <h3 className={`text-lg font-semibold ${used ? "line-through" : ""}`}>{d.item}</h3>
                <p className="text-sm text-muted-foreground">{d.company} · {d.category} · {d.locations.length ? `${d.locations.length} ${d.locations.length === 1 ? "location" : "locations"}` : "Location not confirmed"}</p>
              </button>
              <label className="flex w-full cursor-pointer items-center justify-end gap-2 text-sm sm:w-auto">
                <input type="checkbox" checked={used} onChange={() => actions.toggleUsed(d.id)} className="size-4 accent-[var(--primary)]" />
                Used
              </label>
            </div>
          );
        })}
        {list.length === 0 && (
          <div className="glass p-8 text-center" role="status">
            <h2 className="text-xl font-semibold">No card offers found</h2>
            <p className="mt-2 text-sm text-muted-foreground">Try another search or change the filters.</p>
            <button type="button" onClick={() => { setQ(""); setType("All"); setCat("All categories"); }} className="mt-4 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Clear search and filters</button>
          </div>
        )}
      </div>
      <SSDetail deal={open} onClose={() => setOpen(null)} />
    </>
  );
}
