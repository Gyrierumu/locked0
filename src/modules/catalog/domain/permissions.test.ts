import { describe, expect, it } from "vitest";

import { CatalogError } from "./errors";
import type { CatalogRole } from "./models";
import {
  assertCatalogPermission,
  getCatalogCapabilities,
  type CatalogOperation,
} from "./permissions";

const expectations: ReadonlyArray<
  readonly [CatalogRole, CatalogOperation, boolean]
> = [
  ["author", "read", true],
  ["author", "manage_game", false],
  ["author", "manage_game_lifecycle", false],
  ["author", "manage_platform", false],
  ["author", "manage_release", false],
  ["author", "manage_content_pack", false],
  ["author", "manage_achievement", false],
  ["editor", "read", true],
  ["editor", "manage_game", true],
  ["editor", "manage_game_lifecycle", false],
  ["editor", "manage_platform", false],
  ["editor", "manage_release", true],
  ["editor", "manage_content_pack", true],
  ["editor", "manage_achievement", true],
  ["admin", "read", true],
  ["admin", "manage_game", true],
  ["admin", "manage_game_lifecycle", true],
  ["admin", "manage_platform", true],
  ["admin", "manage_release", true],
  ["admin", "manage_content_pack", true],
  ["admin", "manage_achievement", true],
];

describe("catalog permissions", () => {
  it.each(expectations)("evaluates %s for %s", (role, operation, allowed) => {
    const invoke = () => assertCatalogPermission([role], operation);
    if (allowed) expect(invoke).not.toThrow();
    else expect(invoke).toThrow(CatalogError);
  });

  it("exposes UI capabilities without weakening command authorization", () => {
    expect(getCatalogCapabilities(["editor"])).toEqual({
      canRead: true,
      canManageGames: true,
      canManageGameLifecycle: false,
      canManagePlatforms: false,
      canManageReleases: true,
      canManageContentPacks: true,
      canManageAchievements: true,
    });
  });
});
