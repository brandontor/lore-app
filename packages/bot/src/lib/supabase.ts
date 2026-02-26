import { createClient } from "@supabase/supabase-js";
import { config } from "../config.js";

// Service-role client — bypasses RLS. Only use in bot (server-side, no user context).
export const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
});
