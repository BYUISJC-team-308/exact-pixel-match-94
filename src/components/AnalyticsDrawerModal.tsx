import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Modal, Btn } from "@/components/ui-bits";
import { useStore } from "@/lib/store";
import {
  signupPeriod,
  useTeamOkrSnapshot,
  type OkrRate,
  type TeamOkrSnapshot,
} from "@/lib/team-okr";

const utcDate = (date: Date) => date.toISOString().slice(0, 10);
const timestamp = (value: string) =>
  new Date(value).toLocaleString(undefined, { timeZone: "UTC" }) + " UTC";

function RateCard({
  title,
  metric,
  complete,
  explanation,
}: {
  title: string;
  metric: OkrRate;
  complete: boolean;
  explanation: string;
}) {
  const status = !complete
    ? "Tracking incomplete"
    : metric.percent === null
      ? "Not enough data"
      : metric.percent >= metric.target
        ? "Target reached"
        : "Below target";
  return (
    <section className="rounded-xl border border-border bg-secondary/60 p-4">
      <h4 className="text-sm font-semibold">{title}</h4>
      <p className="mt-2 text-3xl font-bold text-primary">
        {metric.percent === null ? "—" : metric.percent + "%"}
      </p>
      <p className="mt-1 text-sm">
        {metric.numerator} / {metric.denominator} users · Target {metric.target}%
      </p>
      <p className="mt-1 text-xs font-semibold text-muted-foreground">{status}</p>
      {metric.percent !== null && (
        <div
          role="progressbar"
          aria-label={title}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={metric.percent}
          className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full bg-primary"
            style={{ width: Math.min(100, metric.percent) + "%" }}
          />
        </div>
      )}
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{explanation}</p>
    </section>
  );
}

function exportSummary(metrics: TeamOkrSnapshot) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(metrics, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "studeats-okr-summary.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function OkrSummary({ metrics }: { metrics: TeamOkrSnapshot }) {
  const q = metrics.quality;
  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold">
        Signup cohort: {metrics.signupFrom.slice(0, 10)} through{" "}
        {new Date(new Date(metrics.signupTo).getTime() - 1).toISOString().slice(0, 10)} (UTC)
      </p>
      <p className="text-xs text-muted-foreground">
        Calculated {timestamp(metrics.observedAt)}. {metrics.totalUsers} registered accounts in this
        signup cohort. Team accounts are excluded by default.
      </p>
      {metrics.totalUsers === 0 && (
        <p role="status" className="rounded-xl bg-muted p-3 text-sm">
          No registered users in this signup period. Choose another period; empty data is not a 0%
          result.
        </p>
      )}
      {!q.complete && (
        <div role="status" className="rounded-xl border border-gold/40 bg-gold/10 p-3 text-sm">
          <strong>Tracking incomplete — results are not ready to certify.</strong>
          <p className="mt-1 text-xs">
            Missing signup sessions: {q.missingSignupSessions}. Actions without a success/failure
            marker: {q.missingOutcomes}. Successful actions without a session:{" "}
            {q.missingActionSessions}.
          </p>
          <p className="mt-1 text-xs">
            P06 must supply these fields. Counts below show confirmed recorded behavior only;
            percentages stay blank until this cohort passes the checks.
          </p>
        </div>
      )}
      <section className="rounded-xl border border-border bg-secondary/60 p-4">
        <h4 className="text-sm font-semibold">KR 1.1 · Time to first saved deal</h4>
        <p className="mt-2 text-3xl font-bold text-primary">
          {metrics.firstSave.meanMinutes === null ? "—" : metrics.firstSave.meanMinutes + " min"}
        </p>
        <p className="mt-1 text-sm">
          Mean · {metrics.firstSave.sampleSize} users with a confirmed save
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Median:{" "}
          {metrics.firstSave.medianMinutes === null
            ? "—"
            : metrics.firstSave.medianMinutes + " min"}
          . Users without a save: {metrics.noSaveUsers ?? "unknown until tracking is complete"}.
        </p>
        <p className="mt-2 text-xs font-semibold">
          {metrics.firstSave.targetMinutes === null
            ? "Timing target awaiting Product Owner agreement."
            : "Target: " + metrics.firstSave.targetMinutes + " minutes."}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          First successful recorded deal save minus account creation in Supabase Auth. Users who
          never save are not treated as zero-minute saves. A later unsave does not undo activation.
        </p>
      </section>
      <RateCard
        title="KR 1.2 · Users who save a deal"
        metric={metrics.save}
        complete={q.complete}
        explanation="Distinct cohort users with at least one successful recorded deal save, divided by all registered cohort users, including those with no activity."
      />
      <RateCard
        title="KR 2.1 · Return and report a use"
        metric={metrics.reportedUse}
        complete={q.complete}
        explanation="Distinct cohort users who mark a deal used in a different, later recorded session by the calculation time, divided by all cohort users. This measures reported use, not verified merchant redemption."
      />
      <RateCard
        title="KR 2.2 · Return and save within seven days"
        metric={metrics.sevenDaySave}
        complete={q.complete}
        explanation="Users who save in a later recorded session before signup + 168 hours, divided only by users whose full 168-hour observation period has finished. A return_visit event alone does not qualify."
      />
      <p className="text-xs text-muted-foreground">
        {metrics.pendingUsers} {metrics.pendingUsers === 1 ? "user is" : "users are"} still waiting
        for the full seven-day window; {metrics.matureUsers}{" "}
        {metrics.matureUsers === 1 ? "is" : "are"} eligible for KR 2.2.
      </p>
      <details className="rounded-xl border border-border p-3 text-xs">
        <summary className="min-h-11 cursor-pointer font-semibold">
          Data checks and counting rules
        </summary>
        <ul className="list-disc space-y-2 pl-4">
          <li>{q.loggedEvents} deduplicated, signed-in, non-test events in this cohort.</li>
          <li>
            {q.excludedDuplicates} retry duplicates and {q.excludedSimulations} simulated/test
            events excluded.
          </li>
          <li>Last qualifying record: {q.lastEventAt ? timestamp(q.lastEventAt) : "none"}.</li>
          <li>
            Sessions must have explicit IDs and a later session_start. Devices and usernames are
            never counted as separate registered users.
          </li>
          <li>
            All date boundaries use UTC. Seven days means 168 elapsed hours, not seven calendar
            labels.
          </li>
          <li>
            No local backup merge, fabricated demo activity, or 500-row browser limit is used.
          </li>
        </ul>
      </details>
      <Btn variant="soft" onClick={() => exportSummary(metrics)}>
        Download aggregate summary
      </Btn>
    </div>
  );
}

export function AnalyticsDrawerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useStore();
  const today = utcDate(new Date());
  const [from, setFrom] = useState(() => utcDate(new Date(Date.now() - 29 * 86400000)));
  const [through, setThrough] = useState(today);
  const [applied, setApplied] = useState({ from, through });
  const [formError, setFormError] = useState("");
  const query = useTeamOkrSnapshot(
    applied.from,
    applied.through,
    user?.email || user?.username || null,
    open,
  );
  return (
    <Modal open={open} onClose={onClose} title="Team OKR dashboard">
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-primary">TEAM ANALYTICS</p>
          <h3 className="mt-1 text-xl font-bold">Are students finding value?</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Four OKRs measured from registered-user behavior stored in Supabase.
          </p>
        </div>
        {!user ? (
          <div className="rounded-xl bg-muted p-4">
            <p className="text-sm">Sign in with an approved team account to view these metrics.</p>
            <Link
              to="/signin"
              onClick={onClose}
              className="mt-3 inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-sm text-primary-foreground"
            >
              Sign in
            </Link>
          </div>
        ) : (
          <>
            <form
              className="space-y-3 rounded-xl bg-muted/60 p-3"
              onSubmit={(event) => {
                event.preventDefault();
                try {
                  signupPeriod(from, through);
                  setFormError("");
                  setApplied({ from, through });
                } catch (error) {
                  setFormError(error instanceof Error ? error.message : "Choose valid dates.");
                }
              }}
            >
              <p className="text-xs font-semibold">Accounts created during this period (UTC)</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-medium">
                  From
                  <input
                    required
                    type="date"
                    max={today}
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="mt-1 block min-h-11 w-full rounded-lg border border-border bg-background px-2"
                  />
                </label>
                <label className="text-xs font-medium">
                  Through
                  <input
                    required
                    type="date"
                    max={today}
                    value={through}
                    onChange={(e) => setThrough(e.target.value)}
                    className="mt-1 block min-h-11 w-full rounded-lg border border-border bg-background px-2"
                  />
                </label>
              </div>
              {formError && (
                <p role="alert" className="text-sm text-destructive">
                  {formError}
                </p>
              )}
              <Btn type="submit" variant="soft">
                Apply signup period
              </Btn>
            </form>
            {query.isPending && (
              <p role="status" className="py-4 text-sm">
                Loading stored team metrics…
              </p>
            )}
            {query.isError ? (
              <div role="alert" className="rounded-xl border border-destructive/30 p-3">
                <p className="text-sm">{query.error.message}</p>
                <Btn variant="soft" className="mt-3" onClick={() => void query.refetch()}>
                  Try again
                </Btn>
              </div>
            ) : (
              query.data && <OkrSummary metrics={query.data} />
            )}
            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              <Btn variant="soft" disabled={query.isFetching} onClick={() => void query.refetch()}>
                {query.isFetching ? "Refreshing…" : "Refresh metrics"}
              </Btn>
              <Btn onClick={onClose}>Close</Btn>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
