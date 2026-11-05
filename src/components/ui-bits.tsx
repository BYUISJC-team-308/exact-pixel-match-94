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
      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{deal.category} · {deal.type}</span>
      <h3 className="mt-3 text-2xl font-semibold">{deal.title}</h3>
      <p className="mt-1 text-3xl font-semibold text-accent">{deal.value}</p>
      <p className="mt-3 text-sm text-muted-foreground">{deal.description}</p>
      <dl className="mt-4 space-y-2 text-sm">
        <div><dt className="font-semibold">Company</dt><dd className="text-muted-foreground">{deal.company}</dd></div>
        <div><dt className="font-semibold">Duration</dt><dd className="text-muted-foreground">{deal.duration}</dd></div>
        <div><dt className="font-semibold">How to get it</dt><dd className="text-muted-foreground">{deal.howTo}</dd></div>
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
  const { usedSS } = useStore();
  if (!deal) return null;
  const used = usedSS.includes(deal.id);
  return (
    <Modal open onClose={onClose}>
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${deal.type === "Free" ? "bg-gold/15 text-gold" : "bg-accent/10 text-accent"}`}>Starving Student Card · {deal.category}</span>
      <h3 className="mt-3 text-2xl font-semibold">{deal.item}</h3>
      <p className="mt-1 text-3xl font-semibold text-accent">{deal.value}</p>
      <p className="mt-1 text-sm font-medium">{deal.company}</p>
      {deal.details && <p className="mt-3 text-sm text-muted-foreground">{deal.details}</p>}
      <p className="mt-3 text-sm font-medium">{deal.locations.length ? `Available at ${deal.locations.length} verified ${deal.locations.length === 1 ? "location" : "locations"}` : "Location not confirmed in the catalog"}</p>
      <ul className="mt-2 max-h-40 space-y-1 overflow-auto text-sm text-muted-foreground">
        {deal.locations.map((location) => <li key={location.address}>{location.address}</li>)}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">Catalog captured {deal.capturedAt}. Check current terms in the card portal.</p>
      <div className="mt-6 flex flex-wrap gap-2">
        {deal.sourceUrl && <a href={deal.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">View offer in card portal →</a>}
        {deal.locations[0] && <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(deal.locations[0].address)}`} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-full bg-secondary px-4 py-2 text-sm font-medium ring-1 ring-border">Directions to first location →</a>}
        <Btn variant="soft" onClick={() => actions.toggleUsed(deal.id)}>{used ? "✓ Used — undo" : "Mark as used"}</Btn>
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
