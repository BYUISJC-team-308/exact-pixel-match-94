import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useStore } from "@/lib/store";
import { Modal } from "@/components/ui-bits";
import { MaintenanceActions } from "@/components/MaintenanceActions";
import {
  recordTables,
  recordRequest,
  userRequest,
  recordValues,
  fieldLabel,
  recordTitle,
  type RecordTable,
  type RecordPage,
  type RecordRow,
  type ManagedUser,
} from "@/lib/maintenance";
export const Route = createFileRoute("/maintain")({
  validateSearch: (s: Record<string, unknown>): { view: "users" | "records" } => ({
    view: s["view"] === "users" ? "users" : "records",
  }),
  component: MaintenancePage,
  head: () => ({
    meta: [
      { title: "Maintain Users & Records — Student Steals" },
      { name: "robots", content: "noindex" },
    ],
  }),
});
const button =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-card px-4 py-2 font-semibold disabled:opacity-50";
const control =
  "mt-1 min-h-11 w-full min-w-0 rounded-lg border border-border bg-background p-3 text-base";
export function MaintenancePage() {
  const { authReady, user } = useStore();
  const { view } = Route.useSearch();
  if (!authReady) return <p role="status">Checking your account…</p>;
  if (!user?.isAdmin)
    return (
      <section className="mx-auto max-w-xl space-y-4">
        <h1 className="text-3xl font-semibold">Administrator access required</h1>
        <p>Sign in with the grading or team administrator account to maintain users and records.</p>
        <Link className={button} to="/signin">
          Sign in
        </Link>
      </section>
    );
  return (
    <div className="mx-auto max-w-5xl">
      <MaintenanceActions />
      <h1 className="mb-5 text-3xl font-semibold">
        {view === "users" ? "Maintain Users" : "Maintain Records"}
      </h1>
      {view === "users" ? <UserMaintenance key={user.id} /> : <RecordMaintenance key={user.id} />}
    </div>
  );
}
function Feedback({ error, message }: { error: string; message: string }) {
  return (
    <>
      {error && (
        <p role="alert" className="rounded-lg border border-destructive p-3">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="rounded-lg bg-primary/10 p-3">
          {message}
        </p>
      )}
    </>
  );
}
export function RecordMaintenance() {
  const router = useRouter();
  const cache = useQueryClient();
  const [table, setTable] = useState<RecordTable>("deals");
  const [page, setPage] = useState(0);
  const [editor, setEditor] = useState<{
    row: RecordRow | null;
    draft: Record<string, string>;
  } | null>(null);
  const [deleting, setDeleting] = useState<RecordRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const query = useQuery<RecordPage>({
    gcTime: 0,
    queryKey: ["maintain-records", table, page],
    queryFn: () => recordRequest(table, "list", { p_page: page }),
  });
  const fields = query.data?.fields ?? [];
  async function mutate(action: string, options: Record<string, unknown>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await recordRequest(table, action, options);
      setEditor(null);
      setDeleting(null);
      setMessage(action === "delete" ? "Record deleted." : "Record saved.");
      await router.invalidate();
      await Promise.all(
        [
          "maintain-records",
          "deals_list",
          "food_events",
          "starving_student_offers",
          "campus_buildings",
          "campuses",
          "map_campuses",
          "map_campus_buildings",
        ].map((key) => cache.invalidateQueries({ queryKey: [key] })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "The record could not be saved.");
    } finally {
      setBusy(false);
    }
  }
  function save(e: FormEvent) {
    e.preventDefault();
    if (!editor) return;
    try {
      const values = recordValues(fields, editor.draft, !editor.row);
      void mutate(editor.row ? "update" : "create", {
        p_id: editor.row?.id ?? null,
        p_values: values,
        p_original: editor.row,
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <section className="space-y-4">
      <p>
        Manage the discounts, events, card offers, and campus information shown on Student Steals.
      </p>
      <nav aria-label="Record tables" className="flex flex-wrap gap-2">
        {Object.entries(recordTables).map(([key, label]) => (
          <button
            key={key}
            className={`${button} ${table === key ? "bg-primary text-primary-foreground" : ""}`}
            aria-pressed={table === key}
            onClick={() => {
              setTable(key as RecordTable);
              setPage(0);
              setError("");
              setMessage("");
            }}
          >
            Maintain {label}
          </button>
        ))}
      </nav>
      {!editor && !deleting && <Feedback error={error} message={message} />}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{recordTables[table]}</h2>
        <button
          disabled={!query.data || query.isFetching}
          className={button}
          onClick={() => {
            setError("");
            setEditor({ row: null, draft: {} });
          }}
        >
          Create record
        </button>
      </div>
      {query.isPending ? (
        <p role="status">Loading records…</p>
      ) : query.isError ? (
        <div role="alert">
          <p>{query.error.message}</p>
          <button className={button} onClick={() => void query.refetch()}>
            Try again
          </button>
        </div>
      ) : (
        <>
          <p role="status" className="text-sm">
            {query.data.total} records · Page {page + 1}
          </p>
          {!query.data.rows.length && (
            <p>No records on this page. Create a record or return to the previous page.</p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {query.data.rows.map((row) => (
              <article
                key={row.id}
                className="min-w-0 space-y-3 rounded-xl border border-border bg-card p-4"
              >
                <h3 className="break-words font-semibold">{recordTitle(row)}</h3>
                <details>
                  <summary className="min-h-11 cursor-pointer py-2 font-medium">
                    Display record
                  </summary>
                  <dl className="space-y-2">
                    {Object.entries(row).map(([key, value]) => (
                      <div key={key}>
                        <dt className="text-sm font-semibold">{fieldLabel(key)}</dt>
                        <dd className="whitespace-pre-wrap break-words text-sm">
                          {value === null
                            ? "Not set"
                            : typeof value === "object"
                              ? JSON.stringify(value, null, 2)
                              : String(value)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </details>
                <div className="flex flex-wrap gap-2">
                  <button
                    className={button}
                    onClick={() => {
                      setError("");
                      setEditor({
                        row,
                        draft: Object.fromEntries(
                          Object.entries(row).map(([key, value]) => [
                            key,
                            value === null
                              ? ""
                              : typeof value === "object"
                                ? JSON.stringify(value)
                                : String(value),
                          ]),
                        ),
                      });
                    }}
                  >
                    Edit record
                  </button>
                  <button
                    className={button}
                    onClick={() => {
                      setError("");
                      setDeleting(row);
                    }}
                  >
                    Delete record
                  </button>
                </div>
              </article>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              className={button}
              disabled={page === 0 || query.isFetching}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous page
            </button>
            <button
              className={button}
              disabled={(page + 1) * 25 >= query.data.total || query.isFetching}
              onClick={() => setPage((p) => p + 1)}
            >
              Next page
            </button>
            <button
              className={button}
              disabled={query.isFetching}
              onClick={() => void query.refetch()}
            >
              Refresh records
            </button>
          </div>
        </>
      )}
      <Modal
        open={Boolean(editor)}
        title={editor?.row ? "Edit record" : "Create record"}
        onClose={() => {
          if (!busy) setEditor(null);
        }}
      >
        {editor && (
          <form onSubmit={save} className="space-y-4">
            <h2 className="text-xl font-semibold">
              {editor.row ? "Edit record" : "Create record"}
            </h2>
            <Feedback error={error} message="" />
            <p className="text-sm">
              Required fields are marked *. Leave optional new fields blank to use database
              defaults. Arrays and objects use JSON.
            </p>
            <fieldset disabled={busy} className="min-w-0 space-y-3">
              {fields
                .filter((f) => !f.readOnly)
                .map((f) => (
                  <label key={f.name} className="block text-sm font-medium">
                    {fieldLabel(f.name)}
                    {!f.nullable && !f.hasDefault ? " *" : ""}
                    {f.options || f.type === "bool" ? (
                      <select
                        className={control}
                        value={editor.draft[f.name] ?? ""}
                        required={!f.nullable && !f.hasDefault}
                        onChange={(e) =>
                          setEditor({
                            ...editor,
                            draft: { ...editor.draft, [f.name]: e.target.value },
                          })
                        }
                      >
                        <option value="">
                          {f.nullable
                            ? "Not set"
                            : f.hasDefault
                              ? "Use default"
                              : "Choose an option"}
                        </option>
                        {(f.options ?? ["true", "false"]).map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    ) : (
                      <textarea
                        rows={f.type === "jsonb" || f.type.startsWith("_") ? 4 : 2}
                        required={!f.nullable && !f.hasDefault}
                        className={control}
                        value={editor.draft[f.name] ?? ""}
                        onChange={(e) =>
                          setEditor({
                            ...editor,
                            draft: { ...editor.draft, [f.name]: e.target.value },
                          })
                        }
                      />
                    )}
                  </label>
                ))}
              <button className={button} type="submit">
                {busy ? "Saving…" : "Save record"}
              </button>
            </fieldset>
          </form>
        )}
      </Modal>
      <Modal
        open={Boolean(deleting)}
        title="Delete record?"
        onClose={() => {
          if (!busy) setDeleting(null);
        }}
      >
        {deleting && (
          <div className="space-y-4">
            <Feedback error={error} message="" />
            <p className="break-words">
              Permanently delete “{recordTitle(deleting)}”? Linked saved items or dependent records
              may also be removed according to database rules.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                disabled={busy}
                className={button}
                onClick={() => void mutate("delete", { p_id: deleting.id, p_original: deleting })}
              >
                {busy ? "Deleting…" : "Permanently delete record"}
              </button>
              <button disabled={busy} className={button} onClick={() => setDeleting(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}
const newUser = { email: "", password: "", username: "", full_name: "", school: "BYU" };
export function UserMaintenance() {
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<{ user: ManagedUser | null; values: typeof newUser } | null>(
    null,
  );
  const [deleting, setDeleting] = useState<ManagedUser | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const cache = useQueryClient();
  const query = useQuery<{ users: ManagedUser[]; hasNext: boolean }>({
    gcTime: 0,
    queryKey: ["maintain-users", page],
    queryFn: () => userRequest("list", { page }),
  });
  async function mutate(action: string, options: Record<string, unknown>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await userRequest(action, options);
      setEditor(null);
      setDeleting(null);
      setMessage(action === "delete" ? "User deleted." : "User saved.");
      await cache.invalidateQueries({ queryKey: ["maintain-users"] });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-4">
      <p>
        Create student accounts, display their details, edit profile fields, or delete an account.
        Email/password changes and administrator accounts stay in Supabase Auth.
      </p>
      {!editor && !deleting && <Feedback error={error} message={message} />}
      <button
        className={button}
        onClick={() => {
          setError("");
          setEditor({ user: null, values: { ...newUser } });
        }}
      >
        Create user
      </button>
      {query.isPending ? (
        <p role="status">Loading users…</p>
      ) : query.isError ? (
        <div role="alert">
          <p>{query.error.message}</p>
          <button className={button} onClick={() => void query.refetch()}>
            Try again
          </button>
        </div>
      ) : (
        <>
          <p role="status">
            Page {page} · {query.data.users.length} users on this page
          </p>
          {!query.data.users.length && <p>No users on this page.</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            {query.data.users.map((user) => (
              <article
                key={user.id}
                className="min-w-0 space-y-2 rounded-xl border border-border bg-card p-4"
              >
                <h2 className="break-words text-lg font-semibold">
                  {user.profile?.full_name || user.email}
                </h2>
                <dl className="space-y-1 break-words text-sm">
                  <div>
                    <dt className="font-semibold">Email</dt>
                    <dd>{user.email}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold">Username</dt>
                    <dd>{user.profile?.username || "Profile missing"}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold">School</dt>
                    <dd>{user.profile?.school || "Not set"}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold">Role</dt>
                    <dd>{user.profile?.role || "USER"}</dd>
                  </div>
                </dl>
                {user.profile?.role !== "ADMIN" && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      className={button}
                      onClick={() => {
                        setError("");
                        setEditor({
                          user,
                          values: {
                            ...newUser,
                            email: user.email,
                            username: user.profile?.username ?? "",
                            full_name: user.profile?.full_name ?? "",
                            school: user.profile?.school ?? "BYU",
                          },
                        });
                      }}
                    >
                      Edit user
                    </button>
                    <button
                      className={button}
                      onClick={() => {
                        setError("");
                        setDeleting(user);
                      }}
                    >
                      Delete user
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              className={button}
              disabled={page === 1 || query.isFetching}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous page
            </button>
            <button
              className={button}
              disabled={!query.data.hasNext || query.isFetching}
              onClick={() => setPage((p) => p + 1)}
            >
              Next page
            </button>
          </div>
        </>
      )}
      <Modal
        open={Boolean(editor)}
        title={editor?.user ? "Edit user" : "Create user"}
        onClose={() => {
          if (!busy) setEditor(null);
        }}
      >
        {editor && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void mutate(editor.user ? "update" : "create", {
                id: editor.user?.id,
                values: editor.values,
              });
            }}
          >
            <h2 className="text-xl font-semibold">{editor.user ? "Edit user" : "Create user"}</h2>
            <Feedback error={error} message="" />
            <fieldset disabled={busy} className="space-y-3">
              {(
                [
                  "email",
                  "username",
                  "full_name",
                  "school",
                  ...(!editor.user ? ["password"] : []),
                ] as (keyof typeof newUser)[]
              ).map((field) => (
                <label key={field} className="block text-sm font-medium">
                  {fieldLabel(field)}
                  {field === "school" ? (
                    <select
                      className={control}
                      value={editor.values.school}
                      onChange={(e) =>
                        setEditor({
                          ...editor,
                          values: { ...editor.values, school: e.target.value },
                        })
                      }
                    >
                      <option>BYU</option>
                      <option>UVU</option>
                    </select>
                  ) : (
                    <input
                      required
                      className={control}
                      readOnly={Boolean(editor.user && field === "email")}
                      autoComplete={field === "password" ? "new-password" : "off"}
                      type={
                        field === "password" ? "password" : field === "email" ? "email" : "text"
                      }
                      minLength={field === "password" ? 12 : field === "username" ? 3 : 1}
                      maxLength={
                        field === "password"
                          ? 128
                          : field === "email"
                            ? 255
                            : field === "username"
                              ? 30
                              : 100
                      }
                      value={editor.values[field]}
                      onChange={(e) =>
                        setEditor({
                          ...editor,
                          values: { ...editor.values, [field]: e.target.value },
                        })
                      }
                    />
                  )}
                </label>
              ))}
              {!editor.user && (
                <p className="text-sm">
                  The new account can sign in immediately. Share the password privately with its
                  owner.
                </p>
              )}
              <button className={button}>{busy ? "Saving…" : "Save user"}</button>
            </fieldset>
          </form>
        )}
      </Modal>
      <Modal
        open={Boolean(deleting)}
        title="Delete user?"
        onClose={() => {
          if (!busy) setDeleting(null);
        }}
      >
        {deleting && (
          <div className="space-y-4">
            <Feedback error={error} message="" />
            <p className="break-words">
              Permanently delete {deleting.email} and any dependent profile or saved-item records?
              This cannot be undone.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                className={button}
                disabled={busy}
                onClick={() => void mutate("delete", { id: deleting.id })}
              >
                {busy ? "Deleting…" : "Permanently delete user"}
              </button>
              <button className={button} disabled={busy} onClick={() => setDeleting(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}
