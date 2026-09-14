import "server-only";

import { z } from "zod";

const serverEnvSchema = z.object({
  databaseUrl: z.string().min(1).optional(),
  supabaseServiceRoleKey: z.string().min(1).optional(),
  mediaBucket: z.string().regex(/^[a-z0-9][a-z0-9._-]{2,62}$/),
  mediaStagingBucket: z.string().regex(/^[a-z0-9][a-z0-9._-]{2,62}$/),
});

const databaseEnvSchema = serverEnvSchema.extend({
  databaseUrl: z.string().min(1),
});

const supabaseAdminEnvSchema = serverEnvSchema.extend({
  supabaseServiceRoleKey: z.string().min(1),
});

const mediaStorageNamesSchema = serverEnvSchema.pick({
  mediaBucket: true,
  mediaStagingBucket: true,
});

const serverEnv = serverEnvSchema.parse({
  databaseUrl: process.env.DATABASE_URL || undefined,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || undefined,
  mediaBucket: process.env.SUPABASE_MEDIA_BUCKET || "locked0-media",
  mediaStagingBucket:
    process.env.SUPABASE_MEDIA_STAGING_BUCKET || "locked0-media-staging",
});

export function getDatabaseEnv() {
  return databaseEnvSchema.parse(serverEnv);
}

export function getSupabaseAdminEnv() {
  return supabaseAdminEnvSchema.parse(serverEnv);
}

export function getMediaStorageEnv() {
  return supabaseAdminEnvSchema.parse(serverEnv);
}

export function getMediaStorageNames() {
  return mediaStorageNamesSchema.parse(serverEnv);
}
