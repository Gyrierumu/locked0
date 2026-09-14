import { MediaError } from "./errors";

export type MediaRole = "author" | "editor" | "admin";
export type MediaOperation = "read" | "upload" | "manage_metadata" | "manage_lifecycle" | "hard_delete";

const LEVEL: Readonly<Record<MediaRole, number>> = { author: 1, editor: 2, admin: 3 };
const REQUIRED: Readonly<Record<MediaOperation, number>> = {
  read: LEVEL.author,
  upload: LEVEL.author,
  manage_metadata: LEVEL.editor,
  manage_lifecycle: LEVEL.editor,
  hard_delete: LEVEL.admin,
};

function level(roles: readonly MediaRole[]): number {
  return roles.reduce((highest, role) => Math.max(highest, LEVEL[role]), 0);
}

export function canPerformMediaOperation(
  roles: readonly MediaRole[],
  operation: MediaOperation,
): boolean {
  return level(roles) >= REQUIRED[operation];
}

export function assertMediaPermission(
  roles: readonly MediaRole[],
  operation: MediaOperation,
): void {
  if (!canPerformMediaOperation(roles, operation)) throw new MediaError("MEDIA_FORBIDDEN");
}

export function getMediaCapabilities(roles: readonly MediaRole[]) {
  return {
    canRead: canPerformMediaOperation(roles, "read"),
    canUpload: canPerformMediaOperation(roles, "upload"),
    canManageMetadata: canPerformMediaOperation(roles, "manage_metadata"),
    canManageLifecycle: canPerformMediaOperation(roles, "manage_lifecycle"),
    canHardDelete: canPerformMediaOperation(roles, "hard_delete"),
  } as const;
}
