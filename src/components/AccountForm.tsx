import { useState } from "react";
import { z } from "zod";
import type { User } from "@/lib/store";

export type AccountInput = Omit<User, "id"> & { password?: string };

const schema = z.object({
  username: z.string().trim().min(3, "At least 3 characters").max(30),
  password: z.string().min(8, "At least 8 characters").max(100).optional(),
  name: z.string().trim().min(1, "Required").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  school: z.string().trim().min(1, "Required").max(120),
  phone: z.string().trim().max(20).optional(),
  avatar: z.string().optional(),
});

const fields: { key: keyof AccountInput; label: string; type?: string; required: boolean }[] = [
  { key: "username", label: "Username", required: true },
  { key: "name", label: "Full name", required: true },
  { key: "email", label: "Email", type: "email", required: true },
  { key: "school", label: "School", required: true },
  { key: "phone", label: "Phone number", type: "tel", required: false },
];

export function AccountForm({ initial, submitLabel, onSubmit, requirePassword = false }: { initial?: User; submitLabel: string; onSubmit: (u: AccountInput) => void; requirePassword?: boolean }) {
  const [v, setV] = useState<Partial<AccountInput>>(initial ?? {});
  const [err, setErr] = useState<Record<string, string>>({});
  const requiredFilled = fields.filter((f) => f.required).every((f) => String(v[f.key] ?? "").trim()) && (!requirePassword || Boolean(v.password));

  return (
    <form
      className="glass grid gap-4 p-6 md:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const res = schema.safeParse(v);
        if (!res.success) {
          setErr(Object.fromEntries(res.error.issues.map((i) => [String(i.path[0]), i.message])));
          return;
        }
        setErr({});
        if (requirePassword && !res.data.password) {
          setErr({ password: "Required" });
          return;
        }
        onSubmit(res.data as AccountInput);
      }}
    >
      <div className="flex items-center gap-4 md:col-span-2">
        <div className="grid size-20 place-items-center overflow-hidden rounded-full bg-primary/10 font-display text-2xl text-primary">
          {v.avatar ? <img src={v.avatar} alt="Profile" className="size-full object-cover" /> : (v.name?.[0] ?? "?")}
        </div>
      </div>
      {fields.map((f) => (
        <label key={f.key} className="block text-sm">
          <span className="font-medium">{f.label}{f.required && <span className="text-accent"> *</span>}</span>
          <input type={f.type ?? "text"} value={String(v[f.key] ?? "")} readOnly={Boolean(initial && f.key === "email")} onChange={(e) => setV({ ...v, [f.key]: e.target.value })}
            className="mt-1 h-11 w-full rounded-lg bg-glass/80 px-3 ring-1 ring-border outline-none focus:ring-2 focus:ring-ring" />
          {err[f.key] && <span className="mt-1 block text-xs text-destructive">{err[f.key]}</span>}
        </label>
      ))}
      {requirePassword && (
        <label className="block text-sm">
          <span className="font-medium">Password <span className="text-accent">*</span></span>
          <input type="password" autoComplete="new-password" value={v.password ?? ""} onChange={(e) => setV({ ...v, password: e.target.value })}
            className="mt-1 h-11 w-full rounded-lg bg-glass/80 px-3 ring-1 ring-border outline-none focus:ring-2 focus:ring-ring" />
          {err["password"] && <span className="mt-1 block text-xs text-destructive">{err["password"]}</span>}
        </label>
      )}
      <div className="flex items-center gap-3 md:col-span-2">
        <button type="submit" disabled={!requiredFilled} className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50">{submitLabel}</button>
        <span className="text-xs text-muted-foreground">* required</span>
      </div>
    </form>
  );
}
