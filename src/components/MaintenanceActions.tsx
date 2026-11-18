import { Link } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { signOut } from "@/lib/auth";
// Keep privileged controls out of the SSR/guest render; server authorization is independent.
export function MaintenanceActions() {
  const { user, authReady } = useStore();
  if (!authReady || !user?.isAdmin) return null;
  const style =
    "inline-flex min-h-11 items-center rounded-xl border border-border bg-card px-4 py-2 font-semibold text-primary";
  return (
    <nav aria-label="Administrator tools" className="mb-5 flex flex-wrap gap-3">
      <Link className={style} to="/maintain" search={{ view: "users" }}>
        Maintain Users
      </Link>
      <Link className={style} to="/maintain" search={{ view: "records" }}>
        Maintain Records
      </Link>
      <button className={style} onClick={() => void signOut()}>
        Logout
      </button>
    </nav>
  );
}
