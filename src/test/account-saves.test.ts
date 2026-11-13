import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isUuid,
  fetchUserSavedDeals,
  fetchUserSavedEvents,
  saveUserDeal,
  unsaveUserDeal,
  saveUserEvent,
  unsaveUserEvent,
  syncAndMergeGuestSaves,
} from "@/lib/saved";
import { supabase } from "@/lib/supabase";
import { actions, getStoreState } from "@/lib/store";

describe("Account-backed Saves & Guest Migration (P03 & P04)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Store tests need browser storage even when Node exposes an unavailable native localStorage.
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
      clear: () => storage.clear(),
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  describe("UUID Validation", () => {
    it("validates RFC4122 standard UUIDs", () => {
      expect(isUuid("b67cbe4f-ae16-4cc4-8bde-3ce806ab4965")).toBe(true);
      expect(isUuid("7ed14a29-298e-4244-8672-dfca29b90a24")).toBe(true);
      expect(isUuid("B67CBE4F-AE16-4CC4-8BDE-3CE806AB4965")).toBe(true);
    });

    it("rejects non-UUID mock or test IDs safely", () => {
      expect(isUuid("d1")).toBe(false);
      expect(isUuid("e1")).toBe(false);
      expect(isUuid("test-deal-123")).toBe(false);
      expect(isUuid("")).toBe(false);
    });
  });

  describe("Supabase Persistence Queries", () => {
    it("fetches saved deals for an authenticated user", async () => {
      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [{ deal_id: "b67cbe4f-ae16-4cc4-8bde-3ce806ab4965" }],
          error: null,
        }),
      });
      vi.spyOn(supabase, "from").mockReturnValue({
        select: selectMock,
      } as unknown as ReturnType<typeof supabase.from>);

      const deals = await fetchUserSavedDeals("user-uuid-1");
      expect(deals).toEqual(["b67cbe4f-ae16-4cc4-8bde-3ce806ab4965"]);
    });

    it("fetches saved food events for an authenticated user", async () => {
      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [{ event_id: "7ed14a29-298e-4244-8672-dfca29b90a24" }],
          error: null,
        }),
      });
      vi.spyOn(supabase, "from").mockReturnValue({
        select: selectMock,
      } as unknown as ReturnType<typeof supabase.from>);

      const events = await fetchUserSavedEvents("user-uuid-1");
      expect(events).toEqual(["7ed14a29-298e-4244-8672-dfca29b90a24"]);
    });

    it("skips non-UUID IDs when saving to Supabase to prevent Postgres 22P02 syntax errors", async () => {
      const fromSpy = vi.spyOn(supabase, "from");

      await saveUserDeal("user-uuid-1", "mock-deal-d1");
      await unsaveUserDeal("user-uuid-1", "mock-deal-d1");
      await saveUserEvent("user-uuid-1", "mock-event-e1");
      await unsaveUserEvent("user-uuid-1", "mock-event-e1");

      expect(fromSpy).not.toHaveBeenCalled();
    });

    it("calls upsert and delete for valid UUIDs", async () => {
      const upsertMock = vi.fn().mockResolvedValue({ error: null });
      const deleteEqDeal = vi.fn().mockResolvedValue({ error: null });
      const deleteEqUser = vi.fn().mockReturnValue({ eq: deleteEqDeal });
      const deleteMock = vi.fn().mockReturnValue({ eq: deleteEqUser });

      vi.spyOn(supabase, "from").mockReturnValue({
        upsert: upsertMock,
        delete: deleteMock,
      } as unknown as ReturnType<typeof supabase.from>);

      const validDealId = "b67cbe4f-ae16-4cc4-8bde-3ce806ab4965";
      await saveUserDeal("user-uuid-1", validDealId);
      expect(upsertMock).toHaveBeenCalledWith(
        [{ user_id: "user-uuid-1", deal_id: validDealId }],
        expect.objectContaining({ onConflict: "user_id,deal_id", ignoreDuplicates: true }),
      );

      await unsaveUserDeal("user-uuid-1", validDealId);
      expect(deleteMock).toHaveBeenCalled();
    });
  });

  describe("Guest to Account Migration (syncAndMergeGuestSaves)", () => {
    it("merges local guest saves into the remote account without duplicates", async () => {
      const existingRemoteDeal = "11111111-1111-1111-1111-111111111111";
      const localGuestDeal = "22222222-2222-2222-2222-222222222222";
      const existingRemoteEvent = "33333333-3333-3333-3333-333333333333";
      const localGuestEvent = "44444444-4444-4444-4444-444444444444";

      const upsertDeals = vi.fn().mockResolvedValue({ error: null });
      const upsertEvents = vi.fn().mockResolvedValue({ error: null });

      vi.spyOn(supabase, "from").mockImplementation((table: string) => {
        if (table === "saved_deals") {
          return {
            select: () => ({
              eq: () => Promise.resolve({ data: [{ deal_id: existingRemoteDeal }], error: null }),
            }),
            upsert: upsertDeals,
          } as unknown as ReturnType<typeof supabase.from>;
        }
        if (table === "saved_events") {
          return {
            select: () => ({
              eq: () => Promise.resolve({ data: [{ event_id: existingRemoteEvent }], error: null }),
            }),
            upsert: upsertEvents,
          } as unknown as ReturnType<typeof supabase.from>;
        }
        return {} as unknown as ReturnType<typeof supabase.from>;
      });

      const merged = await syncAndMergeGuestSaves(
        "user-uuid-1",
        [existingRemoteDeal, localGuestDeal], // deal 1 is duplicate, deal 2 is new
        [localGuestEvent],
      );

      expect(upsertDeals).toHaveBeenCalledWith(
        [{ user_id: "user-uuid-1", deal_id: localGuestDeal }],
        expect.any(Object),
      );
      expect(upsertEvents).toHaveBeenCalledWith(
        [{ user_id: "user-uuid-1", event_id: localGuestEvent }],
        expect.any(Object),
      );

      expect(merged.deals).toContain(existingRemoteDeal);
      expect(merged.deals).toContain(localGuestDeal);
      expect(merged.deals).toHaveLength(2);

      expect(merged.events).toContain(existingRemoteEvent);
      expect(merged.events).toContain(localGuestEvent);
      expect(merged.events).toHaveLength(2);
    });
  });

  describe("Store Operations & Sign-Out Clearing", () => {
    it("clears saved deals and events on sign-out so public terminals stay clean", () => {
      actions.setSavedItems({
        deals: ["deal-a", "deal-b"],
        events: ["event-a"],
      });

      let state = getStoreState();
      expect(state.savedDeals).toEqual(["deal-a", "deal-b"]);
      expect(state.savedEvents).toEqual(["event-a"]);

      actions.clearSavedItems();

      state = getStoreState();
      expect(state.savedDeals).toEqual([]);
      expect(state.savedEvents).toEqual([]);
    });

    it("optimistically toggles deals and events in the store", () => {
      actions.clearSavedItems();

      actions.toggleDeal("test-deal-uuid", { company: "Waffle Love" });
      expect(getStoreState().savedDeals).toContain("test-deal-uuid");

      actions.toggleDeal("test-deal-uuid", { company: "Waffle Love" });
      expect(getStoreState().savedDeals).not.toContain("test-deal-uuid");

      actions.toggleEvent("test-event-uuid", { title: "Pizza Social" });
      expect(getStoreState().savedEvents).toContain("test-event-uuid");

      actions.toggleEvent("test-event-uuid", { title: "Pizza Social" });
      expect(getStoreState().savedEvents).not.toContain("test-event-uuid");
    });
  });
});
