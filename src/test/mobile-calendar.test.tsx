import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Calendar } from "@/routes/calendar";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => options,
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));
vi.mock("@/lib/store", () => ({
  useStore: () => ({ savedEvents: [] }),
  actions: { toggleEvent: vi.fn() },
}));
vi.mock("@/lib/food-events", () => ({
  useFoodEventsQuery: () => ({ data: [], isLoading: false }),
}));
vi.mock("@/lib/calendar-deals", () => ({ getRecurringSpecialsForDate: () => [] }));
vi.mock("@/components/ui-bits", () => ({
  PageHeader: ({ title, children }: { title: string; children: ReactNode }) => (
    <header>
      <h1>{title}</h1>
      {children}
    </header>
  ),
  Btn: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props} />,
  EventDetail: () => null,
}));
afterEach(cleanup);

describe("Mobile calendar journey", () => {
  it("starts with the day agenda and switches to a selected date's agenda from the month", () => {
    render(<Calendar />);
    expect(screen.getByRole("button", { name: /Day Agenda/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: /Month Grid/ }));
    expect(screen.getByRole("button", { name: /Month Grid/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const day = screen.getAllByRole("button", { name: /0 food events, 0 specials/ })[0];
    fireEvent.click(day);
    expect(day).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Day Agenda/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "Jump to Today" }));
    expect(
      screen.getByRole("heading", {
        name: new Date().toLocaleDateString(undefined, {
          weekday: "long",
          month: "short",
          day: "numeric",
        }),
      }),
    ).toBeInTheDocument();
  });
});
