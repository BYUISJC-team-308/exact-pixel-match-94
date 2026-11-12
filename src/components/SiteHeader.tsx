import { StudentStealsMark } from "@/components/StudentStealsMark";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { siteSections, ssDeals } from "@/lib/data";
import { useStore } from "@/lib/store";
import { useFoodEventsQuery } from "@/lib/food-events";
import { useDealsQuery } from "@/lib/deals";
import { initAuth, signOut } from "@/lib/auth";
import {
  Search,
  X,
  House,
  Tag,
  CreditCard,
  Utensils,
  CalendarDays,
  MapPin,
  Menu,
  UserRound,
  LogOut,
} from "lucide-react";

const nav = [
  { to: "/", label: "Home", icon: House },
  {
    to: "/discounts",
    label: "Discounts",
    icon: Tag,
  },
  {
    to: "/starving-student",
    label: "Starving Student Card",
    icon: CreditCard,
  },
  {
    to: "/free-food",
    label: "Free Food",
    icon: Utensils,
  },
  {
    to: "/calendar",
    label: "Calendar",
    icon: CalendarDays,
  },
  { to: "/map", label: "Map", icon: MapPin },
] as const;

const navPill =
  "inline-flex min-h-11 items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";
const activePill = {
  className: "ring-2 ring-primary ring-offset-2",
  "aria-current": "page" as const,
};

export function SiteHeader() {
  const { user, authReady } = useStore();
  const [q, setQ] = useState("");
  const [menu, setMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [accountError, setAccountError] = useState("");
  const headerRef = useRef<HTMLElement>(null);
  const accountToggle = useRef<HTMLButtonElement>(null);
  const menuToggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const dismissOutside = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) {
        setAccountOpen(false);
        setMenu(false);
        setSearchOpen(false);
        setQ("");
      }
    };
    const dismissEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && accountOpen) {
        setAccountOpen(false);
        accountToggle.current?.focus();
      } else if (event.key === "Escape" && menu) {
        setMenu(false);
        menuToggle.current?.focus();
      }
    };
    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("keydown", dismissEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("keydown", dismissEscape);
    };
  }, [accountOpen, menu]);
  const navigate = useNavigate();
  const searchInput = useRef<HTMLInputElement>(null);
  const searchToggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (searchOpen) searchInput.current?.focus();
  }, [searchOpen]);
  useEffect(() => {
    initAuth();
  }, []);

  const { data: foodEvents = [] } = useFoodEventsQuery();
  const { data: deals = [] } = useDealsQuery();

  const t = q.trim().toLowerCase();
  const results = t
    ? [
        ...siteSections
          .filter((s) => (s.label + s.desc).toLowerCase().includes(t))
          .map((s) => ({ to: s.to, label: s.label, sub: "Page" })),
        ...deals
          .filter((d) => (d.title + d.company + d.category).toLowerCase().includes(t))
          .map((d) => ({ to: "/discounts", label: d.title, sub: "Discount" })),
        ...ssDeals
          .filter((d) => (d.item + d.company).toLowerCase().includes(t))
          .map((d) => ({
            to: "/starving-student",
            label: `${d.company}: ${d.item}`,
            sub: "Starving Student",
          })),
        ...foodEvents
          .filter((e) => (e.title + e.food + e.building).toLowerCase().includes(t))
          .map((e) => ({ to: "/free-food", label: e.title, sub: "Free food" })),
      ].slice(0, 8)
    : [];

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-40 border-b border-[#dce9df] bg-white/95 backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 sm:gap-3 sm:px-6">
        <Link
          to="/"
          aria-label="Student Steals home"
          className="flex min-w-0 items-center gap-2 text-[#124c3c]"
        >
          <StudentStealsMark className="size-9 shrink-0 sm:size-11" />
          <span className="font-sans text-base font-bold leading-[1.05] tracking-tight sm:text-xl">
            Student<span className="block sm:inline"> Steals</span>
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            ref={searchToggle}
            aria-label={searchOpen ? "Close site search" : "Open site search"}
            aria-expanded={searchOpen}
            aria-controls="site-search"
            onClick={() => {
              setSearchOpen(!searchOpen);
              setMenu(false);
              setAccountOpen(false);
              setQ("");
            }}
            className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary ring-1 ring-border focus-visible:outline-2 sm:hidden"
          >
            {searchOpen ? (
              <X className="size-4" aria-hidden="true" />
            ) : (
              <Search className="size-4" aria-hidden="true" />
            )}
          </button>
          <div
            id="site-search"
            className={
              searchOpen
                ? "absolute inset-x-4 top-full z-50 rounded-2xl bg-popover p-2 shadow-lg sm:static sm:bg-transparent sm:p-0 sm:shadow-none"
                : "relative hidden sm:block"
            }
          >
            <div className="flex h-11 w-full items-center gap-2 rounded-full bg-secondary px-3 ring-1 ring-border sm:w-56">
              <span className="text-muted-foreground">🔍</span>
              <input
                ref={searchInput}
                enterKeyHint="go"
                autoComplete="off"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setQ("");
                    setSearchOpen(false);
                    searchToggle.current?.focus();
                  }
                  if (event.key === "Enter" && !event.nativeEvent.isComposing && results.length) {
                    event.preventDefault();
                    navigate({ to: results[0].to });
                    setQ("");
                    setSearchOpen(false);
                    searchInput.current?.blur();
                  }
                }}
                placeholder="Search Student Steals"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                aria-label="Search the site"
              />
            </div>
            {t && (
              <div className="absolute inset-x-0 mt-2 max-h-[60dvh] overflow-y-auto rounded-xl bg-popover p-2 shadow-float sm:left-auto sm:w-80">
                {results.length === 0 && (
                  <p className="p-3 text-sm text-muted-foreground">No matches.</p>
                )}
                {results.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      navigate({ to: r.to });
                      setQ("");
                      setSearchOpen(false);
                    }}
                    className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
                  >
                    <span className="min-w-0 break-words">{r.label}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{r.sub}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            {authReady ? (
              <button
                ref={accountToggle}
                type="button"
                aria-label={user ? "Profile options" : "Sign in or create account"}
                aria-expanded={accountOpen}
                aria-controls="account-options"
                onClick={() => {
                  setAccountOpen(!accountOpen);
                  setMenu(false);
                  setSearchOpen(false);
                  setQ("");
                }}
                className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full border border-[#c9dfd1] bg-white font-sans font-semibold text-[#124c3c] hover:bg-[#edf4ed]"
              >
                {user?.avatar ? (
                  <img src={user.avatar} alt="" className="size-full object-cover" />
                ) : user ? (
                  user.name[0]?.toUpperCase()
                ) : (
                  <UserRound className="size-5" aria-hidden="true" />
                )}
              </button>
            ) : (
              <span
                role="status"
                aria-label="Checking your account"
                className="grid size-11 place-items-center rounded-full border border-[#c9dfd1] text-[#124c3c]"
              >
                <UserRound className="size-5" aria-hidden="true" />
              </span>
            )}
            {accountOpen && authReady && (
              <nav
                id="account-options"
                aria-label="Account options"
                className="absolute right-0 top-full z-50 mt-3 w-56 max-w-[calc(100vw-2rem)] rounded-2xl border border-[#dce9df] bg-white p-2 shadow-lg"
              >
                <p className="px-3 py-2 text-xs font-semibold text-[#416354]">
                  {user ? "Your account" : "Welcome to Student Steals"}
                </p>
                {user ? (
                  <>
                    <Link
                      to="/profile"
                      onClick={() => setAccountOpen(false)}
                      className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm text-primary hover:bg-[#edf4ed]"
                    >
                      <UserRound className="size-4" aria-hidden="true" />
                      My profile
                    </Link>
                    <button
                      type="button"
                      disabled={signingOut}
                      onClick={async () => {
                        setSigningOut(true);
                        setAccountError("");
                        try {
                          await signOut();
                          setAccountOpen(false);
                        } catch {
                          setAccountError("Couldn’t sign out. Please try again.");
                        } finally {
                          setSigningOut(false);
                        }
                      }}
                      className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-sm text-primary hover:bg-[#edf4ed] disabled:opacity-60"
                    >
                      <LogOut className="size-4" aria-hidden="true" />
                      {signingOut ? "Signing out…" : "Sign out"}
                    </button>
                    {accountError && (
                      <p role="alert" className="px-3 py-2 text-xs text-destructive">
                        {accountError}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <Link
                      to="/signin"
                      onClick={() => setAccountOpen(false)}
                      className="flex min-h-11 items-center rounded-xl bg-primary px-3 text-sm font-semibold text-white"
                    >
                      Sign in
                    </Link>
                    <Link
                      to="/account"
                      onClick={() => setAccountOpen(false)}
                      className="mt-1 flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-primary hover:bg-[#edf4ed]"
                    >
                      Create account
                    </Link>
                  </>
                )}
              </nav>
            )}
          </div>
          <button
            ref={menuToggle}
            type="button"
            aria-controls="main-navigation"
            onClick={() => {
              setMenu(!menu);
              setSearchOpen(false);
              setAccountOpen(false);
              setQ("");
            }}
            className="grid size-11 shrink-0 place-items-center rounded-full border border-[#c9dfd1] bg-white text-[#124c3c] hover:bg-[#edf4ed]"
            aria-label="Menu"
            aria-expanded={menu}
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>
      {menu && (
        <nav
          id="main-navigation"
          aria-label="Main navigation"
          className="mx-auto grid max-h-[60dvh] max-w-7xl grid-cols-2 gap-2 overflow-y-auto px-4 pb-4 pt-1 sm:grid-cols-3 sm:px-6"
        >
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setMenu(false)}
              className={`${navPill} rounded-xl border-[#dce9df] bg-[#f4f8f3] text-[#124c3c]`}
              activeOptions={{ exact: true }}
              activeProps={activePill}
            >
              <n.icon className="size-4 shrink-0" aria-hidden="true" />
              {n.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
