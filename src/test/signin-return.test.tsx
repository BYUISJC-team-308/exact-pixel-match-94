import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Route } from "@/routes/signin";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  signIn: vi.fn(),
  search: {} as { next?: "hub" },
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: object) => ({ ...options, useSearch: () => mocks.search }),
  useNavigate: () => mocks.navigate,
}));
vi.mock("@/lib/auth", () => ({ signIn: mocks.signIn }));
vi.mock("@/components/SignInForm", () => ({
  SignInForm: ({
    onSubmit,
  }: {
    onSubmit: (email: string, password: string) => Promise<unknown>;
  }) => <button onClick={() => void onSubmit("test@example.com", "test")}>Submit sign in</button>,
}));
const config = Route as unknown as {
  component: () => React.ReactNode;
  validateSearch: (search: Record<string, unknown>) => { next?: "hub" };
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.search = {};
  mocks.signIn.mockResolvedValue(null);
});
afterEach(cleanup);
it("returns My Hub sign-ins to the homepage hub", async () => {
  mocks.search = { next: "hub" };
  render(<config.component />);
  fireEvent.click(screen.getByRole("button", { name: "Submit sign in" }));
  await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({ to: "/", hash: "my-hub" }));
});
it("keeps the usual destination and does not navigate after failed sign-in", async () => {
  const view = render(<config.component />);
  fireEvent.click(screen.getByRole("button", { name: "Submit sign in" }));
  await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({ to: "/profile" }));
  mocks.navigate.mockClear();
  mocks.signIn.mockResolvedValue("Invalid credentials");
  view.rerender(<config.component />);
  fireEvent.click(screen.getByRole("button", { name: "Submit sign in" }));
  await waitFor(() => expect(mocks.signIn).toHaveBeenCalledTimes(2));
  expect(mocks.navigate).not.toHaveBeenCalled();
});
it("accepts only the supported internal return destination", () => {
  expect(config.validateSearch({ next: "hub" })).toEqual({ next: "hub" });
  expect(config.validateSearch({ next: "https://example.com" })).toEqual({});
});
