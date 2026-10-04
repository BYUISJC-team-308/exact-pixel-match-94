import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SiteHeader } from "@/components/SiteHeader";
import { siteSections } from "@/lib/data";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold">404</h1>
        <p className="mt-2 text-sm text-muted-foreground">This page isn't on the board.</p>
        <Link to="/" className="mt-6 inline-flex rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Go home</Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">This page didn't load</h1>
        <div className="mt-6 flex justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }} className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">Try again</button>
          <a href="/" className="rounded-full bg-secondary px-4 py-2 text-sm ring-1 ring-border">Go home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Studeats — Student discounts & free food" },
      { name: "description", content: "Student discounts, Starving Student Card deals and free campus food in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=DM+Sans:wght@400;500;600;700&display=swap" },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <div className="relative min-h-screen text-pretty">
        <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-32 -left-24 h-[36rem] w-[36rem] rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute top-1/4 -right-24 h-[30rem] w-[30rem] rounded-full bg-accent/15 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-[26rem] w-[26rem] rounded-full bg-gold/15 blur-3xl" />
        </div>
        <div className="relative">
          <SiteHeader />
          <main className="mx-auto max-w-7xl px-6"><Outlet /></main>
          <footer className="mx-auto mt-10 max-w-7xl border-t border-border px-6 py-8">
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {siteSections.map((s) => (
                <Link key={s.to} to={s.to} className="text-muted-foreground hover:text-primary">{s.label}</Link>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Studeats · the bulletin board for broke students</p>
          </footer>
        </div>
      </div>
    </QueryClientProvider>
  );
}
