import { supabase } from "@/lib/supabase";

export type DataIssueInput = {
  itemType: "deal" | "starving_student" | "event";
  itemId: string;
  itemLabel: string;
  issueType: string;
  details?: string;
};

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
