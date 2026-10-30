import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { siteSections, ssDeals } from "@/lib/data";
import { useStore } from "@/lib/store";
import { useFoodEventsQuery } from "@/lib/food-events";
import { useDealsQuery } from "@/lib/deals";

const nav = [
  { to: "/", label: "Home" },
  { to: "/discounts", label: "Discounts" },
  { to: "/starving-student", label: "Starving Student" },
  { to: "/free-food", label: "Free Food" },
  { to: "/calendar", label: "Calendar" },
  { to: "/map", label: "Map" },
] as const;

export function SiteHeader() {
  const { user } = useStore();
  const [q, setQ] = useState("");
  const [menu, setMenu] = useState(false);
  const navigate = useNavigate();

  const { data: foodEvents = [] } = useFoodEventsQuery();
  const { data: deals = [] } = useDealsQuery();

  const t = q.trim().toLowerCase();
  const results = t
    ? [
        ...siteSections.filter((s) => (s.label + s.desc).toLowerCase().includes(t)).map((s) => ({ to: s.to, label: s.label, sub: "Page" })),
        ...deals.filter((d) => (d.title + d.company + d.category).toLowerCase().includes(t)).map((d) => ({ to: "/discounts", label: d.title, sub: "Discount" })),
        ...ssDeals.filter((d) => (d.item + d.company).toLowerCase().includes(t)).map((d) => ({ to: "/starving-student", label: `${d.company}: ${d.item}`, sub: "Starving Student" })),
        ...foodEvents.filter((e) => (e.title + e.food + e.building).toLowerCase().includes(t)).map((e) => ({ to: "/free-food", label: e.title, sub: "Free food" })),
      ].slice(0, 8)
    : [];

  return (
    <header className="sticky top-0 z-40 border-b border-glass/60 bg-glass/55 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-6 py-3">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">SB</span>
          <span className="font-display text-lg font-semibold tracking-tight">Studeats</span>
        </Link>
        <nav className="ml-3 hidden items-center gap-1 lg:flex">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: true }}
              className="rounded-full px-3 py-1.5 text-sm font-medium text-foreground/70 hover:bg-glass/60"
              activeProps={{ className: "bg-primary/10 !text-primary" }}>{n.label}</Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <div className="flex h-9 w-44 items-center gap-2 rounded-full bg-secondary px-3 ring-1 ring-border sm:w-56">
              <span className="text-muted-foreground">🔍</span>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search deals, places, free food" className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" aria-label="Search the site" />
            </div>
            {t && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl bg-popover p-2 shadow-float">
                {results.length === 0 && <p className="p-3 text-sm text-muted-foreground">No matches.</p>}
                {results.map((r, i) => (
                  <button key={i} onClick={() => { navigate({ to: r.to }); setQ(""); }} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-muted">
                    <span>{r.label}</span><span className="text-xs text-muted-foreground">{r.sub}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Link to={user ? "/profile" : "/account"} aria-label="Profile" className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary font-display font-semibold text-primary ring-1 ring-border">
            {user?.avatar ? <img src={user.avatar} alt="" className="size-full object-cover" /> : user ? user.name[0]?.toUpperCase() : "👤"}
          </Link>
          <button onClick={() => setMenu(!menu)} className="grid size-9 place-items-center rounded-full bg-secondary ring-1 ring-border lg:hidden" aria-label="Menu">☰</button>
        </div>
      </div>
      {menu && (
        <nav className="flex flex-wrap gap-1 px-6 pb-3 lg:hidden">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} onClick={() => setMenu(false)} className="rounded-full bg-secondary px-3 py-1.5 text-sm">{n.label}</Link>
          ))}
        </nav>
      )}
    </header>
  );
}
