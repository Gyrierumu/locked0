import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getSupabasePublicEnv } from "@/config/env.client";
import { getSupabaseAdminEnv } from "@/config/env.server";

export function createSupabaseAdminClient() {
  const { supabaseUrl } = getSupabasePublicEnv();
  const { supabaseServiceRoleKey } = getSupabaseAdminEnv();

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
