import { supabase } from "@/lib/supabase";
export const recordTables = {
  deals: "Discounts",
  food_events: "Free food events",
  ss_deals: "Card offers",
  colleges: "Colleges",
  campuses: "Campuses",
  campus_buildings: "Campus buildings",
} as const;
export type RecordTable = keyof typeof recordTables;
export type RecordRow = Record<string, unknown> & { id: string };
export type RecordField = {
  name: string;
  type: string;
  nullable: boolean;
  hasDefault: boolean;
  readOnly: boolean;
  options: string[] | null;
};
export type RecordPage = { fields: RecordField[]; rows: RecordRow[]; total: number };
export type ManagedUser = {
  id: string;
  email: string;
  created_at: string;
  profile: { username: string; full_name: string; school: string; role: string } | null;
};
export async function recordRequest<T = RecordPage>(
  table: RecordTable,
  action = "list",
  options: Record<string, unknown> = {},
): Promise<T> {
  const { data, error } = await supabase.rpc("maintain_records", {
    p_table: table,
    p_action: action,
    ...options,
  });
  if (error)
    throw new Error(
      error.code === "PGRST202"
        ? "Record management needs its database migration applied."
        : error.message,
    );
  return data as T;
}
export async function userRequest<T = { users: ManagedUser[]; hasNext: boolean }>(
  action: string,
  options: Record<string, unknown> = {},
): Promise<T> {
  const { data, error } = await supabase.functions.invoke("maintain-users", {
    body: { action, ...options },
  });
  if (error) {
    let message =
      "User management could not connect. Confirm the maintain-users Edge Function is deployed, then try again.";
    try {
      const response = await error.context?.json();
      if (response?.error) message = response.error;
    } catch {
      /* Preserve connection guidance for a non-JSON gateway response. */
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}
export function recordValues(fields: RecordField[], draft: Record<string, string>, isNew: boolean) {
  const result: Record<string, unknown> = {};
  for (const f of fields.filter((f) => !f.readOnly)) {
    const value = draft[f.name] ?? "";
    if (value === "") {
      if (!isNew && f.nullable) result[f.name] = null;
      else if (!f.nullable && !f.hasDefault) throw new Error(`Enter ${fieldLabel(f.name)}.`);
      continue;
    }
    if (f.type === "bool") result[f.name] = value === "true";
    else if (["int2", "int4", "int8", "float4", "float8", "numeric"].includes(f.type)) {
      const number = Number(value);
      if (!Number.isFinite(number)) throw new Error(`Enter a number for ${fieldLabel(f.name)}.`);
      result[f.name] = number;
    } else if (f.type === "jsonb" || f.type === "json" || f.type.startsWith("_")) {
      try {
        result[f.name] = JSON.parse(value);
      } catch {
        throw new Error(`Use valid JSON for ${fieldLabel(f.name)}.`);
      }
    } else result[f.name] = value;
  }
  return result;
}
export function fieldLabel(name: string) {
  return name.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());
}
export function recordTitle(row: RecordRow) {
  return String(row["title"] || row["item"] || row["name"] || row["company"] || row.id);
}
