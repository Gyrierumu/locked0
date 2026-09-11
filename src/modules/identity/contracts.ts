export type { ActorProfile, CurrentActor } from "./domain/actor";
export { ForbiddenError, IdentityProviderError, UnauthenticatedError } from "./domain/errors";
export { sanitizeAdminReturnPath } from "./domain/return-path";
export {
  canAccessAdmin,
  getHighestRole,
  hasAtLeastRole,
  hasRole,
  isPlatifyRole,
  PLATIFY_ROLES,
  type PlatifyRole,
} from "./domain/roles";
