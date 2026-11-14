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
  UserRound,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const navItems = [
  { to: "/discounts", label: "Discount Dashboard" },
  { to: "/starving-student", label: "Starving Student Card" },
  { to: "/free-food", label: "Free Food" },
  { to: "/calendar", label: "Calendar" },
  { to: "/map", label: "Map" },
] as const;

export function SiteHeader() {
  const { user, authReady } = useStore();
  const [q, setQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [accountError, setAccountError] = useState("");
  const headerRef = useRef<HTMLElement>(null);
  const accountToggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dismissOutside = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) {
        setAccountOpen(false);
        setSearchOpen(false);
        setQ("");
      }
    };
    const dismissEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && accountOpen) {
        setAccountOpen(false);
        accountToggle.current?.focus();
      }
    };
    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("keydown", dismissEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("keydown", dismissEscape);
    };
  }, [accountOpen]);

  const navigate = useNavigate();
  const searchInput = useRef<HTMLInputElement>(null);
  const searchToggle = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    const el = navRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    if (scrollWidth <= clientWidth + 10) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    setCanScrollLeft(scrollLeft > 15);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 15);
  };

  const scrollNav = (direction: "left" | "right") => {
    const el = navRef.current;
    if (!el) return;
    if (direction === "right") {
      el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
    } else {
      el.scrollTo({ left: 0, behavior: "smooth" });
    }
    setTimeout(checkScroll, 350);
  };

  useEffect(() => {
    if (searchOpen) searchInput.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    const el = navRef.current;
    if (el) {
      const activeEl = el.querySelector<HTMLElement>('[aria-current="page"]');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
      setTimeout(checkScroll, 100);
      setTimeout(checkScroll, 400);
    }
    const handleResize = () => checkScroll();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
      className="student-steals-theme sticky top-0 z-40 border-b border-[#042f23] bg-[#042f23] shadow-md"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
        {/* Brand / Logo */}
        <Link
          to="/"
          aria-label="Student Steals home"
          className="order-1 flex min-w-0 items-center gap-2 text-white shrink-0"
        >
          <StudentStealsMark className="size-9 shrink-0 sm:size-10" />
          <span className="font-sans text-base font-bold leading-[1.05] tracking-tight sm:text-xl">
            Student<span className="block sm:inline"> Steals</span>
          </span>
        </Link>

        {/* Top Navigation Bar: Mobile horizontal slider with scroll arrows / Desktop centered pills */}
        <div className="order-3 relative -mx-4 flex basis-full items-center overflow-hidden sm:-mx-6 lg:order-2 lg:mx-auto lg:basis-auto lg:overflow-visible">
          {/* Left Gradient & Arrow Hint */}
          {canScrollLeft && (
            <div
              className="pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-14 bg-gradient-to-r from-[#042f23] via-[#042f23]/90 to-transparent lg:hidden"
              aria-hidden="true"
            />
          )}
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => scrollNav("left")}
              aria-label="Scroll navigation left"
              className="absolute left-1.5 top-1/2 -translate-y-1/2 z-20 flex size-8 items-center justify-center rounded-full bg-white/25 text-white backdrop-blur-md shadow-md ring-1 ring-white/40 hover:bg-white/35 active:scale-95 transition-all lg:hidden"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
          )}

          {/* Navigation Bar */}
          <nav
            ref={navRef}
            id="main-navigation"
            aria-label="Main navigation"
            onScroll={checkScroll}
            className="flex w-full items-center gap-2 overflow-x-auto px-4 py-1 no-scrollbar touch-pan-x after:block after:w-6 after:shrink-0 after:content-[''] sm:px-6 lg:w-auto lg:px-0 lg:py-0 lg:after:hidden"
          >
            {navItems.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white/90 ring-1 ring-white/15 transition-all hover:bg-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white whitespace-nowrap sm:text-sm"
                activeProps={{
                  className:
                    "!bg-white !text-[#042f23] font-semibold !ring-white shadow-sm hover:!bg-white hover:!text-[#042f23]",
                  "aria-current": "page",
                }}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          {/* Right Gradient & Arrow Hint */}
          {canScrollRight && (
            <div
              className="pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-14 bg-gradient-to-l from-[#042f23] via-[#042f23]/90 to-transparent lg:hidden"
              aria-hidden="true"
            />
          )}
          {canScrollRight && (
            <button
              type="button"
              onClick={() => scrollNav("right")}
              aria-label="Scroll navigation right"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20 flex size-8 items-center justify-center rounded-full bg-white/25 text-white backdrop-blur-md shadow-md ring-1 ring-white/40 hover:bg-white/35 active:scale-95 transition-all lg:hidden"
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Right Controls: Search & Profile */}
        <div className="order-2 flex items-center gap-2 shrink-0 lg:order-3 ml-auto lg:ml-0">
          <button
            type="button"
            ref={searchToggle}
            aria-label={searchOpen ? "Close site search" : "Open site search"}
            aria-expanded={searchOpen}
            aria-controls="site-search"
            onClick={() => {
              setSearchOpen(!searchOpen);
              setAccountOpen(false);
              setQ("");
            }}
            className="grid size-11 shrink-0 place-items-center rounded-full bg-white ring-1 ring-border focus-visible:outline-2 sm:hidden"
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
            <div className="flex h-11 w-full items-center gap-2 rounded-full bg-white px-3 ring-1 ring-border sm:w-56">
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
                  setSearchOpen(false);
                  setQ("");
                }}
                className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full border border-[#759b83] bg-white font-sans font-semibold text-[#042f23] hover:bg-[#edf4ed]"
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
                className="grid size-11 place-items-center rounded-full border border-[#759b83] bg-white text-[#042f23]"
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
        </div>
      </div>
    </header>
  );
}
