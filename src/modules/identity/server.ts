import "server-only";

import { ensureAuthenticated, ensureRole } from "./application/policies/guards";
import { getCurrentActor } from "./application/queries/get-current-actor";
import type { CurrentActor } from "./domain/actor";
import type { PlatifyRole } from "./domain/roles";
import { drizzleIdentityRepository } from "./infrastructure/repositories/drizzle-identity-repository";
import {
  authenticateWithPassword,
  endCurrentSession,
  getVerifiedIdentity,
} from "./infrastructure/supabase-auth";

export async function getOptionalActor(): Promise<CurrentActor | null> {
  const identity = await getVerifiedIdentity();

  if (identity === null) return null;

  return getCurrentActor(identity, drizzleIdentityRepository);
}

export async function requireUser(): Promise<CurrentActor> {
  return ensureAuthenticated(await getOptionalActor());
}

export async function requireRole(minimumRole: PlatifyRole): Promise<CurrentActor> {
  return ensureRole(await getOptionalActor(), minimumRole);
}

export { authenticateWithPassword, endCurrentSession };
