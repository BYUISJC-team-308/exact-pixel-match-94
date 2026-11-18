/* eslint-disable @typescript-eslint/no-explicit-any -- These fixtures model SDK query chains and generated router objects. */
import { beforeEach, expect, test, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MaintenancePage, RecordMaintenance, UserMaintenance } from "@/routes/maintain";
import { MaintenanceActions } from "@/components/MaintenanceActions";
const mocks = vi.hoisted(() => ({
  state: { authReady: true, user: null as any },
  records: vi.fn(),
  users: vi.fn(),
  signOut: vi.fn(),
  invalidate: vi.fn(),
}));
vi.mock("@/lib/store", () => ({ useStore: () => mocks.state }));
vi.mock("@/lib/auth", () => ({ signOut: mocks.signOut }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (config: any) => ({ ...config, useSearch: () => ({ view: "records" }) }),
  Link: ({ to, children, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({ invalidate: mocks.invalidate }),
}));
vi.mock("@/lib/maintenance", async (original) => ({
  ...(await original<object>()),
  recordRequest: mocks.records,
  userRequest: mocks.users,
}));
function mount(child: React.ReactNode) {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      {child}
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.state = { authReady: true, user: null };
  mocks.invalidate.mockResolvedValue(undefined);
});
test("management buttons stay hidden for guests and ordinary accounts, and direct routes are guarded", () => {
  const view = mount(
    <>
      <MaintenanceActions />
      <MaintenancePage />
    </>,
  );
  expect(screen.queryByRole("link", { name: "Maintain Users" })).not.toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Administrator access required" }),
  ).toBeInTheDocument();
  mocks.state.user = { isAdmin: false };
  view.rerender(<MaintenanceActions />);
  expect(screen.queryByRole("link", { name: "Maintain Records" })).not.toBeInTheDocument();
  mocks.state.user = { isAdmin: true };
  view.rerender(<MaintenanceActions />);
  expect(screen.getByRole("link", { name: "Maintain Users" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Logout" }));
  expect(mocks.signOut).toHaveBeenCalledOnce();
});
test("record CRUD uses server schema and retains an edit on a stale-save failure", async () => {
  const row = { id: "r1", title: "Pizza" };
  mocks.records.mockImplementation((_: string, action: string) =>
    action === "list"
      ? Promise.resolve({
          fields: [
            {
              name: "title",
              type: "text",
              nullable: false,
              hasDefault: false,
              readOnly: false,
              options: null,
            },
          ],
          rows: [row],
          total: 1,
        })
      : Promise.reject(new Error("This record changed. Refresh before saving.")),
  );
  mount(<RecordMaintenance />);
  fireEvent.click(await screen.findByRole("button", { name: "Edit record" }));
  fireEvent.change(screen.getByLabelText("Title *"), { target: { value: "Tacos" } });
  fireEvent.click(screen.getByRole("button", { name: "Save record" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("This record changed");
  expect(screen.getByLabelText("Title *")).toHaveValue("Tacos");
  expect(mocks.records).toHaveBeenLastCalledWith("deals", "update", {
    p_id: "r1",
    p_values: { title: "Tacos" },
    p_original: row,
  });
});
test("record deletion requires a separate explicit confirmation", async () => {
  const row = { id: "r1", title: "Pizza" };
  mocks.records.mockResolvedValue({ fields: [], rows: [row], total: 1 });
  mount(<RecordMaintenance />);
  fireEvent.click(await screen.findByRole("button", { name: "Delete record" }));
  expect(mocks.records).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Permanently delete record" }));
  await waitFor(() =>
    expect(mocks.records).toHaveBeenCalledWith("deals", "delete", { p_id: "r1", p_original: row }),
  );
});
test("user loading errors show retry instead of false empty counts", async () => {
  mocks.users.mockRejectedValue(new Error("Function is not deployed."));
  mount(<UserMaintenance />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Function is not deployed");
  expect(screen.queryByText("No users on this page.")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
});
