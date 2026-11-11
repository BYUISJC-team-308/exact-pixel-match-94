import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnalyticsDrawerModal, OkrSummary } from "@/components/AnalyticsDrawerModal";
import type { TeamOkrSnapshot } from "@/lib/team-okr";
const mocks = vi.hoisted(() => ({ store: vi.fn(), query: vi.fn(), refetch: vi.fn() }));
vi.mock("@/lib/store", () => ({ useStore: mocks.store }));
vi.mock("@/lib/team-okr", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/team-okr")>()),
  useTeamOkrSnapshot: mocks.query,
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/ui-bits", () => ({
  Modal: ({ open, children }: { open: boolean; children: ReactNode }) =>
    open ? <div role="dialog">{children}</div> : null,
  Btn: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props} />,
}));
const sample: TeamOkrSnapshot = {
  version: 1,
  observedAt: "2026-11-10T12:00:00Z",
  signupFrom: "2026-11-01T00:00:00Z",
  signupTo: "2026-11-11T00:00:00Z",
  totalUsers: 4,
  matureUsers: 3,
  pendingUsers: 1,
  noSaveUsers: 1,
  firstSave: { meanMinutes: 4.7, medianMinutes: 4, sampleSize: 3, targetMinutes: null },
  save: { numerator: 3, denominator: 4, percent: 75, target: 50 },
  reportedUse: { numerator: 1, denominator: 4, percent: 25, target: 60 },
  sevenDaySave: { numerator: 1, denominator: 3, percent: 33.3, target: 75 },
  quality: {
    complete: true,
    missingSignupSessions: 0,
    missingOutcomes: 0,
    missingActionSessions: 0,
    excludedSimulations: 2,
    excludedDuplicates: 1,
    loggedEvents: 12,
    lastEventAt: null,
  },
};
beforeEach(() => {
  mocks.store.mockReturnValue({ user: { email: "team@example.com" } });
  mocks.query.mockReturnValue({
    data: sample,
    isPending: false,
    isFetching: false,
    isError: false,
    refetch: mocks.refetch,
  });
});
afterEach(cleanup);
describe("Team OKR dashboard", () => {
  it("shows all four KRs with sample sizes, targets and pending cohorts", () => {
    render(<OkrSummary metrics={sample} />);
    expect(screen.getByText("4.7 min")).toBeInTheDocument();
    expect(screen.getByText(/3 \/ 4 users · Target 50%/)).toBeInTheDocument();
    expect(screen.getByText(/1 \/ 3 users · Target 75%/)).toBeInTheDocument();
    expect(screen.getByText(/1 user is still waiting/)).toBeInTheDocument();
    expect(screen.getByText(/Timing target awaiting Product Owner/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Simulate/ })).not.toBeInTheDocument();
  });
  it("labels incomplete tracking and keeps missing percentages distinct from zero", () => {
    const incomplete = {
      ...sample,
      noSaveUsers: null,
      firstSave: { ...sample.firstSave, meanMinutes: null, medianMinutes: null },
      save: { ...sample.save, percent: null },
      reportedUse: { ...sample.reportedUse, percent: null },
      sevenDaySave: { ...sample.sevenDaySave, percent: null },
      quality: { ...sample.quality, complete: false, missingSignupSessions: 4 },
    };
    render(<OkrSummary metrics={incomplete} />);
    expect(screen.getByText(/results are not ready to certify/)).toBeInTheDocument();
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
  it("prompts signed-out users to sign in without an enabled metrics query", () => {
    mocks.store.mockReturnValue({ user: null });
    render(<AnalyticsDrawerModal open onClose={() => {}} />);
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/signin");
    expect(mocks.query).toHaveBeenCalledWith(expect.any(String), expect.any(String), null, true);
    expect(screen.queryByText("75%")).not.toBeInTheDocument();
  });
  it("shows query errors with retry rather than an empty dashboard", () => {
    mocks.query.mockReturnValue({
      isPending: false,
      isError: true,
      error: new Error("Access required"),
      refetch: mocks.refetch,
    });
    render(<AnalyticsDrawerModal open onClose={() => {}} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Access required");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(mocks.refetch).toHaveBeenCalled();
  });
  it("shows a loading state and does not expose cached metrics while closed", () => {
    mocks.query.mockReturnValue({
      isPending: true,
      isFetching: true,
      isError: false,
      refetch: mocks.refetch,
    });
    const { rerender } = render(<AnalyticsDrawerModal open onClose={() => {}} />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading stored team metrics");
    rerender(<AnalyticsDrawerModal open={false} onClose={() => {}} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
