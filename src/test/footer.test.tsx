import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/SiteFooter";
import { ContactPage } from "@/routes/contact";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (config: unknown) => config,
  Link: ({
    to,
    children,
    activeProps: _activeProps,
    ...props
  }: {
    to: string;
    children: ReactNode;
    activeProps?: unknown;
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));
afterEach(cleanup);
it("exposes all four real destinations in the shared footer without sign-in", () => {
  render(<SiteFooter />);
  const links = within(screen.getByRole("navigation", { name: "Footer" })).getAllByRole("link");
  expect(links.map((link) => link.getAttribute("href"))).toEqual([
    "/about",
    "/contact",
    "/privacy",
    "/terms",
  ]);
});
it("provides the approved private contact separately from public bug reporting", () => {
  render(<ContactPage />);
  expect(screen.getByRole("link", { name: "lotstarr@gmail.com" })).toHaveAttribute(
    "href",
    "mailto:lotstarr@gmail.com",
  );
  expect(screen.getByRole("link", { name: /Open the public issue tracker/ })).toHaveAttribute(
    "href",
    "https://github.com/BYUISJC-team-308/exact-pixel-match-94/issues",
  );
  expect(screen.getByText(/GitHub issues are public/)).toBeInTheDocument();
});
