import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import {
  PageHeader,
  Modal,
  Btn,
  DealDetail,
  EventDetail,
} from "@/components/ui-bits";
import { calculateVerificationScore } from "@/lib/deal-verification";
import { useStore } from "@/lib/store";
import {
  useDataIssueReportsQuery,
  useUpdateReportStatusMutation,
  type DataIssueReport,
  type ReportStatus,
} from "@/lib/data-issues";
import { useDealsQuery, useDeleteDealMutation, type Deal } from "@/lib/deals";
import {
  useFoodEventsQuery,
  useDeleteFoodEventMutation,
  type NormalizedFoodEvent,
} from "@/lib/food-events";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  RefreshCw,
  Search,
  ShieldAlert,
  Tag,
  Utensils,
  CreditCard,
  X,
  ArrowRight,
  Database,
  Eye,
  Trash2,
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
  const { user } = useStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"reports" | "disputed" | "deleted" | "health">("reports");
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<DataIssueReport["itemType"] | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Deleted listings search & filter state
  const [deletedSearchQuery, setDeletedSearchQuery] = useState("");
  const [deletedTypeFilter, setDeletedTypeFilter] = useState<DataIssueReport["itemType"] | "all">("all");

  // Report resolution modal state
  const [resolvingReport, setResolvingReport] = useState<DataIssueReport | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [resolveAction, setResolveAction] = useState<"resolved" | "dismissed">("resolved");

  // In-app listing preview state
  const [previewDeal, setPreviewDeal] = useState<Deal | null>(null);
  const [previewEvent, setPreviewEvent] = useState<NormalizedFoodEvent | null>(null);

  // Listing deletion modal state
  const [deletingItem, setDeletingItem] = useState<{
    id: string;
    label: string;
    type: "deal" | "event";
    reportId?: string;
  } | null>(null);

  // React Queries and Mutations
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
  const deleteDealMutation = useDeleteDealMutation();
  const deleteFoodEventMutation = useDeleteFoodEventMutation();

  // Helper: determine if a report represents a permanently deleted listing
  const isReportDeleted = (r: DataIssueReport) => {
    return (
      (r.resolutionNotes || "").toLowerCase().includes("deleted") ||
      (r.issueType || "").toLowerCase().includes("deleted") ||
      (r.issueType || "").toLowerCase().includes("removed") ||
      (r.details || "").toLowerCase().includes("permanently deleted")
    );
  };

  // Split reports into active submitted reports vs. deleted listings archive
  const deletedReports = useMemo(() => {
    return reports.filter(isReportDeleted);
  }, [reports]);

  const activeReports = useMemo(() => {
    return reports.filter((r) => !isReportDeleted(r));
  }, [reports]);

  // Metrics counts
  const openCount = activeReports.filter((r) => r.status === "open").length;
  const reviewingCount = activeReports.filter((r) => r.status === "reviewing").length;
  const resolvedCount = activeReports.filter((r) => r.status === "resolved").length;
  const dismissedCount = activeReports.filter((r) => r.status === "dismissed").length;

  // Filtered active reports
  const filteredReports = useMemo(() => {
    return activeReports.filter((r) => {
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
  }, [activeReports, statusFilter, typeFilter, searchQuery]);

  // Filtered deleted reports
  const filteredDeletedReports = useMemo(() => {
    return deletedReports.filter((r) => {
      if (deletedTypeFilter !== "all" && r.itemType !== deletedTypeFilter) return false;
      if (deletedSearchQuery.trim()) {
        const q = deletedSearchQuery.toLowerCase();
        const matchLabel = r.itemLabel.toLowerCase().includes(q);
        const matchIssue = r.issueType.toLowerCase().includes(q);
        const matchDetails = (r.details || "").toLowerCase().includes(q);
        const matchNotes = (r.resolutionNotes || "").toLowerCase().includes(q);
        if (!matchLabel && !matchIssue && !matchDetails && !matchNotes) return false;
      }
      return true;
    });
  }, [deletedReports, deletedTypeFilter, deletedSearchQuery]);

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
        resolutionNotes:
          notes !== undefined
            ? notes
            : newStatus === "open"
              ? "Reopened by administrator for review."
              : (report.resolutionNotes || undefined),
      });
      toast.success(
        newStatus === "open"
          ? "Report reopened and moved to Active Reports"
          : `Report marked as ${newStatus}`
      );
    } catch (err) {
      console.error("Failed to update report status:", err);
      toast.error("Failed to update report status");
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
      toast.success(
        resolveAction === "resolved" ? "Report marked resolved" : "Report dismissed"
      );
      setResolvingReport(null);
      setResolutionNotes("");
    } catch (err) {
      console.error("Failed to resolve report:", err);
      toast.error("Failed to update report status");
    }
  };

  const handleQuickPreview = (itemType: DataIssueReport["itemType"], itemId: string) => {
    if (itemType === "deal") {
      const match = deals.find((d) => d.id === itemId);
      if (match) {
        setPreviewDeal(match);
      } else {
        toast.info("Deal not found in active listings (may have already been deleted or expired).");
      }
    } else if (itemType === "event") {
      const match = foodEvents.find((e) => e.id === itemId);
      if (match) {
        setPreviewEvent(match);
      } else {
        toast.info("Food event not found in active listings.");
      }
    } else {
      toast.info("Starving Student offers can be inspected on the Card Hub page.");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    try {
      if (deletingItem.type === "deal") {
        await deleteDealMutation.mutateAsync(deletingItem.id);
      } else if (deletingItem.type === "event") {
        await deleteFoodEventMutation.mutateAsync(deletingItem.id);
      }

      // If associated with a report, ensure it's marked resolved in UI
      if (deletingItem.reportId) {
        try {
          await updateStatusMutation.mutateAsync({
            id: deletingItem.reportId,
            status: "resolved",
            resolutionNotes: "Listing permanently deleted by administrator.",
          });
        } catch (reportErr) {
          console.warn("Report resolution after listing deletion warning:", reportErr);
        }
      } else {
        // If not associated with an existing report (e.g. deleted from Disputed tab),
        // insert an audit record so it is archived in the Deleted Listings tab
        try {
          await supabase.from("data_issue_reports").insert({
            item_type: deletingItem.type,
            item_id: deletingItem.id,
            item_label: deletingItem.label,
            issue_type: "Listing permanently deleted by administrator",
            details: "Removed by administrator via moderation dashboard.",
            status: "resolved",
            resolution_notes: "Listing permanently deleted by administrator.",
            resolved_at: new Date().toISOString(),
          });
          void queryClient.invalidateQueries({ queryKey: ["data_issue_reports"] });
        } catch (insertErr) {
          console.warn("Audit report insertion warning:", insertErr);
        }
      }

      toast.success(
        `"${deletingItem.label}" permanently deleted and moved to Deleted Listings tab.`
      );
      setDeletingItem(null);
    } catch (err: unknown) {
      console.error("Failed to delete post:", err);
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err && "message" in err
            ? String((err as Record<string, unknown>).message)
            : "Failed to delete listing. Please check permissions.";
      toast.error(`Delete failed: ${msg}`);
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
              Administrator Reports & Moderation Console
            </h2>
            <p className="text-xs text-muted-foreground">
              {user ? (
                <>
                  Signed in as <span className="font-semibold text-foreground">@{user.username}</span> ({user.email || user.name}) · Full moderation & deletion access enabled
                </>
              ) : (
                "Signed out preview mode. Sign in to your administrator account to save resolution notes or delete posts."
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
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div
          onClick={() => {
            setActiveTab("reports");
            setStatusFilter("open");
          }}
          className="cursor-pointer rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:border-amber-500/50"
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Open Reports</span>
            <Clock className="size-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">
            {openCount}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Needs review</p>
        </div>

        <div
          onClick={() => {
            setActiveTab("reports");
            setStatusFilter("reviewing");
          }}
          className="cursor-pointer rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:border-sky-500/50"
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">In Review</span>
            <Eye className="size-4 text-sky-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-sky-600 dark:text-sky-400">
            {reviewingCount}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Being checked</p>
        </div>

        <div
          onClick={() => {
            setActiveTab("reports");
            setStatusFilter("resolved");
          }}
          className="cursor-pointer rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:border-emerald-500/50"
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Resolved</span>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {resolvedCount}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Completed issues</p>
        </div>

        <div
          onClick={() => setActiveTab("deleted")}
          className="cursor-pointer rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:border-rose-500/50"
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Deleted Listings</span>
            <Trash2 className="size-4 text-rose-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-rose-600 dark:text-rose-400">
            {deletedReports.length}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Permanently removed</p>
        </div>

        <div
          onClick={() => setActiveTab("disputed")}
          className="cursor-pointer rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:border-rose-500/50"
        >
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
      <div className="mb-6 flex flex-wrap border-b border-border/80 gap-1 sm:gap-2">
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
            {activeReports.length}
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
          onClick={() => setActiveTab("deleted")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
            activeTab === "deleted"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Trash2 className="size-4 text-rose-500" />
          Deleted Listings
          {deletedReports.length > 0 && (
            <span className="rounded-full bg-rose-500/15 px-2 py-0.2 text-xs font-bold text-rose-600 dark:text-rose-400">
              {deletedReports.length}
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
                <option value="all">All Active Reports ({activeReports.length})</option>
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

            {filteredReports.length !== activeReports.length && (
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
                // Direct deep link to item on the live site
                const targetLink =
                  report.itemType === "deal"
                    ? `/discounts?dealId=${encodeURIComponent(report.itemId)}`
                    : report.itemType === "event"
                      ? `/free-food?eventId=${encodeURIComponent(report.itemId)}`
                      : `/starving-student?dealId=${encodeURIComponent(report.itemId)}`;

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

                      {/* Admin Inspection & Actions */}
                      <div className="flex flex-wrap items-center gap-1.5 sm:flex-col sm:items-end">
                        <div className="flex items-center gap-1.5">
                          {/* Quick In-Page Preview */}
                          {(report.itemType === "deal" || report.itemType === "event") && (
                            <button
                              type="button"
                              onClick={() => handleQuickPreview(report.itemType, report.itemId)}
                              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20"
                            >
                              <Eye className="size-3" /> Quick Preview
                            </button>
                          )}

                          {/* Direct deep link to item on the page */}
                          <Link
                            to={targetLink}
                            className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold ring-1 ring-border hover:bg-glass"
                          >
                            Open on Page <ExternalLink className="size-3" />
                          </Link>
                        </div>

                        {/* Delete Post Action */}
                        {(report.itemType === "deal" || report.itemType === "event") && (
                          <button
                            type="button"
                            onClick={() =>
                              setDeletingItem({
                                id: report.itemId,
                                label: report.itemLabel,
                                type: report.itemType as "deal" | "event",
                                reportId: report.id,
                              })
                            }
                            className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-500/20 dark:text-rose-400"
                          >
                            <Trash2 className="size-3" /> Delete Post
                          </button>
                        )}

                        {/* Status workflow buttons */}
                        {report.status === "open" && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
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
                          </div>
                        )}

                        {report.status === "reviewing" && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
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
                          </div>
                        )}

                        {(report.status === "resolved" || report.status === "dismissed") && (
                          <button
                            type="button"
                            onClick={() => void handleStatusChange(report, "open")}
                            className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold ring-1 ring-border hover:bg-glass mt-1"
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
              These listings were contributed by users and have received "Fake / Expired" or "Food ran out" votes from other students. Administrators can inspect or delete them.
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
                          <button
                            type="button"
                            onClick={() => setPreviewDeal(deal)}
                            className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/20"
                          >
                            Preview
                          </button>
                          <Link
                            to={`/discounts?dealId=${encodeURIComponent(deal.id)}`}
                            className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold ring-1 ring-border hover:bg-glass"
                          >
                            Open on Page ↗
                          </Link>
                          <button
                            type="button"
                            onClick={() =>
                              setDeletingItem({
                                id: deal.id,
                                label: `${deal.company}: ${deal.title}`,
                                type: "deal",
                              })
                            }
                            className="rounded-full bg-rose-500/15 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-500/25 dark:text-rose-400"
                          >
                            🗑️ Delete
                          </button>
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
                          <button
                            type="button"
                            onClick={() => setPreviewEvent(event)}
                            className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/20"
                          >
                            Preview
                          </button>
                          <Link
                            to={`/free-food?eventId=${encodeURIComponent(event.id)}`}
                            className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold ring-1 ring-border hover:bg-glass"
                          >
                            Open on Page ↗
                          </Link>
                          <button
                            type="button"
                            onClick={() =>
                              setDeletingItem({
                                id: event.id,
                                label: event.title,
                                type: "event",
                              })
                            }
                            className="rounded-full bg-rose-500/15 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-500/25 dark:text-rose-400"
                          >
                            🗑️ Delete
                          </button>
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

      {/* TAB 3: DELETED LISTINGS ARCHIVE */}
      {activeTab === "deleted" && (
        <section aria-label="Permanently deleted listings archive">
          <div className="mb-6 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Trash2 className="size-5 text-rose-500" />
                  Deleted Listings & Moderation Archive ({deletedReports.length})
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Community deals, food alerts, and posts permanently removed by administrators. Kept here for audit history and tracking.
                </p>
              </div>
              {deletedReports.length > 0 && (
                <span className="inline-flex items-center rounded-full bg-rose-500/15 px-3 py-1 text-xs font-bold text-rose-600 dark:text-rose-400 self-start sm:self-auto">
                  {deletedReports.length} {deletedReports.length === 1 ? "Listing Removed" : "Listings Removed"}
                </span>
              )}
            </div>
          </div>

          {/* Search & Filters */}
          <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <div className="relative min-w-[200px] flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={deletedSearchQuery}
                  onChange={(e) => setDeletedSearchQuery(e.target.value)}
                  placeholder="Search deleted listings by title, notes, reason…"
                  className="w-full rounded-full border border-border bg-background py-1.5 pl-9 pr-4 text-xs font-medium outline-none focus:border-primary"
                />
              </div>

              <select
                value={deletedTypeFilter}
                onChange={(e) =>
                  setDeletedTypeFilter(e.target.value as DataIssueReport["itemType"] | "all")
                }
                className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold outline-none focus:border-primary"
              >
                <option value="all">All Types ({deletedReports.length})</option>
                <option value="deal">🏷️ Deals</option>
                <option value="event">🍕 Free Food</option>
                <option value="starving_student">💳 Starving Student</option>
              </select>
            </div>

            {(deletedSearchQuery || deletedTypeFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setDeletedSearchQuery("");
                  setDeletedTypeFilter("all");
                }}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Reset filters
              </button>
            )}
          </div>

          {/* Deleted Listings Content */}
          {filteredDeletedReports.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/80 bg-card p-12 text-center">
              <div className="mx-auto grid size-12 place-items-center rounded-full bg-rose-500/10 text-rose-500">
                <Trash2 className="size-6" />
              </div>
              <h3 className="mt-3 text-base font-bold text-foreground">
                {deletedReports.length === 0
                  ? "No listings have been permanently deleted yet."
                  : "No deleted listings match your search criteria."}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
                {deletedReports.length === 0
                  ? "When an administrator takes down a community post or confirms a report deletion, it will automatically move here to keep the main reports page organized."
                  : "Try clearing your search filters to view all deleted listings."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDeletedReports.map((report) => (
                <article
                  key={report.id}
                  className="overflow-hidden rounded-2xl border border-border/80 bg-card p-5 shadow-sm transition-all hover:border-border"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <TypeBadge type={report.itemType} />
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2.5 py-0.5 text-xs font-bold text-rose-600 dark:text-rose-400">
                          <Trash2 className="size-3" /> Permanently Deleted
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {formatTimestamp(report.resolvedAt || report.createdAt)} ({timeAgo(report.resolvedAt || report.createdAt)})
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-foreground">
                        {report.itemLabel}
                      </h3>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 text-xs font-semibold text-foreground ring-1 ring-border">
                          ⚠️ {report.issueType}
                        </span>
                        <span className="text-[11px] font-mono text-muted-foreground">
                          Item ID: {report.itemId}
                        </span>
                      </div>

                      {/* Details / Notes */}
                      {report.details && (
                        <div className="mt-2 rounded-xl bg-muted/60 p-3 text-xs text-foreground leading-relaxed">
                          <span className="font-semibold text-muted-foreground block text-[11px] mb-0.5">
                            Original Report Notes:
                          </span>
                          "{report.details}"
                        </div>
                      )}

                      {/* Deletion Notes */}
                      <div className="mt-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-2.5 text-xs text-rose-800 dark:text-rose-300">
                        <span className="font-bold block text-[11px]">
                          Admin Deletion Notes:
                        </span>
                        {report.resolutionNotes || "Listing permanently deleted by administrator."}
                      </div>
                    </div>

                    {/* Actions on Deleted Item */}
                    <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                      <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground ring-1 ring-border">
                        Removed from Public
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleStatusChange(report, "open", "Reopened from deleted archive by administrator.")}
                        className="rounded-full bg-secondary px-3.5 py-1.5 text-xs font-semibold ring-1 ring-border hover:bg-glass transition-colors text-foreground"
                      >
                        Reopen Report
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* TAB 4: SYSTEM HEALTH & MIGRATIONS */}
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
                Ensure this SQL snippet is executed in your Supabase SQL Editor to allow administrators to read, update reports, and delete listings:
              </p>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-black/90 p-3 text-[11px] font-mono text-emerald-400">
{`-- Migration: 20261113000200_admin_reports_access.sql
grant select, update, delete on public.data_issue_reports to anon, authenticated;
grant delete on public.deals to anon, authenticated;
grant delete on public.food_events to anon, authenticated;

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
  with check (status in ('open', 'reviewing', 'resolved', 'dismissed'));

drop policy if exists "Allow admins and users to delete deals" on public.deals;
create policy "Allow admins and users to delete deals"
  on public.deals for delete
  to anon, authenticated
  using (true);

drop policy if exists "Allow admins and users to delete food_events" on public.food_events;
create policy "Allow admins and users to delete food_events"
  on public.food_events for delete
  to anon, authenticated
  using (true);`}
              </pre>
            </div>
          </div>
        </section>
      )}

      {/* Quick In-Page Listing Previews */}
      {previewDeal && (
        <DealDetail deal={previewDeal} onClose={() => setPreviewDeal(null)} />
      )}
      {previewEvent && (
        <EventDetail event={previewEvent} onClose={() => setPreviewEvent(null)} />
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

      {/* Delete Post Confirmation Modal */}
      <Modal
        open={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        title="Delete Community Listing"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl bg-rose-500/10 p-3.5 border border-rose-500/20 text-rose-700 dark:text-rose-300">
            <Trash2 className="size-5 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold">Permanent deletion warning</p>
              <p className="mt-0.5 leading-relaxed">
                You are about to permanently take down{" "}
                <span className="font-semibold underline">"{deletingItem?.label}"</span>. This will immediately remove the listing from Studeats for all users.
              </p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            If this listing is tied to a report, the report will automatically be marked as resolved with note: "Listing permanently deleted by administrator."
          </p>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => setDeletingItem(null)}
              disabled={deleteDealMutation.isPending || deleteFoodEventMutation.isPending}
              className="rounded-full bg-secondary px-4 py-2 text-xs font-semibold ring-1 ring-border hover:bg-glass"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleteDealMutation.isPending || deleteFoodEventMutation.isPending}
              onClick={() => void handleConfirmDelete()}
              className="rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
            >
              {deleteDealMutation.isPending || deleteFoodEventMutation.isPending
                ? "Deleting…"
                : "Delete Permanently"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
