import "server-only";

import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import type { VerifiedIdentity } from "@/modules/identity/application/queries/get-current-actor";
import { IdentityProviderError } from "@/modules/identity/domain/errors";

export async function getVerifiedIdentity(): Promise<VerifiedIdentity | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims.sub) return null;

  const email = data.claims.email;

  return {
    userId: data.claims.sub,
    ...(typeof email === "string" && email.length > 0 ? { email } : {}),
  };
}

export async function authenticateWithPassword(email: string, password: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  return error === null;
}

export async function endCurrentSession(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();

  if (error) throw new IdentityProviderError();
}
