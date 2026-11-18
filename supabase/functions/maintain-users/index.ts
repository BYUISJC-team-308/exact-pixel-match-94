// The service key stays in Supabase's server runtime. Never add it to VITE_* variables.
import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import { handleUserMaintenance } from "../_shared/user-maintenance.ts";
Deno.serve((request) =>
  handleUserMaintenance(
    request,
    createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  ),
);
