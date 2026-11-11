/** Display labels only: do not alter stored room values or event matching. */
export function roomLabel(room?: string | null): string {
  const value = (room ?? "")
    .trim()
    .replace(/^(?:room|rm)\.?(?:\s*:\s*|\s+|(?=\d)|$)/i, "")
    .trim();
  if (!value) return "";
  return /^\d/.test(value) ? `Room ${value}` : `Room: ${value}`;
}

export function eventCountLabel(count: number, loading: boolean, failed: boolean): string {
  if (loading) return "Loading food events…";
  if (failed) return "Food events couldn’t load";
  return `${count} food event${count === 1 ? "" : "s"}`;
}
