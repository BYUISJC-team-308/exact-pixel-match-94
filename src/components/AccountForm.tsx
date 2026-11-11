import { useState } from "react";
import { z } from "zod";
import type { User } from "@/lib/store";

export const UTAH_VALLEY_SCHOOLS = ["BYU", "UVU"] as const;
export type UtahValleySchool = (typeof UTAH_VALLEY_SCHOOLS)[number];

const schema = z.object({
  username: z.string().trim().min(3, "At least 3 characters").max(30),
  password: z.string().min(6, "At least 6 characters").max(100).optional(),
  name: z.string().trim().min(1, "Required").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  school: z.enum(UTAH_VALLEY_SCHOOLS, {
    errorMap: () => ({ message: "Please select a school (BYU or UVU)" }),
  }),
  phone: z.string().trim().max(20).optional(),
  avatar: z.string().optional(),
});

const fields: { key: keyof User; label: string; type?: string; required: boolean }[] = [
  { key: "username", label: "Username", required: true },
  { key: "password", label: "Password", type: "password", required: true },
  { key: "name", label: "Full name", required: true },
  { key: "email", label: "Email", type: "email", required: true },
  { key: "school", label: "School", required: true },
  { key: "phone", label: "Phone number", type: "tel", required: false },
];

export function AccountForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: User;
  submitLabel: string;
  onSubmit: (u: User) => void | string | null | Promise<void | string | null>;
}) {
  const editing = !!initial;
  const [v, setV] = useState<Partial<User>>(() => {
    if (!initial) return {};
    const normSchool = UTAH_VALLEY_SCHOOLS.find(
      (s) => s.toLowerCase() === initial.school?.toLowerCase()
    );
    return { ...initial, school: normSchool ?? initial.school };
  });
  const [err, setErr] = useState<Record<string, string>>({});
  const [formErr, setFormErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const visible = fields.filter((f) => !(editing && f.key === "password"));
  const requiredFilled = visible
    .filter((f) => f.required)
    .every((f) => {
      const val = String(v[f.key] ?? "").trim();
      if (f.key === "school") {
        return (UTAH_VALLEY_SCHOOLS as readonly string[]).includes(val);
      }
      return Boolean(val);
    });

  const onFile = (file?: File) => {
    if (!file || file.size > 1_000_000) return;
    const r = new FileReader();
    r.onload = () => setV((p) => ({ ...p, avatar: String(r.result) }));
    r.readAsDataURL(file);
  };

  return (
    <form
      className="glass grid gap-4 p-4 sm:p-6 md:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const res = schema.safeParse(v);
        if (!res.success) {
          setErr(Object.fromEntries(res.error.issues.map((i) => [String(i.path[0]), i.message])));
          return;
        }
        setErr({});
        setFormErr(null);
        setBusy(true);
        const msg = await onSubmit(res.data as User);
        setBusy(false);
        if (typeof msg === "string") setFormErr(msg);
      }}
    >
      <div className="flex flex-wrap items-center gap-4 md:col-span-2">
        <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/10 font-display text-2xl text-primary">
          {v.avatar ? <img src={v.avatar} alt="Profile" className="size-full object-cover" /> : (v.name?.[0] ?? "?")}
        </div>
        <label className="cursor-pointer rounded-full bg-secondary px-4 py-2 text-sm font-medium ring-1 ring-border focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary">
          Upload photo (optional)
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
      </div>
      {visible.map((f) => (
        <label key={f.key} htmlFor={f.key} className="block text-sm">
          <span className="font-medium">
            {f.label}
            {f.required && <span className="text-accent"> *</span>}
          </span>
          {f.key === "school" ? (
            <select
              id={f.key}
              name={f.key}
              aria-label="School"
              value={String(v[f.key] ?? "")}
              onChange={(e) => setV({ ...v, [f.key]: e.target.value })}
              className="mt-1 h-11 w-full rounded-lg bg-glass/80 px-3 ring-1 ring-border outline-none focus:ring-2 focus:ring-ring text-foreground"
            >
              <option value="" disabled>
                Select your school
              </option>
              {UTAH_VALLEY_SCHOOLS.map((school) => (
                <option key={school} value={school}>
                  {school}
                </option>
              ))}
            </select>
          ) : (
            <input
              id={f.key}
              name={f.key}
              type={f.type ?? "text"}
              autoComplete={f.key === "password" ? "new-password" : f.key === "phone" ? "tel" : f.key}
              value={String(v[f.key] ?? "")}
              onChange={(e) => setV({ ...v, [f.key]: e.target.value })}
              disabled={editing && f.key === "email"}
              className="mt-1 h-11 w-full rounded-lg bg-glass/80 px-3 ring-1 ring-border outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
            />
          )}
          {err[f.key] && <span className="mt-1 block text-xs text-destructive">{err[f.key]}</span>}
        </label>
      ))}
      {formErr && <p className="text-xs text-destructive md:col-span-2">{formErr}</p>}
      <div className="flex items-center gap-3 md:col-span-2">
        <button
          type="submit"
          disabled={!requiredFilled || busy}
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {busy ? (editing ? "Saving profile…" : "Creating account…") : submitLabel}
        </button>
        <span className="text-xs text-muted-foreground">* required</span>
      </div>
    </form>
  );
}
