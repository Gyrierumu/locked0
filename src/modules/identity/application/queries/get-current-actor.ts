import type { CurrentActor } from "../../domain/actor";
import { getHighestRole } from "../../domain/roles";
import type { IdentityRepository } from "../ports/identity-repository";

export type VerifiedIdentity = Readonly<{
  userId: string;
  email?: string;
}>;

export async function getCurrentActor(
  identity: VerifiedIdentity,
  repository: IdentityRepository,
): Promise<CurrentActor> {
  const [profile, roles] = await Promise.all([
    repository.findProfileByUserId(identity.userId),
    repository.findRolesByUserId(identity.userId),
  ]);

  return {
    userId: identity.userId,
    ...(identity.email ? { email: identity.email } : {}),
    profile,
    roles,
    effectiveRole: getHighestRole(roles),
  };
}
