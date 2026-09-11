export const PLATIFY_ROLES = ["author", "editor", "admin"] as const;

export type PlatifyRole = (typeof PLATIFY_ROLES)[number];

const ROLE_LEVEL: Readonly<Record<PlatifyRole, number>> = {
  author: 1,
  editor: 2,
  admin: 3,
};

export function isPlatifyRole(value: string): value is PlatifyRole {
  return PLATIFY_ROLES.some((role) => role === value);
}

export function getHighestRole(roles: readonly PlatifyRole[]): PlatifyRole | null {
  let highestRole: PlatifyRole | null = null;

  for (const role of roles) {
    if (highestRole === null || ROLE_LEVEL[role] > ROLE_LEVEL[highestRole]) {
      highestRole = role;
    }
  }

  return highestRole;
}

export function hasRole(roles: readonly PlatifyRole[], role: PlatifyRole): boolean {
  return roles.includes(role);
}

export function hasAtLeastRole(
  roles: readonly PlatifyRole[],
  minimumRole: PlatifyRole,
): boolean {
  const highestRole = getHighestRole(roles);

  return highestRole !== null && ROLE_LEVEL[highestRole] >= ROLE_LEVEL[minimumRole];
}

export function canAccessAdmin(roles: readonly PlatifyRole[]): boolean {
  return hasAtLeastRole(roles, "author");
}
