import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import type { Deal, FoodEvent, SSDeal } from "@/lib/data";
import { eventDate } from "@/lib/data";
import { actions, useStore } from "@/lib/store";

const KNOWN_COMPANY_DOMAINS: Record<string, string> = {
  github: "github.com",
  cursor: "cursor.com",
  perplexity: "perplexity.ai",
  notion: "notion.so",
  figma: "figma.com",
  jetbrains: "jetbrains.com",
  spotify: "spotify.com",
  apple: "apple.com",
  amazon: "amazon.com",
  adobe: "adobe.com",
  microsoft: "microsoft.com",
  youtube: "youtube.com",
  tableau: "tableau.com",
  autodesk: "autodesk.com",
  "1password": "1password.com",
  "t-mobile": "t-mobile.com",
  figs: "wearfigs.com",
  oura: "ouraring.com",
  "amc theatres": "amctheatres.com",
  "amc theatres®": "amctheatres.com",
  "7-eleven": "7-eleven.com",
  target: "target.com",
  nike: "nike.com",
  samsung: "samsung.com",
  adidas: "adidas.com",
  costco: "costco.com",
  hulu: "hulu.com",
  disney: "disneyplus.com",
  "disney+": "disneyplus.com",
  paramount: "paramountplus.com",
  "paramount+": "paramountplus.com",
  peacock: "peacocktv.com",
  canva: "canva.com",
  swig: "swigdrinks.com",
  "costa vida": "costavida.com",
  chipotle: "chipotle.com",
  subway: "subway.com",
  "byu store": "byustore.com",
  byu: "byu.edu",
  starbucks: "starbucks.com",
  dominos: "dominos.com",
  "domino's": "dominos.com",
  "papa johns": "papajohns.com",
  "papa john's": "papajohns.com",
  chickfila: "chick-fil-a.com",
  "chick-fil-a": "chick-fil-a.com",
  wendys: "wendys.com",
  "wendy's": "wendys.com",
  mcdonalds: "mcdonalds.com",
  "mcdonald's": "mcdonalds.com",
  dell: "dell.com",
  hp: "hp.com",
  lenovo: "lenovo.com",
  grammarly: "grammarly.com",
  headspace: "headspace.com",
  calm: "calm.com",
  peloton: "onepeloton.com",
  underarmour: "underarmour.com",
  "under armour": "underarmour.com",
  gymshark: "gymshark.com",
  uber: "uber.com",
  doordash: "doordash.com",
  instacart: "instacart.com",
  chegg: "chegg.com",
  quizlet: "quizlet.com",
  duolingo: "duolingo.com",
};

export function getCompanyDomain(company: string, url?: string): string {
  const clean = (company || "").toLowerCase().trim();
  for (const [key, domain] of Object.entries(KNOWN_COMPANY_DOMAINS)) {
    if (clean.includes(key)) return domain;
  }

  if (url) {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.replace(/^www\./, "");
      if (!host.includes("id.me") && !host.includes("google.com") && !host.includes("bing.com")) {
        return host;
      }
    } catch {
      // ignore
    }
  }

  const stripped = clean.replace(/[^a-z0-9]/g, "");
  return stripped ? `${stripped}.com` : "example.com";
}

export function CompanyLogo({
  company,
  url,
  size = 44,
  className = "",
}: {
  company: string;
  url?: string;
  size?: number;
  className?: string;
}) {
  const [hasError, setHasError] = useState(false);
  const domain = getCompanyDomain(company, url);
  const iconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

  const initials =
    company
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("") || company.slice(0, 2).toUpperCase() || "ST";

  return (
    <div
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
      className={`relative grid place-items-center rounded-xl bg-card border border-border/80 shadow-sm overflow-hidden flex-shrink-0 ${className}`}
      title={company}
    >
      {!hasError ? (
        <img
          src={iconUrl}
          alt={`${company} logo`}
          loading="lazy"
          className="h-3/4 w-3/4 object-contain transition-transform duration-200 group-hover:scale-110"
          onError={() => setHasError(true)}
        />
      ) : (
        <div className="grid h-full w-full place-items-center bg-gradient-to-br from-primary/15 via-accent/10 to-primary/5 font-bold text-xs tracking-wider text-primary">
          {initials}
        </div>
      )}
    </div>
  );
}

export function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="rise relative w-full max-w-md rounded-2xl bg-popover p-6 shadow-float" onClick={(e) => e.stopPropagation()} role="dialog">
        <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 grid size-8 place-items-center rounded-full bg-muted text-muted-foreground hover:text-foreground">✕</button>
        {children}
      </div>
    </div>
  );
}

export function Btn({ variant = "primary", className = "", ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "soft" }) {
  const v = variant === "primary"
    ? "bg-primary text-primary-foreground hover:bg-primary/90"
    : "bg-secondary text-secondary-foreground ring-1 ring-border hover:bg-glass";
  return <button {...p} className={`inline-flex items-center justify-center gap-1 rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${v} ${className}`} />;
}

export const chipTone = (i: number) => ["bg-primary/10 text-primary", "bg-accent/10 text-accent", "bg-gold/15 text-gold"][i % 3];

export function DealDetail({ deal, onClose }: { deal: Deal | null; onClose: () => void }) {
  const { savedDeals } = useStore();
  if (!deal) return null;
  const saved = savedDeals.includes(deal.id);
  return (
    <Modal open onClose={onClose}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <CompanyLogo company={deal.company} url={deal.url} size={48} />
          <div>
            <h3 className="text-2xl font-bold tracking-tight text-foreground">{deal.company}</h3>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {deal.category} · {deal.type}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center rounded-lg bg-accent/15 px-3 py-1 text-base font-bold text-accent ring-1 ring-accent/30">
          🏷️ {deal.value}
        </span>
        <span className="text-sm font-semibold text-foreground/90">{deal.title}</span>
      </div>

      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{deal.description}</p>
      <dl className="mt-4 space-y-2 text-sm border-t border-border/50 pt-3">
        <div><dt className="font-semibold text-foreground">Company</dt><dd className="text-muted-foreground">{deal.company}</dd></div>
        <div><dt className="font-semibold text-foreground">Duration</dt><dd className="text-muted-foreground">{deal.duration}</dd></div>
        <div><dt className="font-semibold text-foreground">How to get it</dt><dd className="text-muted-foreground">{deal.howTo}</dd></div>
      </dl>
      <div className="mt-6 flex flex-wrap gap-2">
        <a href={deal.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Go to provider →</a>
        <Btn variant="soft" onClick={() => actions.toggleDeal(deal.id)}>{saved ? "★ Saved to hub" : "☆ Save to hub"}</Btn>
      </div>
    </Modal>
  );
}

export function EventDetail({ event, onClose }: { event: FoodEvent | null; onClose: () => void }) {
  const { savedEvents } = useStore();
  if (!event) return null;
  const saved = savedEvents.includes(event.id);
  return (
    <Modal open onClose={onClose}>
      <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs font-medium text-gold">Free food · {event.food}</span>
      <h3 className="mt-3 text-2xl font-semibold">{event.title}</h3>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div><dt className="font-semibold">When</dt><dd className="text-muted-foreground">{eventDate(event).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}, {event.start}–{event.end}</dd></div>
        <div><dt className="font-semibold">Hosted by</dt><dd className="text-muted-foreground">{event.host}</dd></div>
        <div><dt className="font-semibold">Where</dt><dd className="text-muted-foreground">{event.building}</dd></div>
        <div><dt className="font-semibold">Room</dt><dd className="text-muted-foreground">{event.room}</dd></div>
      </dl>
      <p className="mt-4 text-sm text-muted-foreground">{event.details}</p>
      <div className="mt-6 flex flex-wrap gap-2">
        <Btn onClick={() => actions.toggleEvent(event.id)}>{saved ? "★ Saved to hub" : "☆ Save to hub"}</Btn>
        <Link to="/map" className="inline-flex items-center rounded-full bg-secondary px-4 py-2 text-sm font-medium ring-1 ring-border">See on map</Link>
      </div>
    </Modal>
  );
}

export function SSDetail({ deal, onClose }: { deal: SSDeal | null; onClose: () => void }) {
  const { usedSS } = useStore();
  if (!deal) return null;
  const used = usedSS.includes(deal.id);
  return (
    <Modal open onClose={onClose}>
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${deal.type === "Free" ? "bg-gold/15 text-gold" : "bg-accent/10 text-accent"}`}>Starving Student Card · {deal.category}</span>
      <h3 className="mt-3 text-2xl font-semibold">{deal.item}</h3>
      <p className="mt-1 text-3xl font-semibold text-accent">{deal.value}</p>
      <p className="mt-1 text-sm font-medium">{deal.company}</p>
      <p className="mt-3 text-sm text-muted-foreground">{deal.details}</p>
      <p className="mt-2 text-sm text-muted-foreground">📍 {deal.address}</p>
      <div className="mt-6 flex flex-wrap gap-2">
        <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(deal.address)}`} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Directions →</a>
        <Btn variant="soft" onClick={() => actions.toggleUsed(deal.id)}>{used ? "✓ Used — undo" : "Mark as used"}</Btn>
      </div>
    </Modal>
  );
}

export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div className="rise flex flex-wrap items-end justify-between gap-4 py-10">
      <div>
        <span className="inline-flex rounded-full bg-secondary px-3 py-1 text-xs font-medium text-primary ring-1 ring-border">{eyebrow}</span>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">{title}</h1>
      </div>
      {children}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="flex h-10 w-full items-center gap-2 rounded-full bg-secondary px-4 ring-1 ring-border md:w-72">
      <span className="text-muted-foreground">⌕</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
    </div>
  );
}

export function FilterChips<T extends string>({ options, value, onChange }: { options: readonly T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o} onClick={() => onChange(o)} className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${value === o ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground ring-1 ring-border hover:text-foreground"}`}>{o}</button>
      ))}
    </div>
  );
}
