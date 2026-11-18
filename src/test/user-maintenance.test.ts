/* eslint-disable @typescript-eslint/no-explicit-any -- These fixtures model SDK query chains and generated router objects. */
// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, expect, test, vi } from "vitest";
import { handleUserMaintenance } from "../../supabase/functions/_shared/user-maintenance";
const mocks = {
  role: "ADMIN",
  targetRole: "USER",
  profile: true,
  create: vi.fn(),
  remove: vi.fn(),
  update: vi.fn(),
  list: vi.fn(),
  getUser: vi.fn(),
};
function admin() {
  return {
    auth: {
      getUser: mocks.getUser,
      admin: { createUser: mocks.create, deleteUser: mocks.remove, listUsers: mocks.list },
    },
    from: () => {
      const chain: any = {
        select: () => chain,
        eq: (_: string, id: string) => {
          chain.id = id;
          return chain;
        },
        in: () => Promise.resolve({ data: [], error: null }),
        maybeSingle: () =>
          Promise.resolve({
            data: mocks.profile
              ? { id: chain.id, role: chain.id === "caller" ? mocks.role : mocks.targetRole }
              : null,
            error: null,
          }),
        update: (v: any) => {
          mocks.update(v);
          return chain;
        },
      };
      return chain;
    },
  };
}
function request(body: unknown, token = true) {
  return new Request("https://test.example/maintain-users", {
    method: "POST",
    headers: token ? { Authorization: "Bearer token", "Content-Type": "application/json" } : {},
    body: JSON.stringify(body),
  });
}
const values = {
  email: "student@example.com",
  password: "Test-password-123!",
  username: "student",
  full_name: "Student Tester",
  school: "BYU",
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.role = "ADMIN";
  mocks.targetRole = "USER";
  mocks.profile = true;
  mocks.getUser.mockResolvedValue({ data: { user: { id: "caller" } }, error: null });
  mocks.create.mockResolvedValue({ data: { user: { id: "created" } }, error: null });
  mocks.remove.mockResolvedValue({ error: null });
  mocks.list.mockResolvedValue({ data: { users: [] }, error: null });
});
test("missing and invalid sessions are rejected", async () => {
  expect(
    (
      await handleUserMaintenance(
        request({ action: "list" }, false),
        admin() as unknown as SupabaseClient,
      )
    ).status,
  ).toBe(401);
  mocks.getUser.mockResolvedValue({ data: { user: null }, error: { message: "bad" } });
  expect(
    (await handleUserMaintenance(request({ action: "list" }), admin() as unknown as SupabaseClient))
      .status,
  ).toBe(401);
});
test("ordinary accounts cannot invoke any management action", async () => {
  mocks.role = "USER";
  for (const action of ["list", "create", "update", "delete"])
    expect(
      (
        await handleUserMaintenance(
          request({ action, values }),
          admin() as unknown as SupabaseClient,
        )
      ).status,
    ).toBe(403);
  expect(mocks.create).not.toHaveBeenCalled();
  expect(mocks.remove).not.toHaveBeenCalled();
});
test("account creation uses Auth and ignores any requested administrator role", async () => {
  const response = await handleUserMaintenance(
    request({ action: "create", values: { ...values, role: "ADMIN" } }),
    admin() as unknown as SupabaseClient,
  );
  expect(response.status).toBe(200);
  expect(mocks.create).toHaveBeenCalledWith({
    email: values.email,
    password: values.password,
    email_confirm: true,
    user_metadata: { username: values.username, full_name: values.full_name, school: "BYU" },
  });
  expect(JSON.stringify(await response.json())).not.toContain(values.password);
});
test("invalid input never creates an account and incomplete profiles roll back", async () => {
  expect(
    (
      await handleUserMaintenance(
        request({ action: "create", values: { ...values, password: "short" } }),
        admin() as unknown as SupabaseClient,
      )
    ).status,
  ).toBe(400);
  expect(mocks.create).not.toHaveBeenCalled();
  mocks.profile = false;
  // Keep the caller lookup authorized and fail only the new-profile lookup.
  const client = admin();
  const original = client.from;
  client.from = () => {
    const chain = original();
    const read = chain.maybeSingle;
    chain.maybeSingle = () =>
      chain.id === "caller" ? Promise.resolve({ data: { role: "ADMIN" } }) : read();
    return chain;
  };
  expect(
    (
      await handleUserMaintenance(
        request({ action: "create", values }),
        client as unknown as SupabaseClient,
      )
    ).status,
  ).toBe(502);
  expect(mocks.remove).toHaveBeenCalledWith("created");
});
test("administrators cannot be edited or deleted through the console", async () => {
  mocks.targetRole = "ADMIN";
  for (const action of ["update", "delete"])
    expect(
      (
        await handleUserMaintenance(
          request({ action, id: "00000000-0000-4000-8000-000000000002", values }),
          admin() as unknown as SupabaseClient,
        )
      ).status,
    ).toBe(403);
  expect(mocks.update).not.toHaveBeenCalled();
  expect(mocks.remove).not.toHaveBeenCalled();
});

test("lists selected identity fields without returning secrets", async () => {
  mocks.list.mockResolvedValue({
    data: {
      users: [
        {
          id: "student",
          email: "student@example.com",
          created_at: "2026-11-17",
          encrypted_password: "never-return-this",
          user_metadata: { private: "do-not-copy" },
        },
      ],
    },
    error: null,
  });
  const response = await handleUserMaintenance(
    request({ action: "list" }),
    admin() as unknown as SupabaseClient,
  );
  const result = await response.json();
  expect(response.status).toBe(200);
  expect(result.users[0].email).toBe("student@example.com");
  expect(JSON.stringify(result)).not.toMatch(/never-return-this|do-not-copy/);
});
test("ordinary profile updates and account deletion use the intended provider operations", async () => {
  const id = "00000000-0000-4000-8000-000000000002";
  expect(
    (
      await handleUserMaintenance(
        request({ action: "update", id, values }),
        admin() as unknown as SupabaseClient,
      )
    ).status,
  ).toBe(200);
  expect(mocks.update).toHaveBeenCalledWith({
    username: "student",
    full_name: "Student Tester",
    school: "BYU",
  });
  expect(
    (
      await handleUserMaintenance(
        request({ action: "delete", id }),
        admin() as unknown as SupabaseClient,
      )
    ).status,
  ).toBe(200);
  expect(mocks.remove).toHaveBeenCalledWith(id);
});
