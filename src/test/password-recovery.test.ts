import { expect, it, vi } from "vitest";
import { completePasswordRecovery } from "@/lib/password-recovery";

const auth = vi.hoisted(() => ({
  callback: (_event: string, _session: { user: { id: string } } | null) => {},
  getSession: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      onAuthStateChange: (callback: typeof auth.callback) => {
        auth.callback = callback;
      },
      getSession: auth.getSession,
      updateUser: auth.updateUser,
    },
  },
}));

it("requires a recovery event for the active account and consumes it after success", async () => {
  const session = { user: { id: "account-a" } };
  auth.getSession.mockResolvedValue({ data: { session } });
  auth.updateUser.mockResolvedValue({ error: null });
  auth.callback("INITIAL_SESSION", session);
  expect(await completePasswordRecovery("sample-password")).toMatch(/no longer active/);
  auth.callback("PASSWORD_RECOVERY", session);
  auth.getSession.mockResolvedValueOnce({ data: { session: { user: { id: "account-b" } } } });
  expect(await completePasswordRecovery("sample-password")).toMatch(/no longer active/);
  expect(auth.updateUser).not.toHaveBeenCalled();
  expect(await completePasswordRecovery("sample-password")).toBeNull();
  expect(await completePasswordRecovery("sample-password")).toMatch(/no longer active/);
  expect(auth.updateUser).toHaveBeenCalledTimes(1);
});
