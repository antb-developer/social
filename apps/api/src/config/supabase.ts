import { createClient } from "@supabase/supabase-js";
import { env, required } from "./env";

export const supabaseAdmin = createClient(
  required("SUPABASE_URL", env.supabaseUrl || undefined),
  required("SUPABASE_SERVICE_ROLE_KEY", env.supabaseServiceRoleKey || undefined),
  { auth: { autoRefreshToken: false, persistSession: false } }
);
