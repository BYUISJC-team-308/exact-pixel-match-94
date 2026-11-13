import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ProfileEditor } from "@/components/ProfileEditor";
import { updateProfile } from "@/lib/auth";
vi.mock("@/lib/auth", () => ({ updateProfile: vi.fn() }));
const user = {
  id: "owner",
  name: "Lot",
  username: "lot",
  email: "lot@example.com",
  school: "BYU",
  avatar: "https://example.com/photo",
};
beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);
it("keeps identity and preference fields outside the editor and supports cancelling", () => {
  render(<ProfileEditor initial={user} />);
  expect(screen.queryByLabelText(/password|school|email/i)).toBeNull();
  expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Changed" } });
  fireEvent.click(screen.getByRole("button", { name: "Remove photo" }));
  fireEvent.click(screen.getByRole("button", { name: "Cancel changes" }));
  expect(screen.getByLabelText("Full name")).toHaveValue("Lot");
  expect(screen.getByAltText("Your profile photo")).toBeVisible();
});
it("announces validation and oversized upload errors", async () => {
  render(<ProfileEditor initial={user} />);
  fireEvent.change(screen.getByLabelText("Full name"), { target: { value: " " } });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  expect(await screen.findByText("Enter your name.")).toBeVisible();
  fireEvent.change(screen.getByLabelText("Replace photo"), {
    target: { files: [new File([new Uint8Array(2097153)], "big.png", { type: "image/png" })] },
  });
  expect(await screen.findByText("Choose a photo smaller than 2 MB.")).toBeVisible();
  expect(updateProfile).not.toHaveBeenCalled();
});
it("retains edits on failed save and allows a successful retry with confirmation", async () => {
  vi.mocked(updateProfile)
    .mockResolvedValueOnce({ error: "Network unavailable. Retry." })
    .mockResolvedValueOnce({ user: { ...user, name: "Updated" } });
  render(<ProfileEditor initial={user} />);
  fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Updated" } });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Network unavailable");
  expect(screen.getByLabelText("Full name")).toHaveValue("Updated");
  await waitFor(() => expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  expect(await screen.findByRole("status")).toHaveTextContent("Profile changes saved.");
});
it("queues removal until save and prevents duplicate submissions", async () => {
  let finish!: (v: Awaited<ReturnType<typeof updateProfile>>) => void;
  vi.mocked(updateProfile).mockImplementation(
    () =>
      new Promise((r) => {
        finish = r;
      }),
  );
  render(<ProfileEditor initial={user} />);
  fireEvent.click(screen.getByRole("button", { name: "Remove photo" }));
  expect(updateProfile).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  expect(screen.getByRole("button", { name: "Saving profile…" })).toBeDisabled();
  expect(updateProfile).toHaveBeenCalledWith(expect.objectContaining({ id: "owner" }), {
    file: undefined,
    remove: true,
  });
  const { avatar: _avatar, ...withoutPhoto } = user;
  finish({ user: withoutPhoto });
  expect(await screen.findByText("Profile changes saved.")).toBeVisible();
});
it("allows removing a saved photo even if its signed preview is unavailable", () => {
  const { avatar: _avatar, ...withoutPhoto } = user;
  render(<ProfileEditor initial={{ ...withoutPhoto, avatarPath: "owner/photo.jpg" }} />);
  expect(screen.getByText(/saved photo couldn't load/)).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Remove photo" }));
  expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled();
});
