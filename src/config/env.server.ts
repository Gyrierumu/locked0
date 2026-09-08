import "server-only";

import { z } from "zod";

const serverEnvSchema = z.object({
  databaseUrl: z.string().min(1).optional(),
  supabaseServiceRoleKey: z.string().min(1).optional(),
});

const databaseEnvSchema = serverEnvSchema.extend({
  databaseUrl: z.string().min(1),
});

const supabaseAdminEnvSchema = serverEnvSchema.extend({
  supabaseServiceRoleKey: z.string().min(1),
});

const serverEnv = serverEnvSchema.parse({
  databaseUrl: process.env.DATABASE_URL || undefined,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || undefined,
});

export function getDatabaseEnv() {
  return databaseEnvSchema.parse(serverEnv);
}

export function getSupabaseAdminEnv() {
  return supabaseAdminEnvSchema.parse(serverEnv);
}
