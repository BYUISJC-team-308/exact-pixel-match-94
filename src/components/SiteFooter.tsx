import { Link } from "@tanstack/react-router";
import { ArrowUp } from "lucide-react";

const footerLinks = [
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
  { to: "/privacy", label: "Privacy" },
  { to: "/terms", label: "Terms" },
] as const;

export function SiteFooter() {
  return (
    <footer className="student-steals-theme mt-auto w-full border-t border-[#042f23] bg-[#042f23] text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Student Steals</p>
            <p className="mt-1 text-xs leading-relaxed text-white/80">
              Student discounts, card offers, and free food.
            </p>
          </div>
          <nav
            aria-label="Footer"
            className="grid grid-cols-2 gap-x-4 gap-y-1 sm:flex sm:flex-wrap sm:gap-x-5"
          >
            {footerLinks.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className="inline-flex min-h-11 items-center rounded-lg text-sm font-medium text-white underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
                activeProps={{ "aria-current": "page" }}
              >
                {label}
              </Link>
            ))}
          </nav>
          <button
            type="button"
            onClick={() =>
              window.scrollTo({
                top: 0,
                behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
                  ? "auto"
                  : "smooth",
              })
            }
            className="inline-flex min-h-11 w-fit shrink-0 items-center gap-2 rounded-full bg-white/10 px-4 text-xs font-medium text-white/80 ring-1 ring-white/30 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
          >
            Back to top <ArrowUp className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </footer>
  );
}
