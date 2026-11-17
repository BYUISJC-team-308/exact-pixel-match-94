import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui-bits";
import { dealInterestCategories } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import { useDealsQuery } from "@/lib/deals";
import {
  readCatalogReviews,
  saveCatalogReview,
  saveCatalogSource,
  sourceProgress,
  reviewStatuses,
  statusLabels,
  type CatalogReview as Review,
  type CatalogSource,
} from "@/lib/catalog-review";

const control = "mt-1 min-h-11 w-full rounded-lg border border-border bg-background p-3 text-base";
const button =
  "min-h-11 rounded-lg border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50";
const emptyFields = {
  source_url: "",
  company: "",
  title: "",
  merchant_url: "",
  value: "",
  category: "Tech",
  deal_type: "Percent off",
  description: "",
  eligibility: "",
  how_to_redeem: "",
  expires_on: null,
  checked_on: null,
  status: "needs_review",
  notes: "",
  deal_id: null,
} as const;

export function CatalogReview() {
  const query = useQuery({ queryKey: ["catalog_reviews"], queryFn: readCatalogReviews });
  const cache = useQueryClient();
  const [source, setSource] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(20);
  const [editing, setEditing] = useState<Review | null>(null);
  const [adding, setAdding] = useState(false);
  const [sourceEdit, setSourceEdit] = useState<CatalogSource | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const { data: deals = [] } = useDealsQuery();
  const rows = query.data?.reviews ?? [];
  const sources = query.data?.sources ?? [];
  const matches = rows.filter(
    (r) =>
      (!source || r.source === source) &&
      (!status || r.status === status) &&
      `${r.company} ${r.title} ${r.notes}`.toLowerCase().includes(search.toLowerCase()),
  );

  async function perform(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
      await Promise.all([
        cache.invalidateQueries({ queryKey: ["catalog_reviews"] }),
        cache.invalidateQueries({ queryKey: ["deals_list"] }),
      ]);
      setEditing(null);
      setSourceEdit(null);
      setAdding(false);
      setMessage(success);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The change couldn’t be saved. Try again.");
    } finally {
      setBusy(false);
    }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    void perform(async () => {
      if (adding) {
        const { id: _id, updated_at: _stamp, ...values } = editing;
        const { error } = await supabase.from("catalog_reviews").insert(values);
        if (error)
          throw new Error(
            error.code === "23505" ? "This source offer is already in the tracker." : error.message,
          );
      } else await saveCatalogReview(editing);
    }, "Review saved to the team tracker.");
  }
  function update(field: keyof Review, value: string) {
    setEditing((old) =>
      old
        ? {
            ...old,
            [field]: value || (["checked_on", "expires_on", "deal_id"].includes(field) ? null : ""),
          }
        : old,
    );
  }
  const detailOpen = Boolean(editing || sourceEdit);
  return (
    <section aria-labelledby="catalog-review-heading" className="min-w-0 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="catalog-review-heading" className="text-2xl font-semibold">
            Catalog review
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Track public U.S. student offers, confirm merchant terms, and publish approved listings.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className={button}
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            Refresh tracker
          </button>
          <button
            className={button}
            disabled={!sources.length}
            onClick={() => {
              setError("");
              setAdding(true);
              setEditing({
                ...emptyFields,
                id: "",
                updated_at: "",
                source: source || sources[0].name,
              });
            }}
          >
            Add source offer
          </button>
        </div>
      </div>
      {message && (
        <p role="status" className="rounded-lg bg-primary/10 p-3">
          {message}
        </p>
      )}
      {error && !detailOpen && (
        <p role="alert" className="rounded-lg border border-destructive p-3">
          {error}
        </p>
      )}
      {query.isPending ? (
        <p role="status">Loading catalog reviews…</p>
      ) : query.isError ? (
        <div role="alert" className="rounded-xl border border-destructive p-4">
          <p>{query.error.message}</p>
          <button className={`${button} mt-3`} onClick={() => void query.refetch()}>
            Try again
          </button>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {sources.map((s) => {
              const progress = sourceProgress(s, rows);
              return (
                <article
                  key={s.name}
                  className="min-w-0 rounded-xl border border-border bg-card p-4"
                >
                  <h3 className="font-semibold">{s.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Pass dated {s.pass_date}</p>
                  <p className="mt-1 text-sm">
                    {progress.total} tracked · {progress.remaining} unresolved
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {progress.complete
                      ? "Dated pass complete"
                      : s.exhausted
                        ? "Pages checked; reviews remain"
                        : "Catalog coverage incomplete"}
                  </p>
                  <p className="mt-2 break-words text-sm text-muted-foreground">{s.resume_at}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <a
                      href={s.catalog_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-11 items-center font-medium underline"
                    >
                      Open catalog ↗
                    </a>
                    <button
                      className={button}
                      onClick={() => {
                        setError("");
                        setSourceEdit(s);
                      }}
                    >
                      Update progress
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm font-medium">
              Search offers
              <input
                type="search"
                className={control}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setLimit(20);
                }}
              />
            </label>
            <label className="text-sm font-medium">
              Source
              <select
                className={control}
                value={source}
                onChange={(e) => {
                  setSource(e.target.value);
                  setLimit(20);
                }}
              >
                <option value="">All sources</option>
                {sources.map((s) => (
                  <option key={s.name}>{s.name}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              Review status
              <select
                className={control}
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setLimit(20);
                }}
              >
                <option value="">All statuses</option>
                {reviewStatuses.map((s) => (
                  <option key={s} value={s}>
                    {statusLabels[s]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p role="status" className="text-sm">
            {matches.length} matching reviews · {rows.length} total tracked
          </p>
          {!matches.length && <p>No reviews match these filters.</p>}
          <div className="space-y-3">
            {matches.slice(0, limit).map((row) => (
              <article key={row.id} className="min-w-0 rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="text-sm font-medium">
                    {row.source} · {statusLabels[row.status]}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Checked {row.checked_on || "date not recorded"}
                  </span>
                </div>
                <h3 className="mt-2 break-words text-lg font-semibold">
                  {row.company} — {row.title}
                </h3>
                <p className="mt-1 break-words text-sm">{row.value}</p>
                {row.notes && (
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                    {row.notes}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <a
                    href={row.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center underline"
                  >
                    Source ↗
                  </a>
                  {row.merchant_url && (
                    <a
                      href={row.merchant_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-11 items-center underline"
                    >
                      Merchant terms ↗
                    </a>
                  )}
                  <button
                    className={button}
                    onClick={() => {
                      setError("");
                      setAdding(false);
                      setEditing({ ...row });
                    }}
                  >
                    Review {row.company}
                  </button>
                </div>
              </article>
            ))}
          </div>
          {matches.length > limit && (
            <button className={button} onClick={() => setLimit((l) => l + 20)}>
              Show 20 more reviews
            </button>
          )}
        </>
      )}
      <Modal
        open={detailOpen}
        onClose={() => {
          if (!busy) {
            setEditing(null);
            setSourceEdit(null);
          }
        }}
      >
        {editing && (
          <form onSubmit={submit} className="min-w-0 space-y-3">
            <h3 className="text-xl font-semibold">
              {adding ? "Add source offer" : `Review ${editing.company}`}
            </h3>
            {error && (
              <p role="alert" className="rounded-lg border border-destructive p-3">
                {error}
              </p>
            )}
            <fieldset disabled={busy} className="min-w-0 space-y-3">
              <label className="block text-sm font-medium">
                Source
                <select
                  className={control}
                  value={editing.source}
                  onChange={(e) => update("source", e.target.value)}
                >
                  {sources.map((s) => (
                    <option key={s.name}>{s.name}</option>
                  ))}
                </select>
              </label>
              {(
                [
                  ["company", "Merchant"],
                  ["title", "Offer title"],
                  ["source_url", "Source offer URL"],
                  ["merchant_url", "Merchant terms URL"],
                  ["value", "Discount or price"],
                ] as const
              ).map(([field, label]) => (
                <label key={field} className="block text-sm font-medium">
                  {label}
                  <input
                    className={control}
                    type={field.endsWith("url") ? "url" : "text"}
                    required={["company", "title", "source_url"].includes(field)}
                    value={editing[field]}
                    maxLength={field === "company" ? 160 : field === "title" ? 300 : 2000}
                    onChange={(e) => update(field, e.target.value)}
                  />
                </label>
              ))}
              <label className="block text-sm font-medium">
                Category
                <select
                  className={control}
                  value={editing.category}
                  onChange={(e) => update("category", e.target.value)}
                >
                  {[...dealInterestCategories, "Print"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium">
                Deal type
                <select
                  className={control}
                  value={editing.deal_type}
                  onChange={(e) => update("deal_type", e.target.value)}
                >
                  {["Percent off", "Free", "Fixed price"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              {(
                [
                  ["description", "Offer summary"],
                  ["eligibility", "Who qualifies and purchase requirements"],
                  ["how_to_redeem", "How to claim"],
                  ["notes", "Review notes or exclusion reason"],
                ] as const
              ).map(([field, label]) => (
                <label key={field} className="block text-sm font-medium">
                  {label}
                  <textarea
                    rows={3}
                    className={control}
                    maxLength={5000}
                    value={editing[field]}
                    onChange={(e) => update(field, e.target.value)}
                  />
                </label>
              ))}
              <label className="block text-sm font-medium">
                Last checked
                <input
                  type="date"
                  className={control}
                  value={editing.checked_on || ""}
                  onChange={(e) => update("checked_on", e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium">
                Offer expiration, if stated
                <input
                  type="date"
                  className={control}
                  value={editing.expires_on || ""}
                  onChange={(e) => update("expires_on", e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium">
                Existing dashboard listing
                <select
                  className={control}
                  value={editing.deal_id || ""}
                  onChange={(e) => update("deal_id", e.target.value)}
                >
                  <option value="">No linked listing</option>
                  {deals.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.company} — {d.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium">
                Decision
                <select
                  className={control}
                  value={editing.status}
                  onChange={(e) => update("status", e.target.value)}
                >
                  {reviewStatuses.map((s) => (
                    <option
                      key={s}
                      value={s}
                      disabled={s === "published" && editing.status !== "published"}
                    >
                      {statusLabels[s]}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-sm text-muted-foreground">
                Save “Ready to publish” after checking the merchant terms. Publishing adds or
                updates the linked dashboard listing.
              </p>
              <div className="flex flex-wrap gap-3">
                <button type="submit" className={`${button} bg-primary text-primary-foreground`}>
                  {busy ? "Saving…" : "Save review"}
                </button>
                {!adding && editing.status === "ready" && (
                  <button
                    type="button"
                    className={button}
                    onClick={() => {
                      const original = rows.find((r) => r.id === editing.id);
                      if (JSON.stringify(original) !== JSON.stringify(editing)) {
                        setError("Save your edits before publishing.");
                        return;
                      }
                      void perform(async () => {
                        const { error } = await supabase.rpc("publish_catalog_offer", {
                          p_id: editing.id,
                          p_expected_updated_at: editing.updated_at,
                        });
                        if (error) throw new Error(error.message);
                      }, "Offer published to the Discount Dashboard.");
                    }}
                  >
                    Publish offer
                  </button>
                )}
              </div>
            </fieldset>
          </form>
        )}
        {sourceEdit && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void perform(() => saveCatalogSource(sourceEdit), "Source progress saved.");
            }}
          >
            <h3 className="text-xl font-semibold">{sourceEdit.name} progress</h3>
            {error && <p role="alert">{error}</p>}
            <fieldset disabled={busy} className="space-y-3">
              <label className="block text-sm font-medium">
                Review pass date
                <input
                  type="date"
                  required
                  className={control}
                  value={sourceEdit.pass_date}
                  onChange={(e) => setSourceEdit({ ...sourceEdit, pass_date: e.target.value })}
                />
              </label>
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={sourceEdit.exhausted}
                  onChange={(e) => setSourceEdit({ ...sourceEdit, exhausted: e.target.checked })}
                />
                Every source offer is recorded for this pass
              </label>
              <label className="block text-sm font-medium">
                Where to resume
                <textarea
                  className={control}
                  value={sourceEdit.resume_at}
                  onChange={(e) => setSourceEdit({ ...sourceEdit, resume_at: e.target.value })}
                />
              </label>
              <label className="block text-sm font-medium">
                Coverage notes
                <textarea
                  className={control}
                  value={sourceEdit.notes}
                  onChange={(e) => setSourceEdit({ ...sourceEdit, notes: e.target.value })}
                />
              </label>
              <p className="text-sm">
                A pass is complete when every source offer is recorded and all tracked offers have a
                final decision.
              </p>
              <button className={`${button} bg-primary text-primary-foreground`} type="submit">
                {busy ? "Saving…" : "Save progress"}
              </button>
            </fieldset>
          </form>
        )}
      </Modal>
    </section>
  );
}
