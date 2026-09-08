import { z } from "zod";

const clientEnvSchema = z.object({
  siteUrl: z.url(),
  supabaseUrl: z.url().optional(),
  supabaseAnonKey: z.string().min(1).optional(),
});

const supabasePublicEnvSchema = clientEnvSchema.extend({
  supabaseUrl: z.url(),
  supabaseAnonKey: z.string().min(1),
});

export const clientEnv = clientEnvSchema.parse({
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || undefined,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || undefined,
});

export function getSupabasePublicEnv() {
  return supabasePublicEnvSchema.parse(clientEnv);
}
