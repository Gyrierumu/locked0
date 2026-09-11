import { describe, expect, it } from "vitest";

import { canAccessAdmin, getHighestRole, hasAtLeastRole, hasRole } from "./roles";

describe("role policies", () => {
  it.each([
    ["admin", "admin", true],
    ["admin", "editor", true],
    ["admin", "author", true],
    ["editor", "admin", false],
    ["editor", "editor", true],
    ["editor", "author", true],
    ["author", "admin", false],
    ["author", "editor", false],
    ["author", "author", true],
  ] as const)("evaluates %s against minimum role %s", (ownedRole, minimumRole, expected) => {
    expect(hasAtLeastRole([ownedRole], minimumRole)).toBe(expected);
  });

  it("checks exact persisted roles separately from hierarchy", () => {
    expect(hasRole(["admin"], "admin")).toBe(true);
    expect(hasRole(["admin"], "author")).toBe(false);
  });

  it("denies admin access when no privileged role exists", () => {
    expect(canAccessAdmin([])).toBe(false);
  });

  it.each(["author", "editor", "admin"] as const)(
    "allows %s to access the editorial admin",
    (role) => {
      expect(canAccessAdmin([role])).toBe(true);
    },
  );

  it("selects editor from author and editor", () => {
    expect(getHighestRole(["author", "editor"])).toBe("editor");
  });

  it("selects admin from author and admin", () => {
    expect(getHighestRole(["author", "admin"])).toBe("admin");
  });

  it("returns no effective role for an empty set", () => {
    expect(getHighestRole([])).toBeNull();
  });
});
