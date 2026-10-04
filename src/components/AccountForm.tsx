import { useState } from "react";
import { z } from "zod";
import type { User } from "@/lib/store";

const schema = z.object({
  username: z.string().trim().min(3, "At least 3 characters").max(30),
  password: z.string().min(6, "At least 6 characters").max(100),
  name: z.string().trim().min(1, "Required").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  school: z.string().trim().min(1, "Required").max(120),
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

export function AccountForm({ initial, submitLabel, onSubmit }: { initial?: User; submitLabel: string; onSubmit: (u: User) => void }) {
  const [v, setV] = useState<Partial<User>>(initial ?? {});
  const [err, setErr] = useState<Record<string, string>>({});
  const requiredFilled = fields.filter((f) => f.required).every((f) => String(v[f.key] ?? "").trim());

  const onFile = (file?: File) => {
    if (!file || file.size > 1_000_000) return;
    const r = new FileReader();
    r.onload = () => setV((p) => ({ ...p, avatar: String(r.result) }));
    r.readAsDataURL(file);
  };

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
        onSubmit(res.data as User);
      }}
    >
      <div className="flex items-center gap-4 md:col-span-2">
        <div className="grid size-20 place-items-center overflow-hidden rounded-full bg-primary/10 font-display text-2xl text-primary">
          {v.avatar ? <img src={v.avatar} alt="Profile" className="size-full object-cover" /> : (v.name?.[0] ?? "?")}
        </div>
        <label className="cursor-pointer rounded-full bg-secondary px-4 py-2 text-sm font-medium ring-1 ring-border">
          Upload photo (optional)
          <input type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
      </div>
      {fields.map((f) => (
        <label key={f.key} className="block text-sm">
          <span className="font-medium">{f.label}{f.required && <span className="text-accent"> *</span>}</span>
          <input type={f.type ?? "text"} value={String(v[f.key] ?? "")} onChange={(e) => setV({ ...v, [f.key]: e.target.value })}
            className="mt-1 h-11 w-full rounded-lg bg-glass/80 px-3 ring-1 ring-border outline-none focus:ring-2 focus:ring-ring" />
          {err[f.key] && <span className="mt-1 block text-xs text-destructive">{err[f.key]}</span>}
        </label>
      ))}
      <div className="flex items-center gap-3 md:col-span-2">
        <button type="submit" disabled={!requiredFilled} className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50">{submitLabel}</button>
        <span className="text-xs text-muted-foreground">* required</span>
      </div>
    </form>
  );
}
