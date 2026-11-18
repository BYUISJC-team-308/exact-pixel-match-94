import type { SupabaseClient } from "@supabase/supabase-js";
type Profile = {
  id: string;
  username?: string;
  full_name?: string;
  school?: string;
  role?: string;
};
// Only selected account fields leave the server. Passwords are sent straight to Auth.
// A fresh provider check and database role check run for every operation.
export async function handleUserMaintenance(
  request: Request,
  admin: SupabaseClient,
): Promise<Response> {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };
  const reply = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers });
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "POST") return reply({ error: "Use POST." }, 405);
  const token = request.headers.get("Authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return reply({ error: "Sign in again." }, 401);
  try {
    const { data: caller, error: authError } = await admin.auth.getUser(token);
    if (authError || !caller.user) return reply({ error: "Sign in again." }, 401);
    const { data: role, error: roleError } = await admin
      .from("profiles")
      .select("role")
      .eq("id", caller.user.id)
      .maybeSingle();
    if (roleError || role?.role !== "ADMIN")
      return reply({ error: "Administrator access required." }, 403);
    const body = await request.json();
    if (body.action === "list") {
      const page = Number(body.page ?? 1);
      if (!Number.isInteger(page) || page < 1 || page > 100000)
        return reply({ error: "Invalid page." }, 400);
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 25 });
      if (error) return reply({ error: "Accounts could not load. Try again." }, 502);
      const ids = data.users.map((u) => u.id);
      const profiles = ids.length
        ? await admin.from("profiles").select("id,username,full_name,school,role").in("id", ids)
        : { data: [], error: null };
      if (profiles.error) return reply({ error: "Profiles could not load. Try again." }, 502);
      return reply({
        users: data.users.map((u) => ({
          id: u.id,
          email: u.email ?? "",
          created_at: u.created_at,
          profile: profiles.data.find((p: Profile) => p.id === u.id) ?? null,
        })),
        hasNext: data.users.length === 25,
      });
    }
    if (!["create", "update", "delete"].includes(body.action))
      return reply({ error: "Choose a supported action." }, 400);
    const values = body.values ?? {};
    if (body.action !== "delete") {
      if (
        typeof values.username !== "string" ||
        !/^.{3,30}$/u.test(values.username.trim()) ||
        typeof values.full_name !== "string" ||
        !values.full_name.trim() ||
        values.full_name.length > 100 ||
        !["BYU", "UVU"].includes(values.school)
      )
        return reply(
          { error: "Enter a name, a username of 3–30 characters, and BYU or UVU." },
          400,
        );
    }
    if (body.action === "create") {
      if (
        typeof values.email !== "string" ||
        values.email.length > 255 ||
        !/^\S+@\S+\.\S+$/.test(values.email) ||
        typeof values.password !== "string" ||
        values.password.length < 12 ||
        values.password.length > 128
      )
        return reply({ error: "Enter a valid email and a password of 12–128 characters." }, 400);
      const { data, error } = await admin.auth.admin.createUser({
        email: values.email.trim(),
        password: values.password,
        email_confirm: true,
        user_metadata: {
          username: values.username.trim(),
          full_name: values.full_name.trim(),
          school: values.school,
        },
      });
      if (error) return reply({ error: error.message }, 400);
      // Existing signup trigger creates profiles; do not introduce another identity table.
      const profile = await admin
        .from("profiles")
        .select("id")
        .eq("id", data.user.id)
        .maybeSingle();
      if (profile.error || !profile.data) {
        const rollback = await admin.auth.admin.deleteUser(data.user.id);
        return reply(
          {
            error: rollback.error
              ? "Account setup was incomplete. Check Supabase Auth before retrying."
              : "Profile setup failed. The new account was rolled back.",
          },
          502,
        );
      }
      return reply({ id: data.user.id });
    }
    if (typeof body.id !== "string" || !/^[a-f\d-]{36}$/i.test(body.id))
      return reply({ error: "Choose a valid account." }, 400);
    const target = await admin.from("profiles").select("role").eq("id", body.id).maybeSingle();
    if (target.error) return reply({ error: "Account access could not be checked." }, 502);
    // Preserve all administrator accounts and prevent self-lockout or role escalation.
    if (body.id === caller.user.id || target.data?.role === "ADMIN")
      return reply({ error: "Administrator accounts must be managed in Supabase." }, 403);
    if (body.action === "delete") {
      const { error } = await admin.auth.admin.deleteUser(body.id);
      return error
        ? reply(
            {
              error:
                "Account could not be deleted. Check linked records or owned storage files in Supabase.",
            },
            409,
          )
        : reply({ id: body.id });
    }
    const { data, error } = await admin
      .from("profiles")
      .update({
        username: values.username.trim(),
        full_name: values.full_name.trim(),
        school: values.school,
      })
      .eq("id", body.id)
      .select("id")
      .maybeSingle();
    return error
      ? reply({ error: error.message }, 400)
      : !data
        ? reply({ error: "Profile no longer exists. Refresh the list." }, 409)
        : reply({ id: body.id });
  } catch {
    return reply(
      { error: "The request could not be completed. Check the connection and try again." },
      400,
    );
  }
}
