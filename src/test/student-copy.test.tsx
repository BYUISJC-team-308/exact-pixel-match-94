import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ComponentType, ReactNode } from "react";
import { eventCountLabel, roomLabel } from "@/lib/student-copy";
import { SiteHeader } from "@/components/SiteHeader";
import { Route as DiscountsRoute } from "@/routes/discounts";
import { Route as FoodRoute } from "@/routes/free-food";
import { Calendar } from "@/routes/calendar";
import { Route as ProfileRoute } from "@/routes/profile";

const mocks = vi.hoisted(() => ({
  store: vi.fn(),
  deals: vi.fn(),
  events: vi.fn(),
  retry: vi.fn(),
  navigate: vi.fn(),
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => options,
  useNavigate: () => mocks.navigate,
  Link: ({
    to,
    children,
    activeOptions: _activeOptions,
    activeProps: _activeProps,
    ...props
  }: {
    to: string;
    children: ReactNode;
    activeOptions?: unknown;
    activeProps?: unknown;
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@/lib/auth", () => ({ initAuth: vi.fn(), signOut: vi.fn(), updateProfile: vi.fn() }));
vi.mock("@/lib/store", () => ({
  useStore: mocks.store,
  actions: { toggleDeal: vi.fn(), toggleEvent: vi.fn() },
}));
vi.mock("@/lib/deals", () => ({ useDealsQuery: mocks.deals, getDealScore: () => 0 }));
vi.mock("@/lib/food-events", () => ({ useFoodEventsQuery: mocks.events }));
vi.mock("@/lib/calendar-deals", () => ({ getRecurringSpecialsForDate: () => [] }));
vi.mock("@/components/SubmitFoodEventModal", () => ({ SubmitFoodEventModal: () => null }));
vi.mock("@/components/AnalyticsDrawerModal", () => ({ AnalyticsDrawerModal: () => null }));
vi.mock("@/components/AccountForm", () => ({ AccountForm: () => <p>Profile form</p> }));
vi.mock("@/components/ui-bits", () => ({
  PageHeader: ({
    title,
    eyebrow,
    children,
  }: {
    title: string;
    eyebrow: string;
    children: ReactNode;
  }) => (
    <header>
      <p>{eyebrow}</p>
      <h1>{title}</h1>
      {children}
    </header>
  ),
  SearchInput: () => <input aria-label="Search discounts" />,
  FilterChips: () => null,
  DealDetail: () => null,
  EventDetail: () => null,
  CompanyLogo: () => null,
  Modal: ({ children, open }: { children: ReactNode; open?: boolean }) => (open ? <div>{children}</div> : null),
  chipTone: () => "",
  Btn: ({
    variant: _variant,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => <button {...props} />,
}));

const routePage = (route: unknown) => (route as { component: ComponentType }).component;
const Discounts = routePage(DiscountsRoute);
const Food = routePage(FoodRoute);
const Profile = routePage(ProfileRoute);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.store.mockReturnValue({ user: null, authReady: true, savedDeals: [], savedEvents: [] });
  mocks.deals.mockReturnValue({ data: [], isLoading: false, isError: false, refetch: mocks.retry });
  mocks.events.mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    refetch: mocks.retry,
  });
});
afterEach(cleanup);

it("distinguishes unresolved counts from a successful zero", () => {
  expect(eventCountLabel(0, true, false)).toBe("Loading food events…");
  expect(eventCountLabel(0, false, true)).toBe("Food events couldn’t load");
  expect(eventCountLabel(0, false, false)).toBe("0 food events");
  expect(eventCountLabel(1, false, false)).toBe("1 food event");
});
it.each([
  ["1170", "Room 1170"],
  ["Rm. 1170", "Room 1170"],
  ["Room 1170", "Room 1170"],
  ["Room: 1170", "Room 1170"],
  ["Gallery", "Room: Gallery"],
  ["", ""],
])("labels room %s without repeated prefixes", (room, label) => {
  expect(roomLabel(room)).toBe(label);
});
it("labels guest and member account destinations accurately and waits for session restoration", () => {
  const view = render(<SiteHeader />);
  expect(screen.getByRole("link", { name: "Create account" })).toHaveAttribute("href", "/account");
  expect(screen.queryByRole("link", { name: "Profile" })).not.toBeInTheDocument();
  mocks.store.mockReturnValue({ user: null, authReady: false });
  view.rerender(<SiteHeader />);
  expect(screen.getByRole("status", { name: "Checking your account" })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Create account" })).not.toBeInTheDocument();
  mocks.store.mockReturnValue({ user: { name: "Lot" }, authReady: true });
  view.rerender(<SiteHeader />);
  expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute("href", "/profile");
});
it("keeps discount loading/error/empty states distinct without an unsupported schedule claim", () => {
  mocks.deals.mockReturnValue({ data: [], isPending: true, isLoading: false, isError: false });
  const view = render(<Discounts />);
  expect(screen.getByText("Loading discounts…")).toBeInTheDocument();
  expect(screen.queryByText("0 student discounts")).not.toBeInTheDocument();
  mocks.deals.mockReturnValue({ data: [], isLoading: false, isError: true, refetch: mocks.retry });
  view.rerender(<Discounts />);
  expect(screen.getByRole("alert")).toHaveTextContent("Discounts couldn’t load");
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(mocks.retry).toHaveBeenCalledOnce();
  mocks.deals.mockReturnValue({ data: [], isLoading: false, isError: false });
  view.rerender(<Discounts />);
  expect(screen.getByText("0 student discounts")).toBeInTheDocument();
  expect(screen.queryByText(/every morning|verified/i)).not.toBeInTheDocument();
});
it("does not turn food-list failures into a zero count or expose raw backend errors", () => {
  mocks.events.mockReturnValue({ data: [], isPending: true, isLoading: false, isError: false });
  const view = render(<Food />);
  expect(screen.getByText("Loading food events…")).toBeInTheDocument();
  expect(screen.queryByText(/0 food events listed/)).not.toBeInTheDocument();
  mocks.events.mockReturnValue({
    data: [],
    isLoading: false,
    isError: true,
    error: new Error("internal table details"),
    refetch: mocks.retry,
  });
  view.rerender(<Food />);
  expect(screen.getByRole("alert")).toHaveTextContent("Food events couldn’t load");
  expect(screen.queryByText("internal table details")).not.toBeInTheDocument();
});
it("calendar failures do not claim an empty day, and retries remain available", () => {
  mocks.events.mockReturnValue({ data: [], isLoading: false, isError: true, refetch: mocks.retry });
  render(<Calendar renderedAt={Date.now()} />);
  expect(screen.getByRole("alert")).toHaveTextContent("Food events couldn’t load");
  expect(screen.queryByText(/No events or specials are listed/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(mocks.retry).toHaveBeenCalledOnce();
});
it("explains signed-out profile access without implying synced saves", () => {
  const view = render(<Profile />);
  expect(screen.getByRole("heading", { name: "Sign in to your profile" })).toBeInTheDocument();
  expect(
    screen.getByText(/Saved offers and events currently stay on this browser/),
  ).toBeInTheDocument();
  mocks.store.mockReturnValue({
    user: { username: "lot", name: "Lot Starr", school: "BYU" },
    authReady: true,
  });
  view.rerender(<Profile />);
  expect(screen.getByRole("heading", { name: "Hi, Lot" })).toBeInTheDocument();
  expect(screen.getByText("Profile form")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
});

it("focuses mobile search, closes the menu, and submits the first result with Enter", () => {
  render(<SiteHeader />);
  fireEvent.click(screen.getByRole("button", { name: "Menu" }));
  fireEvent.click(screen.getByRole("button", { name: "Open site search" }));
  expect(screen.queryByRole("navigation", { name: "Main navigation" })).not.toBeInTheDocument();
  const search = screen.getByRole("textbox", { name: "Search the site" });
  expect(search).toHaveFocus();
  fireEvent.change(search, { target: { value: "calendar" } });
  fireEvent.keyDown(search, { key: "Enter" });
  expect(mocks.navigate).toHaveBeenCalledWith({ to: "/calendar" });
  expect(screen.getByRole("button", { name: "Open site search" })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
});

it("returns focus on Escape and exposes sign in in the mobile menu", () => {
  render(<SiteHeader />);
  fireEvent.click(screen.getByRole("button", { name: "Open site search" }));
  fireEvent.keyDown(screen.getByRole("textbox", { name: "Search the site" }), { key: "Escape" });
  expect(screen.getByRole("button", { name: "Open site search" })).toHaveFocus();
  fireEvent.click(screen.getByRole("button", { name: "Menu" }));
  expect(screen.getByRole("navigation", { name: "Main navigation" })).toHaveTextContent("Sign in");
});
