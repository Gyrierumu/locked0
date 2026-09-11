import type { CurrentActor } from "../../domain/actor";
import { ForbiddenError, UnauthenticatedError } from "../../domain/errors";
import { hasAtLeastRole, type PlatifyRole } from "../../domain/roles";

export function ensureAuthenticated(actor: CurrentActor | null): CurrentActor {
  if (actor === null) throw new UnauthenticatedError();

  return actor;
}

export function ensureRole(
  actor: CurrentActor | null,
  minimumRole: PlatifyRole,
): CurrentActor {
  const authenticatedActor = ensureAuthenticated(actor);

  if (!hasAtLeastRole(authenticatedActor.roles, minimumRole)) {
    throw new ForbiddenError();
  }

  return authenticatedActor;
}
