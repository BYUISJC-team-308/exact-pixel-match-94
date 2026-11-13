import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  isUuid,
  saveUserDeal,
  unsaveUserDeal,
  saveUserEvent,
  unsaveUserEvent,
  syncAndMergeGuestSaves,
} from "@/lib/saved";
import { supabase } from "@/lib/supabase";
import { actions, getStoreState } from "@/lib/store";
import { toast } from "sonner";

describe("Account-Backed Saves - Resilience & Stress Tests", () => {
  const validDealId = "b67cbe4f-ae16-4cc4-8bde-3ce806ab4965";
  const validEventId = "7ed14a29-298e-4244-8672-dfca29b90a24";

  beforeEach(() => {
    vi.restoreAllMocks();
    actions.clearSavedItems();
    actions.setUser(null);
  });

  describe("1. Rapid Toggle Spamming & Race Conditions", () => {
    it("preserves exact parity under rapid sequential toggles (even = unsaved)", () => {
      // Toggle 10 times consecutively
      for (let i = 0; i < 10; i++) {
        actions.toggleDeal(validDealId, { company: "Waffle Love" });
      }

      const state = getStoreState();
      expect(state.savedDeals).not.toContain(validDealId);
      expect(state.savedDeals).toHaveLength(0);
    });

    it("preserves exact parity under rapid sequential toggles (odd = saved)", () => {
      // Toggle 11 times consecutively
      for (let i = 0; i < 11; i++) {
        actions.toggleEvent(validEventId, { title: "Pizza Night" });
      }

      const state = getStoreState();
      expect(state.savedEvents).toContain(validEventId);
      expect(state.savedEvents).toHaveLength(1);
    });

    it("handles rapid alternating deal and event toggles without cross-contamination", () => {
      for (let i = 0; i < 6; i++) {
        actions.toggleDeal(validDealId);
        actions.toggleEvent(validEventId);
      }

      const state = getStoreState();
      expect(state.savedDeals).not.toContain(validDealId);
      expect(state.savedEvents).not.toContain(validEventId);
    });
  });

  describe("2. Network Failures & Optimistic Rollback Mechanics", () => {
    it("rolls back optimistic deal addition and shows error toast on network failure", async () => {
      actions.setUser({
        id: "user-test-1",
        username: "testuser",
        name: "Test User",
        email: "test@byu.edu",
        school: "BYU",
      });

      const toastErrorSpy = vi.spyOn(toast, "error");

      // Mock Supabase upsert to simulate network failure
      vi.spyOn(supabase, "from").mockReturnValue({
        upsert: vi.fn().mockRejectedValue(new Error("Network connection dropped")),
      } as unknown as ReturnType<typeof supabase.from>);

      // Initial state is empty
      expect(getStoreState().savedDeals).toHaveLength(0);

      // Perform optimistic toggle
      actions.toggleDeal(validDealId, { company: "Taco Bell" });

      // Immediately after action, optimistic update should be active
      expect(getStoreState().savedDeals).toContain(validDealId);

      // Wait a tick for the async Supabase catch block to execute
      await new Promise((resolve) => setTimeout(resolve, 50));

      // After rejection, store must roll back
      expect(getStoreState().savedDeals).not.toContain(validDealId);
      expect(toastErrorSpy).toHaveBeenCalledWith(
        "Could not sync saved deal to your account. Check your connection."
      );
    });

    it("rolls back optimistic deal removal and restores item on network failure", async () => {
      actions.setUser({
        id: "user-test-1",
        username: "testuser",
        name: "Test User",
        email: "test@byu.edu",
        school: "BYU",
      });

      // Seed store with deal
      actions.setSavedItems({ deals: [validDealId] });
      expect(getStoreState().savedDeals).toContain(validDealId);

      const toastErrorSpy = vi.spyOn(toast, "error");

      // Mock Supabase delete to simulate network failure
      const deleteEqDeal = vi.fn().mockRejectedValue(new Error("Timeout"));
      const deleteEqUser = vi.fn().mockReturnValue({ eq: deleteEqDeal });
      vi.spyOn(supabase, "from").mockReturnValue({
        delete: vi.fn().mockReturnValue({ eq: deleteEqUser }),
      } as unknown as ReturnType<typeof supabase.from>);

      // Perform optimistic removal
      actions.toggleDeal(validDealId, { company: "Taco Bell" });
      expect(getStoreState().savedDeals).not.toContain(validDealId);

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should roll back to being saved
      expect(getStoreState().savedDeals).toContain(validDealId);
      expect(toastErrorSpy).toHaveBeenCalledWith(
        "Could not sync saved deal to your account. Check your connection."
      );
    });

    it("rolls back optimistic food event toggle on network failure", async () => {
      actions.setUser({
        id: "user-test-1",
        username: "testuser",
        name: "Test User",
        email: "test@byu.edu",
        school: "BYU",
      });

      const toastErrorSpy = vi.spyOn(toast, "error");

      vi.spyOn(supabase, "from").mockReturnValue({
        upsert: vi.fn().mockRejectedValue(new Error("Supabase 500 Internal Error")),
      } as unknown as ReturnType<typeof supabase.from>);

      actions.toggleEvent(validEventId, { title: "Donut Social" });
      expect(getStoreState().savedEvents).toContain(validEventId);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(getStoreState().savedEvents).not.toContain(validEventId);
      expect(toastErrorSpy).toHaveBeenCalledWith(
        "Could not sync saved event to your account. Check your connection."
      );
    });
  });

  describe("3. Malformed & Legacy ID Sanitization", () => {
    it("handles malicious and malformed strings safely without crashing", () => {
      const malformedIds = [
        "",
        "   ",
        "' OR '1'='1",
        "drop table deals;--",
        "undefined",
        "null",
        "12345",
        "not-a-uuid-format-string-that-is-way-too-long-to-be-valid",
        "d1",
        "d2",
        "e1",
        "mock-test-id",
      ];

      for (const id of malformedIds) {
        expect(isUuid(id)).toBe(false);
      }
    });

    it("accepts valid RFC4122 UUIDs with lowercase, uppercase, and mixed case", () => {
      expect(isUuid("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
      expect(isUuid("550E8400-E29B-41D4-A716-446655440000")).toBe(true);
      expect(isUuid("550e8400-E29B-41d4-A716-446655440000")).toBe(true);
    });

    it("silently guards Supabase from non-UUID calls in save/unsave functions", async () => {
      const fromSpy = vi.spyOn(supabase, "from");

      await saveUserDeal("user-id", "'; DROP TABLE saved_deals; --");
      await unsaveUserDeal("user-id", "d1");
      await saveUserEvent("user-id", "mock-event");
      await unsaveUserEvent("user-id", "");

      expect(fromSpy).not.toHaveBeenCalled();
    });
  });

  describe("4. Multi-Device & Cross-Session Merging Edge Cases", () => {
    it("handles zero remote saves with multiple local saves", async () => {
      const localDeals = [
        "11111111-1111-1111-1111-111111111111",
        "22222222-2222-2222-2222-222222222222",
      ];
      const upsertSpy = vi.fn().mockResolvedValue({ error: null });

      vi.spyOn(supabase, "from").mockReturnValue({
        select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
        upsert: upsertSpy,
      } as unknown as ReturnType<typeof supabase.from>);

      const merged = await syncAndMergeGuestSaves("user-1", localDeals, []);

      expect(merged.deals).toEqual(localDeals);
      expect(upsertSpy).toHaveBeenCalledWith(
        localDeals.map((deal_id) => ({ user_id: "user-1", deal_id })),
        expect.any(Object)
      );
    });

    it("handles zero local saves with multiple remote saves", async () => {
      const remoteDeals = ["11111111-1111-1111-1111-111111111111"];
      const upsertSpy = vi.fn();

      vi.spyOn(supabase, "from").mockReturnValue({
        select: () => ({
          eq: () => Promise.resolve({ data: [{ deal_id: remoteDeals[0] }], error: null }),
        }),
        upsert: upsertSpy,
      } as unknown as ReturnType<typeof supabase.from>);

      const merged = await syncAndMergeGuestSaves("user-1", [], []);

      expect(merged.deals).toEqual(remoteDeals);
      expect(upsertSpy).not.toHaveBeenCalled();
    });

    it("preserves non-UUID mock items locally while upserting only valid UUIDs to Supabase", async () => {
      const validId = "11111111-1111-1111-1111-111111111111";
      const mockId = "mock-deal-1";
      const upsertSpy = vi.fn().mockResolvedValue({ error: null });

      vi.spyOn(supabase, "from").mockReturnValue({
        select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
        upsert: upsertSpy,
      } as unknown as ReturnType<typeof supabase.from>);

      const merged = await syncAndMergeGuestSaves("user-1", [validId, mockId], []);

      // Both items are present in returned client state
      expect(merged.deals).toContain(validId);
      expect(merged.deals).toContain(mockId);

      // Only valid UUID was sent to Supabase
      expect(upsertSpy).toHaveBeenCalledWith(
        [{ user_id: "user-1", deal_id: validId }],
        expect.any(Object)
      );
    });

    it("falls back gracefully to local state if Supabase queries fail during sign-in sync", async () => {
      const localDeals = ["11111111-1111-1111-1111-111111111111"];
      const localEvents = ["22222222-2222-2222-2222-222222222222"];

      vi.spyOn(supabase, "from").mockReturnValue({
        select: () => ({ eq: () => Promise.reject(new Error("Supabase unavailable")) }),
      } as unknown as ReturnType<typeof supabase.from>);

      const merged = await syncAndMergeGuestSaves("user-1", localDeals, localEvents);

      // Does not throw; returns local fallback
      expect(merged.deals).toEqual(localDeals);
      expect(merged.events).toEqual(localEvents);
    });
  });

  describe("5. Cross-Tab Real-Time Sync", () => {
    it("updates store in real-time when a storage event fires from another tab", () => {
      expect(getStoreState().savedDeals).toHaveLength(0);

      // Simulate another browser tab saving a deal into localStorage
      const updatedStorage = {
        savedDeals: ["deal-from-other-tab"],
        savedEvents: ["event-from-other-tab"],
        recentMapSearches: [],
        ssUsedCounts: {},
        usedSS: [],
        preferredCampus: "byu-provo",
      };
      localStorage.setItem("studeats-state", JSON.stringify(updatedStorage));

      // Dispatch storage event
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "studeats-state",
          newValue: JSON.stringify(updatedStorage),
        })
      );

      const state = getStoreState();
      expect(state.savedDeals).toEqual(["deal-from-other-tab"]);
      expect(state.savedEvents).toEqual(["event-from-other-tab"]);
    });
  });
});
