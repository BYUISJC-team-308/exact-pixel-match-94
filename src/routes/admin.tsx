import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  PageHeader,
  Modal,
  Btn,
} from "@/components/ui-bits";
import { calculateVerificationScore } from "@/lib/deal-verification";
import { useStore } from "@/lib/store";
import {
  useDataIssueReportsQuery,
  useUpdateReportStatusMutation,
  type DataIssueReport,
  type ReportStatus,
} from "@/lib/data-issues";
import { useDealsQuery } from "@/lib/deals";
import { useFoodEventsQuery } from "@/lib/food-events";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  RefreshCw,
  Search,
  ShieldAlert,
  Tag,
  Utensils,
  CreditCard,
  Check,
  X,
  ArrowRight,
  Database,
  Eye,
  Info,
} from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({
    meta: [
      { title: "Admin Reports & Moderation — Studeats" },
      {
        name: "description",
        content: "View and manage student data issue reports and moderate community deals.",
      },
    ],
  }),
});

function formatTimestamp(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return isoString;
  }
}

function timeAgo(isoString: string): string {
  try {
    const ms = Date.now() - new Date(isoString).getTime();
    const sec = Math.floor(ms / 1000);
    if (sec < 60) return "just now";
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const day = Math.floor(hr / 24);
    return `${day}d ago`;
  } catch {
    return "";
  }
}

function StatusBadge({ status }: { status: ReportStatus }) {
  switch (status) {
    case "open":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
          <Clock className="size-3" /> Open
        </span>
      );
    case "reviewing":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2.5 py-0.5 text-xs font-semibold text-sky-600 dark:text-sky-400">
          <Eye className="size-3" /> Reviewing
        </span>
      );
    case "resolved":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-3" /> Resolved
        </span>
      );
    case "dismissed":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
          <X className="size-3" /> Dismissed
        </span>
      );
  }
}

function TypeBadge({ type }: { type: DataIssueReport["itemType"] }) {
  switch (type) {
    case "deal":
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
          <Tag className="size-3" /> Deal
        </span>
      );
    case "event":
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/10 px-2 py-0.5 text-xs font-medium text-purple-700 dark:text-purple-300">
          <Utensils className="size-3" /> Free Food
        </span>
      );
    case "starving_student":
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
          <CreditCard className="size-3" /> Starving Student
        </span>
      );
  }
}

export function AdminPage() {
  const { user, authReady } = useStore();
  const [activeTab, setActiveTab] = useState<"reports" | "disputed" | "health">("reports");
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<DataIssueReport["itemType"] | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Report resolution modal state
  const [resolvingReport, setResolvingReport] = useState<DataIssueReport | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [resolveAction, setResolveAction] = useState<"resolved" | "dismissed">("resolved");

  // React Queries
  const {
    data: reports = [],
    isLoading: loadingReports,
    isRefetching: refetchingReports,
    refetch: refetchReports,
    error: reportsError,
  } = useDataIssueReportsQuery();

  const { data: deals = [] } = useDealsQuery();
  const { data: foodEvents = [] } = useFoodEventsQuery();
  const updateStatusMutation = useUpdateReportStatusMutation();

  // Metrics counts
  const openCount = reports.filter((r) => r.status === "open").length;
  const reviewingCount = reports.filter((r) => r.status === "reviewing").length;
  const resolvedCount = reports.filter((r) => r.status === "resolved").length;
  const dismissedCount = reports.filter((r) => r.status === "dismissed").length;

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (typeFilter !== "all" && r.itemType !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchLabel = r.itemLabel.toLowerCase().includes(q);
        const matchIssue = r.issueType.toLowerCase().includes(q);
        const matchDetails = (r.details || "").toLowerCase().includes(q);
        const matchNotes = (r.resolutionNotes || "").toLowerCase().includes(q);
        if (!matchLabel && !matchIssue && !matchDetails && !matchNotes) return false;
      }
      return true;
    });
  }, [reports, statusFilter, typeFilter, searchQuery]);

  // Flagged / Disputed community listings
  const disputedDeals = useMemo(() => {
    return deals.filter(
      (d) => d.verificationStatus === "community" && d.fakeVotesCount > 0
    );
  }, [deals]);

  const disputedEvents = useMemo(() => {
    return foodEvents.filter((e) => (e.fakeVotesCount ?? 0) > 0);
  }, [foodEvents]);

  const totalDisputed = disputedDeals.length + disputedEvents.length;

  const handleStatusChange = async (
    report: DataIssueReport,
    newStatus: ReportStatus,
    notes?: string
  ) => {
    try {
      await updateStatusMutation.mutateAsync({
        id: report.id,
        status: newStatus,
        resolutionNotes: notes,
      });
    } catch (err) {
      console.error("Failed to update report status:", err);
    }
  };

  const handleOpenResolveModal = (report: DataIssueReport, action: "resolved" | "dismissed") => {
    setResolvingReport(report);
    setResolveAction(action);
    setResolutionNotes(report.resolutionNotes || "");
  };

  const handleConfirmResolution = async () => {
    if (!resolvingReport) return;
    try {
      await updateStatusMutation.mutateAsync({
        id: resolvingReport.id,
        status: resolveAction,
        resolutionNotes: resolutionNotes.trim() || undefined,
      });
      setResolvingReport(null);
      setResolutionNotes("");
    } catch (err) {
      console.error("Failed to resolve report:", err);
    }
  };

  return (
    <div className="mx-auto max-w-6xl pb-16">
      <PageHeader
        eyebrow="STUDEATS MODERATION & ADMIN"
        title="Admin Reports"
      >
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void refetchReports()}
            disabled={refetchingReports || loadingReports}
            className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3.5 py-2 text-xs font-semibold ring-1 ring-border hover:bg-glass transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${refetchingReports ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link
            to="/profile"
            className="inline-flex items-center rounded-full bg-secondary px-4 py-2 text-xs font-semibold ring-1 ring-border hover:bg-glass"
          >
            ← My Profile
          </Link>
          <Link
            to="/"
            className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            View Site
          </Link>
        </div>
      </PageHeader>

      {/* Admin Info Banner */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-4 shadow-sm sm:flex sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
            <ShieldAlert className="size-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">
              Administrator Reports Console
            </h2>
            <p className="text-xs text-muted-foreground">
              {user ? (
                <>
                  Signed in as <span className="font-semibold text-foreground">@{user.username}</span> ({user.email || user.name})
                </>
              ) : (
                "Signed out preview mode. Sign in to your administrator account to save resolution notes."
              )}
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 sm:mt-0">
          {!user && (
            <Link
              to="/signin"
              className="inline-flex items-center rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>

      {/* Key Metric Stat Cards */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Open Reports</span>
            <Clock className="size-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">
            {openCount}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Needs review</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">In Review</span>
            <Eye className="size-4 text-sky-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-sky-600 dark:text-sky-400">
            {reviewingCount}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Being checked</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Resolved</span>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {resolvedCount}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Completed issues</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Disputed Posts</span>
            <AlertTriangle className="size-4 text-rose-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-rose-600 dark:text-rose-400">
            {totalDisputed}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Community fake votes</p>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="mb-6 flex border-b border-border/80">
        <button
          type="button"
          onClick={() => setActiveTab("reports")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
            activeTab === "reports"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <ShieldAlert className="size-4" />
          Submitted Reports
          <span className="rounded-full bg-primary/10 px-2 py-0.2 text-xs font-bold text-primary">
            {reports.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("disputed")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
            activeTab === "disputed"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <AlertTriangle className="size-4" />
          Disputed Community Posts
          {totalDisputed > 0 && (
            <span className="rounded-full bg-rose-500/15 px-2 py-0.2 text-xs font-bold text-rose-600 dark:text-rose-400">
              {totalDisputed}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("health")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
            activeTab === "health"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Database className="size-4" />
          Database & RLS Status
        </button>
      </div>

      {/* TAB 1: SUBMITTED REPORTS */}
      {activeTab === "reports" && (
        <section aria-label="Submitted data issue reports">
          {/* Controls & Search */}
          <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <div className="relative min-w-[200px] flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by title, issue, or note…"
                  className="w-full rounded-full border border-border bg-background py-1.5 pl-9 pr-4 text-xs font-medium outline-none focus:border-primary"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ReportStatus | "all")}
                className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold outline-none focus:border-primary"
              >
                <option value="all">All Statuses ({reports.length})</option>
                <option value="open">Open ({openCount})</option>
                <option value="reviewing">Reviewing ({reviewingCount})</option>
                <option value="resolved">Resolved ({resolvedCount})</option>
                <option value="dismissed">Dismissed ({dismissedCount})</option>
              </select>

              {/* Type Filter */}
              <select
                value={typeFilter}
                onChange={(e) =>
                  setTypeFilter(e.target.value as DataIssueReport["itemType"] | "all")
                }
                className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold outline-none focus:border-primary"
              >
                <option value="all">All Types</option>
                <option value="deal">🏷️ Deals</option>
                <option value="event">🍕 Free Food</option>
                <option value="starving_student">💳 Starving Student</option>
              </select>
            </div>

            {filteredReports.length !== reports.length && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("all");
                  setTypeFilter("all");
                  setSearchQuery("");
                }}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Reset filters
              </button>
            )}
          </div>

          {/* Loading / Error States */}
          {loadingReports ? (
            <div className="rounded-2xl border border-border bg-card p-12 text-center">
              <RefreshCw className="mx-auto size-6 animate-spin text-primary" />
              <p className="mt-3 text-sm font-medium text-foreground">Loading reports from Supabase…</p>
            </div>
          ) : reportsError ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
              <ShieldAlert className="mx-auto size-8 text-destructive" />
              <h3 className="mt-2 text-base font-bold text-foreground">Could not load reports</h3>
              <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
                {reportsError instanceof Error ? reportsError.message : "Error connecting to Supabase table 'data_issue_reports'."}
              </p>
              <p className="mt-2 text-xs font-mono bg-muted p-2 rounded-lg max-w-lg mx-auto text-left">
                Check Supabase SQL Editor: ensure migration 20261113000200_admin_reports_access.sql has been applied.
              </p>
              <button
                type="button"
                onClick={() => void refetchReports()}
                className="mt-4 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
              >
                Retry Query
              </button>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/80 bg-card p-12 text-center">
              <CheckCircle2 className="mx-auto size-8 text-emerald-500" />
              <h3 className="mt-2 text-base font-bold text-foreground">No reports match criteria</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {reports.length === 0
                  ? "No student data issue reports have been submitted yet, or all issues are cleared."
                  : "Try clearing search filters to see all reports."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReports.map((report) => {
                const targetLink =
                  report.itemType === "deal"
                    ? "/discounts"
                    : report.itemType === "event"
                      ? "/free-food"
                      : "/starving-student";

                return (
                  <article
                    key={report.id}
                    className="overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-border/90"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <TypeBadge type={report.itemType} />
                          <StatusBadge status={report.status} />
                          <span className="text-[11px] text-muted-foreground">
                            {formatTimestamp(report.createdAt)} ({timeAgo(report.createdAt)})
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-foreground truncate">
                          {report.itemLabel}
                        </h3>

                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 text-xs font-semibold text-foreground ring-1 ring-border">
                            ⚠️ {report.issueType}
                          </span>
                          <span className="text-[11px] font-mono text-muted-foreground">
                            ID: {report.itemId}
                          </span>
                        </div>

                        {/* Details provided by user */}
                        {report.details ? (
                          <div className="mt-2 rounded-xl bg-muted/60 p-3 text-xs text-foreground leading-relaxed">
                            <span className="font-semibold text-muted-foreground block text-[11px] mb-0.5">
                              Student Notes:
                            </span>
                            "{report.details}"
                          </div>
                        ) : (
                          <p className="text-xs italic text-muted-foreground">
                            No additional notes provided.
                          </p>
                        )}

                        {/* Resolution Notes (if resolved) */}
                        {report.resolutionNotes && (
                          <div className="mt-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs text-emerald-800 dark:text-emerald-300">
                            <span className="font-bold block text-[11px]">
                              Admin Resolution Notes:
                            </span>
                            {report.resolutionNotes}
                          </div>
                        )}
                      </div>

                      {/* Admin Actions */}
                      <div className="flex flex-wrap items-center gap-1.5 sm:flex-col sm:items-end">
                        <Link
                          to={targetLink}
                          className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold ring-1 ring-border hover:bg-glass"
                        >
                          View Listing <ArrowRight className="size-3" />
                        </Link>

                        {report.status === "open" && (
                          <>
                            <button
                              type="button"
                              onClick={() => void handleStatusChange(report, "reviewing")}
                              className="rounded-full bg-sky-500/15 px-3 py-1.5 text-xs font-semibold text-sky-700 dark:text-sky-300 hover:bg-sky-500/25"
                            >
                              Start Review
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenResolveModal(report, "resolved")}
                              className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                            >
                              ✓ Resolve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenResolveModal(report, "dismissed")}
                              className="rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
                            >
                              Dismiss
                            </button>
                          </>
                        )}

                        {report.status === "reviewing" && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenResolveModal(report, "resolved")}
                              className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                            >
                              ✓ Resolve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenResolveModal(report, "dismissed")}
                              className="rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
                            >
                              Dismiss
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleStatusChange(report, "open")}
                              className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
                            >
                              Reopen
                            </button>
                          </>
                        )}

                        {(report.status === "resolved" || report.status === "dismissed") && (
                          <button
                            type="button"
                            onClick={() => void handleStatusChange(report, "open")}
                            className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold ring-1 ring-border hover:bg-glass"
                          >
                            Reopen Report
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB 2: DISPUTED COMMUNITY LISTINGS */}
      {activeTab === "disputed" && (
        <section aria-label="Community items flagged by student votes">
          <div className="mb-6 rounded-2xl border border-border bg-card p-5">
            <h3 className="text-base font-bold text-foreground">
              Community Items with Low Trust or Fake Votes
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              These listings were contributed by users and have received "Fake / Expired" or "Food ran out" votes from other students.
            </p>
          </div>

          <div className="space-y-6">
            {/* Disputed Deals */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Tag className="size-4 text-emerald-500" />
                  Flagged Discounts ({disputedDeals.length})
                </h4>
                <Link
                  to="/discounts"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Go to Discounts Dashboard →
                </Link>
              </div>

              {disputedDeals.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/80 bg-card p-6 text-center text-xs text-muted-foreground">
                  No discounts currently have fake or expired votes.
                </div>
              ) : (
                <div className="space-y-3">
                  {disputedDeals.map((deal) => {
                    const score = calculateVerificationScore(
                      deal.realVotesCount,
                      deal.fakeVotesCount
                    );
                    return (
                      <div
                        key={deal.id}
                        className="flex flex-col gap-3 rounded-xl border border-rose-500/20 bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-foreground text-sm">
                              {deal.company}
                            </span>
                            <span className="rounded bg-accent/15 px-2 py-0.5 text-xs font-bold text-accent">
                              {deal.value}
                            </span>
                            <span className="rounded-full bg-rose-500/15 px-2.5 py-0.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
                              ⚠️ {deal.fakeVotesCount} Fake / Expired
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{deal.title}</p>
                          <p className="mt-0.5 text-[11px] font-mono text-muted-foreground">
                            ID: {deal.id} · Submitted by {deal.submitterUsername ? `@${deal.submitterUsername}` : "Community member"}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold ring-1 ring-border">
                            ▲ {deal.upvotesCount}
                          </span>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${score.badgeColor}`}>
                            {score.percentage}% Real ({score.total} votes)
                          </span>
                          <Link
                            to="/discounts"
                            className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/20"
                          >
                            Inspect →
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Disputed Free Food */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Utensils className="size-4 text-purple-500" />
                  Flagged Food Events ({disputedEvents.length})
                </h4>
                <Link
                  to="/free-food"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Go to Free Food Page →
                </Link>
              </div>

              {disputedEvents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/80 bg-card p-6 text-center text-xs text-muted-foreground">
                  No free food events currently have "Ran out" votes.
                </div>
              ) : (
                <div className="space-y-3">
                  {disputedEvents.map((event) => {
                    const score = calculateVerificationScore(
                      event.realVotesCount ?? 0,
                      event.fakeVotesCount ?? 0
                    );
                    return (
                      <div
                        key={event.id}
                        className="flex flex-col gap-3 rounded-xl border border-rose-500/20 bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-foreground text-sm">
                              {event.title}
                            </span>
                            <span className="rounded bg-accent/15 px-2 py-0.5 text-xs font-bold text-accent">
                              {event.food}
                            </span>
                            <span className="rounded-full bg-rose-500/15 px-2.5 py-0.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
                              ❌ {event.fakeVotesCount} Ran out
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {event.building} · Hosted by {event.host}
                          </p>
                          <p className="mt-0.5 text-[11px] font-mono text-muted-foreground">
                            ID: {event.id}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold ring-1 ring-border">
                            ▲ {event.upvotesCount ?? 0}
                          </span>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${score.badgeColor}`}>
                            {score.percentage}% Active ({score.total} votes)
                          </span>
                          <Link
                            to="/free-food"
                            className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/20"
                          >
                            Inspect →
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* TAB 3: SYSTEM HEALTH & MIGRATIONS */}
      {activeTab === "health" && (
        <section aria-label="System health and database configuration" className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Database className="size-4 text-primary" />
              Live Database Verification
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Direct connection status with Supabase project <code className="font-mono text-foreground font-semibold">zwygwfcaollyotvfwumx</code>.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-secondary/70 p-3 ring-1 ring-border">
                <span className="text-[11px] text-muted-foreground font-medium">Reports in DB</span>
                <p className="text-lg font-bold text-foreground">{reports.length}</p>
              </div>
              <div className="rounded-xl bg-secondary/70 p-3 ring-1 ring-border">
                <span className="text-[11px] text-muted-foreground font-medium">Total Deals Loaded</span>
                <p className="text-lg font-bold text-foreground">{deals.length}</p>
              </div>
              <div className="rounded-xl bg-secondary/70 p-3 ring-1 ring-border">
                <span className="text-[11px] text-muted-foreground font-medium">Food Events Loaded</span>
                <p className="text-lg font-bold text-foreground">{foodEvents.length}</p>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-border/80 bg-muted/40 p-4">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">
                Supabase Migration Reference
              </h4>
              <p className="mt-1 text-xs text-muted-foreground">
                Ensure this SQL snippet is executed in your Supabase SQL Editor to allow administrators to read and update reports:
              </p>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-black/90 p-3 text-[11px] font-mono text-emerald-400">
{`-- Migration: 20261113000200_admin_reports_access.sql
grant select, update on public.data_issue_reports to anon, authenticated;

drop policy if exists "allow read data_issue_reports" on public.data_issue_reports;
create policy "allow read data_issue_reports"
  on public.data_issue_reports for select
  to anon, authenticated
  using (true);

drop policy if exists "allow update data_issue_reports" on public.data_issue_reports;
create policy "allow update data_issue_reports"
  on public.data_issue_reports for update
  to anon, authenticated
  using (true)
  with check (status in ('open', 'reviewing', 'resolved', 'dismissed'));`}
              </pre>
            </div>
          </div>
        </section>
      )}

      {/* Resolve / Dismiss Dialog Modal */}
      <Modal
        open={!!resolvingReport}
        onClose={() => setResolvingReport(null)}
        title={resolveAction === "resolved" ? "Resolve Issue Report" : "Dismiss Issue Report"}
      >
        <div className="space-y-4">
          <div>
            <span className="text-xs font-semibold text-primary uppercase tracking-wide">
              {resolveAction === "resolved" ? "Mark as Resolved" : "Dismiss Report"}
            </span>
            <h3 className="text-lg font-bold text-foreground mt-0.5">
              {resolvingReport?.itemLabel}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Issue reported: <span className="font-semibold">{resolvingReport?.issueType}</span>
            </p>
          </div>

          <label className="block text-xs font-medium text-foreground">
            Resolution Notes (optional)
            <textarea
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="e.g., Verified the discount is no longer active, updated listing status..."
              maxLength={1000}
              className="mt-1 block min-h-24 w-full rounded-xl border border-border bg-background p-3 text-xs outline-none focus:border-primary"
            />
          </label>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => setResolvingReport(null)}
              className="rounded-full bg-secondary px-4 py-2 text-xs font-semibold ring-1 ring-border hover:bg-glass"
            >
              Cancel
            </button>
            <Btn
              disabled={updateStatusMutation.isPending}
              onClick={() => void handleConfirmResolution()}
            >
              {updateStatusMutation.isPending
                ? "Saving…"
                : resolveAction === "resolved"
                  ? "Confirm Resolved"
                  : "Confirm Dismissed"}
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
