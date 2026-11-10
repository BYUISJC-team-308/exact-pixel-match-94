import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchTeamOkrSnapshot, signupPeriod } from "@/lib/team-okr";
const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabase: { rpc: mocks.rpc } }));
beforeEach(() => mocks.rpc.mockReset());

describe("Team aggregate client", () => {
  it("turns inclusive UTC dates into an exclusive upper boundary", () => {
    expect(signupPeriod("2026-11-01", "2026-11-09")).toEqual({
      from: "2026-11-01T00:00:00.000Z",
      to: "2026-11-10T00:00:00.000Z",
    });
    expect(() => signupPeriod("2026-02-30", "2026-03-01")).toThrow(/valid signup dates/);
    expect(() => signupPeriod("2026-11-09", "2026-11-01")).toThrow(/1–366/);
  });
  it("does not fall back to local data on permission or migration failures", async () => {
    const localRead = vi.fn(() => JSON.stringify([{ event_type: "deal_saved" }]));
    vi.stubGlobal("localStorage", { getItem: localRead });
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "42501" } });
    await expect(fetchTeamOkrSnapshot("2026-11-01", "2026-11-09")).rejects.toThrow(
      /approved team account/,
    );
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "PGRST202" } });
    await expect(fetchTeamOkrSnapshot("2026-11-01", "2026-11-09")).rejects.toThrow(
      /database update/,
    );
    expect(localRead).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
  it("calls only the restricted aggregate function and rejects incomplete responses", async () => {
    mocks.rpc.mockResolvedValue({ data: { version: 1 }, error: null });
    await expect(fetchTeamOkrSnapshot("2026-11-01", "2026-11-09")).rejects.toThrow(
      /response is incomplete/,
    );
    expect(mocks.rpc).toHaveBeenCalledWith("team_okr_snapshot", {
      p_signup_from: "2026-11-01T00:00:00.000Z",
      p_signup_to: "2026-11-10T00:00:00.000Z",
    });
  });
});
