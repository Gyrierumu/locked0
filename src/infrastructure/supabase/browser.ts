import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublicEnv } from "@/config/env.client";

export function createSupabaseBrowserClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabasePublicEnv();
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
