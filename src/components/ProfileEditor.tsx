import { useEffect, useRef, useState } from "react";
import { updateProfile } from "@/lib/auth";
import { avatarFileError, profileSchema } from "@/lib/profile";
import type { User } from "@/lib/store";

export function ProfileEditor({ initial }: { initial: User }) {
  const [baseline, setBaseline] = useState(initial);
  const [values, setValues] = useState({
    username: initial.username,
    name: initial.name,
    phone: initial.phone ?? "",
  });
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState<string>();
  const [remove, setRemove] = useState(false);
  const [errors, setErrors] = useState<
    Partial<Record<"name" | "username" | "phone" | "photo" | "form", string>>
  >({});
  const [message, setMessage] = useState("");
  const [warning, setWarning] = useState("");
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const request = useRef(0);
  const picker = useRef<HTMLInputElement>(null);
  const errorSummary = useRef<HTMLParagraphElement>(null);
  useEffect(
    () => () => {
      request.current++;
    },
    [],
  );
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  const dirty =
    !!file ||
    remove ||
    Object.entries(values).some(([k, value]) => value !== (baseline[k as keyof User] ?? ""));
  const avatar = remove ? undefined : (preview ?? baseline.avatar);
  const clearFeedback = () => {
    setMessage("");
    setWarning("");
  };
  const reset = () => {
    request.current++;
    setValues({ username: baseline.username, name: baseline.name, phone: baseline.phone ?? "" });
    setFile(undefined);
    setPreview(undefined);
    setRemove(false);
    setErrors({});
    setReading(false);
    clearFeedback();
    if (picker.current) picker.current.value = "";
  };

  return (
    <form
      className="rounded-3xl border-2 border-border bg-card p-4 sm:p-6"
      noValidate
      aria-label="Edit profile"
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy || reading) return;
        const parsed = profileSchema.safeParse(values);
        if (!parsed.success) {
          setErrors(
            Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])),
          );
          return;
        }
        setBusy(true);
        setErrors({});
        clearFeedback();
        try {
          const result = await updateProfile({ ...baseline, ...parsed.data }, { file, remove });
          if (result.error) {
            setErrors({ form: result.error });
            requestAnimationFrame(() => errorSummary.current?.focus());
          } else if (result.user) {
            setBaseline(result.user);
            setValues({
              username: result.user.username,
              name: result.user.name,
              phone: result.user.phone ?? "",
            });
            setFile(undefined);
            setPreview(undefined);
            setRemove(false);
            if (picker.current) picker.current.value = "";
            setMessage("Profile changes saved.");
            setWarning(result.warning ?? "");
          }
        } catch {
          setErrors({
            form: "We couldn't save your profile. Your edits are still here. Try again.",
          });
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2 className="text-xl font-semibold">Edit profile</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Update your name, username, phone, and photo.
      </p>
      <fieldset disabled={busy} className="mt-5 min-w-0 space-y-5 disabled:opacity-70">
        <legend className="sr-only">Profile fields and photo</legend>
        <div className="flex flex-wrap items-center gap-4">
          <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/10 text-2xl font-semibold text-primary">
            {avatar ? (
              <img src={avatar} alt="Your profile photo" className="size-full object-cover" />
            ) : (
              <span aria-label="No profile photo">{values.name[0] || "?"}</span>
            )}
          </div>
          <div className="min-w-0 flex-1 basis-52">
            <label className="inline-flex min-h-11 cursor-pointer items-center rounded-full bg-secondary px-4 text-sm font-medium ring-1 ring-border focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary">
              {avatar ? "Replace photo" : "Choose photo"}
              <input
                ref={picker}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-describedby="photo-help photo-error"
                className="sr-only"
                onChange={(event) => {
                  const selected = event.target.files?.[0];
                  event.target.value = "";
                  if (!selected) return;
                  const token = ++request.current;
                  setReading(false);
                  clearFeedback();
                  const error = avatarFileError(selected);
                  if (error) {
                    setErrors((e) => ({ ...e, photo: error }));
                    return;
                  }
                  setReading(true);
                  const url = URL.createObjectURL(selected);
                  const image = new Image();
                  image.onload = () => {
                    if (request.current !== token) {
                      URL.revokeObjectURL(url);
                      return;
                    }
                    if (image.naturalWidth * image.naturalHeight > 25_000_000) {
                      URL.revokeObjectURL(url);
                      setErrors((e) => ({
                        ...e,
                        photo: "Choose a photo smaller than 25 megapixels.",
                      }));
                    } else {
                      setPreview(url);
                      setFile(selected);
                      setRemove(false);
                      setErrors((e) => ({ ...e, photo: "" }));
                    }
                    setReading(false);
                  };
                  image.onerror = () => {
                    URL.revokeObjectURL(url);
                    if (request.current === token) {
                      setErrors((e) => ({
                        ...e,
                        photo: "We couldn't read this photo. Choose another JPG, PNG, or WebP.",
                      }));
                      setReading(false);
                    }
                  };
                  image.src = url;
                }}
              />
            </label>
            {(avatar || baseline.avatarPath) && (
              <button
                type="button"
                className="ml-2 min-h-11 rounded-full px-3 text-sm font-medium text-primary underline focus-visible:outline-2"
                onClick={() => {
                  request.current++;
                  setReading(false);
                  setRemove(true);
                  setFile(undefined);
                  setPreview(undefined);
                  clearFeedback();
                  setErrors((e) => ({ ...e, photo: "" }));
                }}
              >
                Remove photo
              </button>
            )}
            <p id="photo-help" className="mt-2 text-xs text-muted-foreground">
              JPG, PNG, or WebP. Up to 2 MB. Changes apply when you save.
            </p>
            {baseline.avatarPath && !baseline.avatar && !file && !remove && (
              <p role="status" className="mt-2 text-sm">
                Your saved photo couldn't load. Reload to retry, or choose a replacement.
              </p>
            )}
            <p
              id="photo-error"
              role={errors.photo ? "alert" : undefined}
              className="mt-1 text-sm text-destructive"
            >
              {errors.photo}
            </p>
            {reading && (
              <p role="status" className="text-sm">
                Checking photo…
              </p>
            )}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              { key: "name", label: "Full name", autoComplete: "name" },
              { key: "username", label: "Username", autoComplete: "username" },
              { key: "phone", label: "Phone number (optional)", autoComplete: "tel" },
            ] as const
          ).map(({ key, label, autoComplete }) => (
            <div key={key}>
              <label htmlFor={`profile-${key}`} className="text-sm font-medium">
                {label}
              </label>
              <input
                id={`profile-${key}`}
                value={values[key]}
                type={key === "phone" ? "tel" : "text"}
                autoComplete={autoComplete}
                required={key !== "phone"}
                maxLength={key === "name" ? 100 : key === "username" ? 30 : 20}
                aria-invalid={!!errors[key]}
                aria-describedby={errors[key] ? `${key}-error` : undefined}
                className="mt-1 h-11 w-full min-w-0 rounded-lg bg-background px-3 ring-1 ring-border focus:outline-2 focus:outline-primary"
                onChange={(e) => {
                  setValues({ ...values, [key]: e.target.value });
                  setErrors((old) => ({ ...old, [key]: "" }));
                  clearFeedback();
                }}
              />
              {errors[key] && (
                <p id={`${key}-error`} role="alert" className="mt-1 text-sm text-destructive">
                  {errors[key]}
                </p>
              )}
            </div>
          ))}
        </div>
        <div className="rounded-xl bg-secondary/50 p-3 text-sm">
          <p className="font-medium">Account details</p>
          <p className="mt-1 break-all">Email: {baseline.email || "Not available"}</p>
          <p className="mt-1">School: {baseline.school || "Not set"}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Email is managed by your sign-in provider. School and interests are managed separately
            from profile editing.
          </p>
        </div>
        {errors.form && (
          <p ref={errorSummary} tabIndex={-1} role="alert" className="text-sm text-destructive">
            {errors.form}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={!dirty || busy || reading}
            className="min-h-11 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Saving profile…" : "Save changes"}
          </button>
          <button
            type="button"
            disabled={!dirty && !errors.photo}
            onClick={reset}
            className="min-h-11 rounded-full bg-secondary px-5 py-2.5 text-sm font-medium ring-1 ring-border disabled:opacity-50"
          >
            Cancel changes
          </button>
        </div>
      </fieldset>
      <div aria-live="polite" role="status" className="mt-3 text-sm text-primary">
        {message}
      </div>
      {warning && (
        <p role="alert" className="mt-2 text-sm">
          {warning}
        </p>
      )}
    </form>
  );
}
