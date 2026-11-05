import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import type { Deal, FoodEvent, SSDeal } from "@/lib/data";
import { eventDate } from "@/lib/data";
import { actions, useStore } from "@/lib/store";
import { submitDataIssue, type DataIssueInput } from "@/lib/data-issues";

function ReportIssueButton({ itemType, itemId, itemLabel }: Pick<DataIssueInput, "itemType" | "itemId" | "itemLabel">) {
  const [open, setOpen] = useState(false);
  const [issueType, setIssueType] = useState("Offer details are incorrect");
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  return <>
    <button type="button" onClick={() => setOpen(true)} className="text-xs font-semibold text-muted-foreground underline hover:text-foreground">Report incorrect information</button>
    <Modal open={open} onClose={() => setOpen(false)}>
      <h3 className="text-xl font-semibold">Report an information problem</h3>
      <p className="mt-1 text-sm text-muted-foreground">Help the team keep {itemLabel} accurate.</p>
      <label className="mt-4 block text-sm font-medium">What is wrong?
        <select value={issueType} onChange={(event) => setIssueType(event.target.value)} className="mt-1 block w-full rounded-lg border border-border bg-background p-2">
          <option>Offer details are incorrect</option><option>Offer is expired</option><option>Location is incorrect</option><option>Event was cancelled</option><option>Other</option>
        </select>
      </label>
      <label className="mt-3 block text-sm font-medium">More details
        <textarea value={details} onChange={(event) => setDetails(event.target.value)} maxLength={2000} className="mt-1 block min-h-24 w-full rounded-lg border border-border bg-background p-2" />
      </label>
      {status === "sent" && <p className="mt-3 text-sm font-semibold text-primary">Thanks—your report was submitted.</p>}
      {status === "error" && <p className="mt-3 text-sm text-destructive">The report could not be submitted. Please try again.</p>}
      <Btn className="mt-4" disabled={status === "sending" || status === "sent"} onClick={async () => { setStatus("sending"); try { await submitDataIssue({ itemType, itemId, itemLabel, issueType, details }); setStatus("sent"); } catch { setStatus("error"); } }}>{status === "sending" ? "Submitting…" : "Submit report"}</Btn>
    </Modal>
  </>;
}

import { getCompanyCatalogEntry } from "@/lib/company-catalog";

const KNOWN_COMPANY_DOMAINS: Record<string, string> = {
  github: "github.com",
  google: "google.com",
  openai: "openai.com",
  chatgpt: "chatgpt.com",
  "google cloud": "cloud.google.com",
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
  saatva: "saatva.com",
  leesa: "leesa.com",
  glassesusa: "glassesusa.com",
  "glassesusa.com": "glassesusa.com",
  "red wing": "redwingshoes.com",
  "sam's club": "samsclub.com",
  "bj's wholesale club": "bjs.com",
  "b1g+": "bigtenplus.com",
  hoka: "hoka.com",
  on: "on.com",
  saucony: "saucony.com",
  merrell: "merrell.com",
  crocs: "crocs.com",
  birkenstock: "birkenstock.com",
  heydude: "heydude.com",
  reebok: "reebok.com",
  tecovas: "tecovas.com",
  oofos: "oofos.com",
  "beyond yoga": "beyondyoga.com",
  comfrt: "comfrt.com",
  "aventon bikes": "aventon.com",
  canyon: "canyon.com",
  "avocado mattress": "avocadogreenmattress.com",
  "brooklyn bedding": "brooklynbedding.com",
  "mattress firm": "mattressfirm.com",
  caraway: "carawayhome.com",
  "stanley 1913": "stanley1913.com",
  ecoflow: "ecoflow.com",
  roborock: "roborock.com",
  sonos: "sonos.com",
  sony: "sony.com",
  turbotax: "turbotax.intuit.com",
  betterhelp: "betterhelp.com",
  "aaa membership": "aaa.com",
  "the farmer's dog": "thefarmersdog.com",
  "home chef": "homechef.com",
  untuckit: "untuckit.com",
  "southern tide": "southerntide.com",
  "lenscrafters": "lenscrafters.com",
  "lensdirect": "lensdirect.com",
  "contactsdirect": "contactsdirect.com",
  "zenni optical": "zennioptical.com",
  "sunglass hut": "sunglasshut.com",
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
            {getCompanyCatalogEntry(deal.company)?.tagline && (
              <p className="text-xs font-medium text-muted-foreground">{getCompanyCatalogEntry(deal.company)?.tagline}</p>
            )}
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
      <div className="mt-4 border-t border-border pt-3"><ReportIssueButton itemType="deal" itemId={deal.id} itemLabel={`${deal.company}: ${deal.title}`} /></div>
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
      <div className="mt-4 border-t border-border pt-3"><ReportIssueButton itemType="event" itemId={event.id} itemLabel={event.title} /></div>
    </Modal>
  );
}

export function SSDetail({ deal, onClose }: { deal: SSDeal | null; onClose: () => void }) {
  const { usedSS, ssUsedCounts = {} } = useStore();
  const [showConfirm, setShowConfirm] = useState(false);
  if (!deal) return null;

  const count = ssUsedCounts[deal.id] || 0;
  const isNoLimit = deal.totalUses === null;
  const total = isNoLimit ? null : (deal.totalUses ?? 1);
  const isFullyUsed = isNoLimit ? false : count >= (total ?? 1);

  const handleAction = () => {
    if (isFullyUsed) {
      setShowConfirm(true);
    } else {
      actions.toggleUsed(deal.id, deal.totalUses);
    }
  };

  const confirmReset = () => {
    actions.resetUsed(deal.id);
    setShowConfirm(false);
  };

  return (
    <Modal open onClose={onClose}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${deal.type === "Free" ? "bg-gold/15 text-gold" : "bg-accent/10 text-accent"}`}>
          Starving Student Card &middot; {deal.category}
        </span>
        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold ring-1 ring-border text-foreground/80">
          {isNoLimit ? "Unlimited Uses" : total === 1 ? "1 Use Card Deal" : `${total} Total Uses`}
        </span>
      </div>

      <h3 className="mt-3 text-2xl font-semibold">{deal.item}</h3>
      <p className="mt-1 text-3xl font-semibold text-accent">{deal.value}</p>
      <p className="mt-1 text-sm font-medium">{deal.company}</p>

      {/* Prominent Punchcard Status Banner in Modal */}
      <div className="mt-4 rounded-xl bg-secondary/80 p-3.5 ring-1 ring-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">{isFullyUsed ? "???" : "??"}</span>
            <div>
              <p className="text-xs font-semibold">
                {isNoLimit
                  ? `Used ${count} ${count === 1 ? "time" : "times"} (No limit)`
                  : isFullyUsed
                  ? `Fully Redeemed (${count}/${total} used)`
                  : count > 0
                  ? `${count} of ${total} used (${total! - count} remaining)`
                  : `Not redeemed yet (0 of ${total} used)`}
              </p>
              <p className="text-[11px] text-muted-foreground">Personal reminder on this device</p>
            </div>
          </div>
          {isFullyUsed && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
              ✓ Redeemed
            </span>
          )}
        </div>
      </div>

      {deal.details && <p className="mt-3 text-sm text-muted-foreground">{deal.details}</p>}
      <p className="mt-3 text-sm font-medium">
        {deal.locations.length ? `Available at ${deal.locations.length} verified ${deal.locations.length === 1 ? "location" : "locations"}` : "Location not confirmed in the catalog"}
      </p>
      <ul className="mt-2 max-h-36 space-y-1 overflow-auto text-sm text-muted-foreground">
        {deal.locations.map((location) => <li key={location.address}>{location.address}</li>)}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">Catalog captured {deal.capturedAt}. Check current terms in the card portal.</p>

      {/* Confirmation warning before un-marking */}
      {showConfirm && (
        <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm">
          <p className="font-semibold text-destructive">Unmark this deal?</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Are you sure you want to reset this deal back to unused?
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={confirmReset}
              className="rounded-full bg-destructive px-3.5 py-1 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, reset to unused
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="rounded-full bg-secondary px-3 py-1 text-xs font-medium ring-1 ring-border hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Actions row */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button
          onClick={handleAction}
          className={`inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold transition-all ${
            isFullyUsed
              ? "bg-secondary text-foreground ring-1 ring-border hover:bg-destructive/10 hover:text-destructive"
              : "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:scale-[1.02]"
          }`}
        >
          {isFullyUsed ? (
            <>
              <span>✓ Used</span>
              <span className="text-xs text-muted-foreground">(Tap to reset)</span>
            </>
          ) : count > 0 ? (
            <>
              <span>Punch next use</span>
              {isNoLimit ? (
                <span className="text-xs opacity-90">(Used {count}x)</span>
              ) : (
                <span className="text-xs opacity-90">({count + 1}/{total})</span>
              )}
            </>
          ) : (
            <>
              <span>Mark as used</span>
              {!isNoLimit && total && total > 1 && <span className="text-xs opacity-90">(1/{total})</span>}
            </>
          )}
        </button>

        {deal.sourceUrl && (
          <a
            href={deal.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-full bg-secondary px-4 py-2 text-sm font-medium ring-1 ring-border hover:bg-glass"
          >
            Portal offer &rarr;
          </a>
        )}
        {deal.locations[0] && (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(deal.locations[0].address)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-full bg-secondary px-4 py-2 text-sm font-medium ring-1 ring-border hover:bg-glass"
          >
            Directions &rarr;
          </a>
        )}
      </div>
      <div className="mt-4 border-t border-border pt-3"><ReportIssueButton itemType="starving_student" itemId={deal.id} itemLabel={`${deal.company}: ${deal.item}`} /></div>
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
