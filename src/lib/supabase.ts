import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./constants";
import type { Database } from "./database.types";

const hasConfig = SUPABASE_URL && SUPABASE_ANON_KEY;

if (!hasConfig) {
  console.warn(
    "⚠️ Supabase not configured. Create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
  );
}

/** Public (anon) client — subject to RLS. Returns a stub if not configured. */
export const supabase = hasConfig
  ? createClient<Database>(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : (createClient<Database>("http://localhost:54321", "placeholder") as ReturnType<
      typeof createClient<Database>
    >);

/** Service-role client (Edge Functions only — never use on frontend) */
export function createServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  return createClient<Database>(SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
