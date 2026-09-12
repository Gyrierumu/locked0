import { CatalogError } from "./errors";
import type { CatalogRole } from "./models";

export type CatalogOperation =
  | "read"
  | "manage_game"
  | "manage_game_lifecycle"
  | "manage_platform"
  | "manage_release"
  | "manage_content_pack"
  | "manage_achievement";

export type CatalogCapabilities = Readonly<{
  canRead: boolean;
  canManageGames: boolean;
  canManageGameLifecycle: boolean;
  canManagePlatforms: boolean;
  canManageReleases: boolean;
  canManageContentPacks: boolean;
  canManageAchievements: boolean;
}>;

const LEVEL: Readonly<Record<CatalogRole, number>> = {
  author: 1,
  editor: 2,
  admin: 3,
};

const REQUIRED_LEVEL: Readonly<Record<CatalogOperation, number>> = {
  read: LEVEL.author,
  manage_game: LEVEL.editor,
  manage_game_lifecycle: LEVEL.admin,
  manage_platform: LEVEL.admin,
  manage_release: LEVEL.editor,
  manage_content_pack: LEVEL.editor,
  manage_achievement: LEVEL.editor,
};

function roleLevel(roles: readonly CatalogRole[]): number {
  return roles.reduce((highest, role) => Math.max(highest, LEVEL[role]), 0);
}

export function canPerformCatalogOperation(
  roles: readonly CatalogRole[],
  operation: CatalogOperation,
): boolean {
  return roleLevel(roles) >= REQUIRED_LEVEL[operation];
}

export function assertCatalogPermission(
  roles: readonly CatalogRole[],
  operation: CatalogOperation,
): void {
  if (!canPerformCatalogOperation(roles, operation)) {
    throw new CatalogError("forbidden");
  }
}

export function getCatalogCapabilities(roles: readonly CatalogRole[]): CatalogCapabilities {
  return {
    canRead: canPerformCatalogOperation(roles, "read"),
    canManageGames: canPerformCatalogOperation(roles, "manage_game"),
    canManageGameLifecycle: canPerformCatalogOperation(roles, "manage_game_lifecycle"),
    canManagePlatforms: canPerformCatalogOperation(roles, "manage_platform"),
    canManageReleases: canPerformCatalogOperation(roles, "manage_release"),
    canManageContentPacks: canPerformCatalogOperation(roles, "manage_content_pack"),
    canManageAchievements: canPerformCatalogOperation(roles, "manage_achievement"),
  };
}
