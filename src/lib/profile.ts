import { z } from "zod";
import { supabase } from "@/lib/supabase";
import type { User } from "@/lib/store";

export const AVATAR_BUCKET = "profile-avatars";
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const extensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
export const profileSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Use at least 3 characters.")
    .max(30, "Use 30 characters or fewer."),
  name: z.string().trim().min(1, "Enter your name.").max(100, "Use 100 characters or fewer."),
  phone: z
    .string()
    .trim()
    .max(20, "Use 20 characters or fewer.")
    .refine(
      (v) => !v || (/^[+\d\s().-]+$/.test(v) && v.replace(/\D/g, "").length >= 7),
      "Enter a phone number with at least 7 digits.",
    )
    .default(""),
});
export type PhotoChange = { file?: File | undefined; remove?: boolean };
export type ProfileRow = {
  username: string;
  full_name: string | null;
  email: string | null;
  school: string;
  phone: string | null;
  avatar_url: string | null;
};

export function avatarFileError(file: File): string | null {
  if (!extensions[file.type]) return "Choose a JPG, PNG, or WebP photo.";
  if (!file.size) return "This photo is empty. Choose another file.";
  if (file.size > MAX_AVATAR_BYTES) return "Choose a photo smaller than 2 MB.";
  return null;
}

// Only our storage paths may be signed or deleted; legacy URLs/data images remain readable.
export function ownedAvatarPath(value: string | null | undefined, id: string): string | null {
  return value?.startsWith(`${id}/`) && /^[\w-]+\/[\w-]+\.(jpg|png|webp)$/.test(value)
    ? value
    : null;
}

export async function profileUser(row: ProfileRow, id: string, email?: string): Promise<User> {
  const path = ownedAvatarPath(row.avatar_url, id);
  let avatar = path ? undefined : (row.avatar_url ?? undefined);
  if (path) {
    try {
      const { data } = await supabase.storage
        .from(AVATAR_BUCKET)
        .createSignedUrl(path, 7 * 24 * 60 * 60);
      avatar = data?.signedUrl;
    } catch {
      /* The profile remains usable if photo delivery is unavailable. */
    }
  }
  return {
    id,
    username: row.username,
    name: row.full_name ?? row.username,
    email: email ?? row.email ?? "",
    school: row.school,
    ...(row.phone ? { phone: row.phone } : {}),
    ...(avatar ? { avatar } : {}),
    ...(path ? { avatarPath: path } : {}),
  };
}

export async function saveProfile(
  input: User,
  change: PhotoChange = {},
): Promise<{ user: User; warning?: string }> {
  const values = profileSchema.parse(input);
  if (change.file) {
    const error = avatarFileError(change.file);
    if (error) throw new Error(error);
  }
  const { data: identity, error: identityError } = await supabase.auth.getUser();
  const id = identity.user?.id;
  if (identityError) {
    const expired =
      identityError.name === "AuthSessionMissingError" ||
      identityError.status === 401 ||
      identityError.status === 403;
    throw new Error(
      expired
        ? "You're signed out. Sign in again, then retry."
        : "We couldn't verify your sign-in. Check your connection and retry.",
    );
  }
  if (!id) throw new Error("You're signed out. Sign in again, then retry.");
  if (input.id && input.id !== id)
    throw new Error("Your account changed. Reload this page before saving.");
  const { data: old, error: readError } = await supabase
    .from("profiles")
    .select("username,full_name,email,school,phone,avatar_url")
    .eq("id", id)
    .single();
  if (readError || !old)
    throw new Error("We couldn't load your profile. Your changes haven't been saved. Try again.");
  let nextAvatar = old.avatar_url;
  let uploaded: string | undefined;
  if (change.file) {
    uploaded = `${id}/${crypto.randomUUID()}.${extensions[change.file.type]}`;
    const { error } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(uploaded, change.file, { contentType: change.file.type, upsert: false });
    if (error)
      throw new Error(`Photo upload failed. Your current photo is unchanged. ${error.message}`);
    nextAvatar = uploaded;
  } else if (change.remove) nextAvatar = null;

  // Keep the old object until the database confirms the new reference. Never trust caller email/school/avatar.
  const { data: saved, error } = await supabase
    .from("profiles")
    .update({
      username: values.username,
      full_name: values.name,
      phone: values.phone || null,
      ...(change.file || change.remove ? { avatar_url: nextAvatar } : {}),
    })
    .eq("id", id)
    .select("username,full_name,email,school,phone,avatar_url")
    .single();
  if (error || !saved) {
    // For a rejected write the new upload is unused. Ambiguous transport errors may have committed:
    // retain that object rather than risk deleting a photo that is now referenced.
    if (uploaded && error?.code && /^\d|^PGRST/.test(error.code)) {
      await supabase.storage
        .from(AVATAR_BUCKET)
        .remove([uploaded])
        .catch(() => {});
    }
    throw new Error(
      error?.code === "23505"
        ? "That username is already taken. Choose another one."
        : "We couldn't confirm your profile was saved. Your edits are still here. Retry, or reload to check the saved version.",
    );
  }
  let warning: string | undefined;
  const oldPath = ownedAvatarPath(old.avatar_url, id);
  if (oldPath && oldPath !== nextAvatar) {
    try {
      const { error: cleanupError } = await supabase.storage.from(AVATAR_BUCKET).remove([oldPath]);
      if (cleanupError)
        warning =
          "Profile saved. The previous photo could not be deleted from storage. Contact support if you need help removing it.";
    } catch {
      warning =
        "Profile saved. The previous photo could not be deleted from storage. Contact support if you need help removing it.";
    }
  }
  const user = await profileUser(saved as ProfileRow, id, identity.user?.email);
  if (uploaded && !user.avatar)
    warning = "Profile saved, but the photo preview could not load. Reload to try again.";
  return { user, ...(warning ? { warning } : {}) };
}
