import { useState, type ReactNode } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CardHub, Route } from "@/routes/starving-student";
import { validateCardSearch, type CardSearch } from "@/lib/card-catalog";
import type { SSDeal } from "@/lib/data";

const mocks = vi.hoisted(() => ({
  counts: {} as Record<string, number>,
  punch: vi.fn(),
  invalidate: vi.fn(),
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => options,
  useNavigate: () => vi.fn(),
  useRouter: () => ({ invalidate: mocks.invalidate }),
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));
vi.mock("@/lib/starving-student", () => ({ getStarvingStudentOffers: vi.fn() }));
vi.mock("@/lib/store", () => ({
  useStore: () => ({ ssUsedCounts: mocks.counts }),
  actions: { toggleUsed: mocks.punch, resetUsed: vi.fn(), resetAllUsedSS: vi.fn() },
}));
vi.mock("@/components/ui-bits", () => ({
  PageHeader: ({
    eyebrow,
    title,
    children,
  }: {
    eyebrow: string;
    title: string;
    children: ReactNode;
  }) => (
    <header>
      <p>{eyebrow}</p>
      <h1>{title}</h1>
      {children}
    </header>
  ),
  SearchInput: ({
    value,
    onChange,
    placeholder,
  }: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
  }) => (
    <input
      type="search"
      aria-label={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
  FilterChips: ({
    options,
    value,
    onChange,
  }: {
    options: string[];
    value: string;
    onChange: (value: string) => void;
  }) => (
    <>
      {options.map((option) => (
        <button key={option} aria-pressed={value === option} onClick={() => onChange(option)}>
          {option}
        </button>
      ))}
    </>
  ),
  CompanyLogo: () => null,
  Modal: ({ children }: { children: ReactNode }) => <div role="dialog">{children}</div>,
  SSDetail: ({ deal, onClose }: { deal: SSDeal | null; onClose: () => void }) =>
    deal ? (
      <div role="dialog">
        {deal.company}: {deal.details}
        <button onClick={onClose}>Close details</button>
      </div>
    ) : null,
}));

const offers: SSDeal[] = Array.from({ length: 633 }, (_, i) => ({
  id: `offer-${i}`,
  company: `Merchant ${String(i).padStart(3, "0")}`,
  item: `Deal ${i}`,
  category: i % 2 ? "Restaurants" : "Entertainment",
  type: i % 3 ? "Discount" : "Free",
  value: "Offer",
  address: "Provo",
  details: `Terms ${i}`,
  locations: [],
  sourceUrl: "",
  capturedAt: "",
  x: 50,
  y: 50,
  totalUses: i === 632 ? null : 3,
}));
function Harness({
  initial = {},
  data = offers,
}: {
  initial?: Record<string, unknown>;
  data?: SSDeal[];
}) {
  const [search, setSearch] = useState<CardSearch>(() => validateCardSearch(initial));
  return <CardHub ssDeals={data} search={search} onSearchChange={setSearch} />;
}
const mountedIds = (container: HTMLElement) =>
  [...container.querySelectorAll("[data-offer-id]")].map((item) =>
    item.getAttribute("data-offer-id"),
  );
beforeEach(() => {
  mocks.counts = {};
  vi.clearAllMocks();
  HTMLElement.prototype.scrollIntoView = vi.fn();
});
afterEach(cleanup);

describe("Full card catalog pagination", () => {
  it("bounds rendered cards while every one of 633 offers stays reachable exactly once", () => {
    const { container } = render(<Harness />);
    expect(screen.getByText("633 offers")).toBeInTheDocument();
    expect(mountedIds(container)).toHaveLength(24);
    const ids = new Set(mountedIds(container));
    for (let page = 2; page <= 27; page++) {
      fireEvent.change(screen.getByRole("combobox", { name: "Top offer pagination page" }), {
        target: { value: String(page) },
      });
      mountedIds(container).forEach((id) => {
        expect(ids.has(id)).toBe(false);
        ids.add(id);
      });
    }
    expect(ids.size).toBe(633);
    expect(
      screen.getByRole("heading", { name: "Showing 625–633 of 633 matching offers" }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("navigation", { name: "Top offer pagination" })).getByRole("button", {
        name: "Next",
      }),
    ).toBeDisabled();
  }, 15000);

  it("searches late offers, filters the entire catalog, and resets page when criteria change", () => {
    const { container } = render(<Harness initial={{ page: 20 }} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "MERCHANT 632" } });
    expect(mountedIds(container)).toEqual(["offer-632"]);
    expect(screen.getByText("Showing 1–1 of 1 matching offers")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Free Only" }));
    expect(screen.getByText("Showing 1–24 of 211 matching offers")).toBeInTheDocument();
    expect(mountedIds(container).every((id) => Number(id?.split("-")[1]) % 3 === 0)).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Unlimited Only" }));
    expect(mountedIds(container)).toEqual(["offer-632"]);
  });

  it("sorts before paging and preserves page/filter state through view changes and details", () => {
    const { container } = render(
      <Harness initial={{ category: "Entertainment", sort: "company-desc", page: 2 }} />,
    );
    const initialIds = mountedIds(container);
    expect(initialIds[0]).toBe("offer-584");
    fireEvent.click(screen.getByRole("button", { name: /Discounts Grid/ }));
    expect(mountedIds(container)).toEqual(initialIds);
    fireEvent.click(screen.getByRole("button", { name: /View details for Deal 584 / }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Terms 584");
    fireEvent.click(screen.getByRole("button", { name: "Close details" }));
    expect(mountedIds(container)).toEqual(initialIds);
  });

  it("keeps punch actions on the right ID and recalculates used filters as counts change", () => {
    const view = render(<Harness initial={{ q: "Merchant 632" }} />);
    fireEvent.click(screen.getByRole("button", { name: "Record Use" }));
    expect(mocks.punch).toHaveBeenCalledWith("offer-632", null);
    mocks.counts = { "offer-632": 2 };
    view.rerender(<Harness initial={{ q: "Merchant 632" }} />);
    expect(screen.getByRole("button", { name: "Record Use (2 used)" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Used" }));
    expect(screen.getByText("Showing 1–1 of 1 matching offers")).toBeInTheDocument();
  });

  it("distinguishes no matches, successfully empty data, and invalid URLs", () => {
    const view = render(<Harness initial={{ q: "not-a-merchant", page: 999999 }} />);
    expect(screen.getByRole("heading", { name: "No card offers found" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear search and filters" }));
    expect(screen.getByText("Showing 1–24 of 633 matching offers")).toBeInTheDocument();
    view.unmount();
    render(<Harness data={[]} />);
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
    expect(screen.getByText("0 offers")).toBeInTheDocument();
    expect(validateCardSearch({ page: -1, view: "bad", sort: "bad" })).toMatchObject({
      page: 1,
      view: "compact",
      sort: "company-asc",
    });
  });

  it("shows loading without a false zero and offers recovery after failed requests", () => {
    const config = Route as unknown as {
      pendingComponent: () => ReactNode;
      errorComponent: () => ReactNode;
      staleTime: number;
    };
    const pending = render(<config.pendingComponent />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading the full card catalog");
    expect(screen.queryByText("0 offers")).not.toBeInTheDocument();
    pending.unmount();
    render(<config.errorComponent />);
    fireEvent.click(screen.getByRole("button", { name: "Retry card offers" }));
    expect(mocks.invalidate).toHaveBeenCalledOnce();
    expect(config.staleTime).toBe(300000);
  });
});
