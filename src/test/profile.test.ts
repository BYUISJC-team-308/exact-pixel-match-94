import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  getUser: vi.fn(),
  single: vi.fn(),
  update: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  sign: vi.fn(),
}));
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: { getUser: m.getUser },
    from: () => ({
      select: () => ({ eq: () => ({ single: m.single }) }),
      update: (...args: unknown[]) => {
        m.update(...args);
        return { eq: () => ({ select: () => ({ single: m.single }) }) };
      },
    }),
    storage: { from: () => ({ upload: m.upload, remove: m.remove, createSignedUrl: m.sign }) },
  },
}));
import { avatarFileError, ownedAvatarPath, profileUser, saveProfile } from "@/lib/profile";
const id = "00000000-0000-4000-8000-000000000001";
const row = {
  username: "lot",
  full_name: "Lot",
  phone: null,
  school: "BYU",
  email: "provider@example.com",
  avatar_url: `${id}/old.jpg`,
};
const input = {
  id,
  username: "newlot",
  name: "Lot Updated",
  phone: "801 555 0101",
  school: "UVU",
  email: "forged@example.com",
  avatar: "https://untrusted.example/a.png",
};
const photo = () => new File(["test image"], "photo.png", { type: "image/png" });
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("crypto", { randomUUID: () => "new" });
  m.getUser.mockResolvedValue({ data: { user: { id, email: "provider@example.com" } } });
  m.single
    .mockResolvedValueOnce({ data: row })
    .mockResolvedValueOnce({ data: { ...row, username: "newlot", avatar_url: `${id}/new.png` } });
  m.upload.mockResolvedValue({});
  m.remove.mockResolvedValue({});
  m.sign.mockResolvedValue({ data: { signedUrl: "https://signed.example/photo" } });
});
it("validates unsupported, empty and oversized photos before upload", () => {
  expect(avatarFileError(new File(["svg"], "x.svg", { type: "image/svg+xml" }))).toMatch(/JPG/);
  expect(avatarFileError(new File([], "x.jpg", { type: "image/jpeg" }))).toMatch(/empty/);
  expect(
    avatarFileError(new File([new Uint8Array(2097153)], "x.jpg", { type: "image/jpeg" })),
  ).toMatch(/2 MB/);
});
it("uses provider identity and existing school, saves storage reference then retires old photo", async () => {
  const result = await saveProfile(input, { file: photo() });
  expect(m.upload).toHaveBeenCalledWith(
    `${id}/new.png`,
    expect.any(File),
    expect.objectContaining({ upsert: false }),
  );
  expect(m.update).toHaveBeenCalledWith({
    username: "newlot",
    full_name: "Lot Updated",
    phone: "801 555 0101",
    avatar_url: `${id}/new.png`,
  });
  expect(m.remove).toHaveBeenCalledWith([`${id}/old.jpg`]);
  expect(m.single.mock.invocationCallOrder[1]).toBeLessThan(m.remove.mock.invocationCallOrder[0]!);
  expect(result.user).toMatchObject({
    id,
    email: "provider@example.com",
    school: "BYU",
    avatarPath: `${id}/new.png`,
  });
});
it("keeps the old reference when upload fails", async () => {
  m.upload.mockResolvedValue({ error: { message: "Offline" } });
  await expect(saveProfile(input, { file: photo() })).rejects.toThrow(/upload failed/);
  expect(m.update).not.toHaveBeenCalled();
  expect(m.remove).not.toHaveBeenCalled();
});
it("cleans a rejected replacement upload without deleting the existing photo", async () => {
  m.single
    .mockReset()
    .mockResolvedValueOnce({ data: row })
    .mockResolvedValueOnce({ error: { code: "23505" } });
  await expect(saveProfile(input, { file: photo() })).rejects.toThrow(/username is already taken/);
  expect(m.remove).toHaveBeenCalledExactlyOnceWith([`${id}/new.png`]);
});
it("keeps the uploaded file after an ambiguous response to avoid deleting a committed photo", async () => {
  m.single
    .mockReset()
    .mockResolvedValueOnce({ data: row })
    .mockResolvedValueOnce({ error: { message: "Network error" } });
  await expect(saveProfile(input, { file: photo() })).rejects.toThrow(/couldn't confirm/);
  expect(m.remove).not.toHaveBeenCalled();
});
it("removes the reference before the old object and reports cleanup errors honestly", async () => {
  m.single
    .mockReset()
    .mockResolvedValueOnce({ data: row })
    .mockResolvedValueOnce({ data: { ...row, avatar_url: null } });
  m.remove.mockResolvedValue({ error: { message: "Offline" } });
  const result = await saveProfile(input, { remove: true });
  expect(m.update).toHaveBeenCalledWith(expect.objectContaining({ avatar_url: null }));
  expect(result.user.avatar).toBeUndefined();
  expect(result.warning).toMatch(/could not be deleted/);
});
it("rejects expired sessions and switched accounts before writing or uploading", async () => {
  m.getUser.mockResolvedValueOnce({ data: { user: null } });
  await expect(saveProfile(input)).rejects.toThrow(/signed out/);
  await expect(saveProfile({ ...input, id: "someone-else" })).rejects.toThrow(/account changed/);
  expect(m.update).not.toHaveBeenCalled();
  expect(m.upload).not.toHaveBeenCalled();
});
it("never signs or deletes another owner's path or a legacy URL", async () => {
  expect(ownedAvatarPath("other/old.jpg", id)).toBeNull();
  expect(ownedAvatarPath(`${id}/../other.jpg`, id)).toBeNull();
  const result = await profileUser({ ...row, avatar_url: "https://legacy.example/avatar" }, id);
  expect(result.avatar).toBe("https://legacy.example/avatar");
  expect(m.sign).not.toHaveBeenCalled();
});
it("preserves profile access when signed-photo delivery fails", async () => {
  m.sign.mockRejectedValue(new Error("offline"));
  expect(await profileUser(row, id)).toMatchObject({
    username: "lot",
    avatarPath: `${id}/old.jpg`,
  });
});
it("leaves photo references untouched when only profile fields change", async () => {
  m.single.mockReset().mockResolvedValueOnce({ data: row }).mockResolvedValueOnce({ data: row });
  await saveProfile(input);
  expect(m.update).toHaveBeenCalledWith({
    username: "newlot",
    full_name: "Lot Updated",
    phone: "801 555 0101",
  });
  expect(m.upload).not.toHaveBeenCalled();
  expect(m.remove).not.toHaveBeenCalled();
});
