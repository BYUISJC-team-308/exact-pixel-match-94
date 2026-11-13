import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";

export type DataIssueInput = {
  itemType: "deal" | "starving_student" | "event";
  itemId: string;
  itemLabel: string;
  issueType: string;
  details?: string;
};

export type DataIssueReport = {
  id: string;
  itemType: "deal" | "starving_student" | "event";
  itemId: string;
  itemLabel: string;
  issueType: string;
  details: string | null;
  pageUrl: string | null;
  status: ReportStatus;
  resolutionNotes: string | null;
  resolvedAt: string | null;
  createdAt: string;
};

type DataIssueReportRow = {
  id: string;
  item_type: "deal" | "starving_student" | "event";
  item_id: string;
  item_label: string;
  issue_type: string;
  details: string | null;
  page_url: string | null;
  status: ReportStatus;
  resolution_notes: string | null;
  resolved_at: string | null;
  created_at: string;
};

function toReport(row: DataIssueReportRow): DataIssueReport {
  return {
    id: row.id,
    itemType: row.item_type,
    itemId: row.item_id,
    itemLabel: row.item_label,
    issueType: row.issue_type,
    details: row.details,
    pageUrl: row.page_url,
    status: row.status || "open",
    resolutionNotes: row.resolution_notes,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
  };
}

export async function submitDataIssue(input: DataIssueInput) {
  const { error } = await supabase.from("data_issue_reports").insert({
    item_type: input.itemType,
    item_id: input.itemId,
    item_label: input.itemLabel,
    issue_type: input.issueType,
    details: input.details || null,
    page_url: typeof window === "undefined" ? null : window.location.href,
  });
  if (error) throw error;
}

export async function fetchDataIssueReports(
  statusFilter?: ReportStatus | "all"
): Promise<DataIssueReport[]> {
  let query = supabase
    .from("data_issue_reports")
    .select("*")
    .order("created_at", { ascending: false });

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching data issue reports:", error);
    throw error;
  }
  return (data as DataIssueReportRow[] || []).map(toReport);
}

export async function updateReportStatus(
  id: string,
  status: ReportStatus,
  resolutionNotes?: string
): Promise<void> {
  const isResolvedOrDismissed = status === "resolved" || status === "dismissed";
  const { error } = await supabase
    .from("data_issue_reports")
    .update({
      status,
      resolution_notes: resolutionNotes !== undefined ? resolutionNotes : null,
      resolved_at: isResolvedOrDismissed ? new Date().toISOString() : null,
    })
    .eq("id", id);

  if (error) {
    console.error("Error updating report status:", error);
    throw error;
  }
}

export function useDataIssueReportsQuery(statusFilter?: ReportStatus | "all") {
  return useQuery({
    queryKey: ["data_issue_reports", statusFilter ?? "all"],
    queryFn: () => fetchDataIssueReports(statusFilter),
    staleTime: 10_000,
    refetchOnWindowFocus: true,
  });
}

export function useUpdateReportStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      resolutionNotes,
    }: {
      id: string;
      status: ReportStatus;
      resolutionNotes?: string;
    }) => updateReportStatus(id, status, resolutionNotes),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["data_issue_reports"] });
    },
  });
}
