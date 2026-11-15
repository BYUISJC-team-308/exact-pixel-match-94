import { afterEach, expect, it, vi } from "vitest";
import { actions, getStoreState } from "@/lib/store";
import { logActivityEvent } from "@/lib/analytics";
import { saveUserDeal } from "@/lib/saved";

vi.mock("@/lib/analytics", () => ({ logActivityEvent: vi.fn() }));
vi.mock("@/lib/saved", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/saved")>()),
  saveUserDeal: vi.fn(),
}));

afterEach(() => {
  actions.scopeSavedItemsToAccount(null);
  actions.setUser(null);
  vi.restoreAllMocks();
});

it("reports a save only after Supabase confirms it for that account", async () => {
  const id = "b67cbe4f-ae16-4cc4-8bde-3ce806ab4965";
  actions.setUser({ id: "a", name: "A", username: "a", email: "", school: "BYU" });
  actions.scopeSavedItemsToAccount("a");
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(saveUserDeal).mockRejectedValueOnce(new Error("offline"));
  actions.toggleDeal(id);
  await vi.waitFor(() => expect(getStoreState().savedDeals).not.toContain(id));
  expect(logActivityEvent).not.toHaveBeenCalled();

  let confirm!: () => void;
  vi.mocked(saveUserDeal).mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        confirm = resolve;
      }),
  );
  actions.toggleDeal(id);
  expect(logActivityEvent).not.toHaveBeenCalled();
  confirm();
  await vi.waitFor(() =>
    expect(logActivityEvent).toHaveBeenCalledExactlyOnceWith("deal_saved", { dealId: id }, "a"),
  );

  actions.scopeSavedItemsToAccount("b");
  expect(getStoreState().savedDeals).toEqual([]);
});
