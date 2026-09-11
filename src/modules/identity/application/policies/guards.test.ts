import { describe, expect, it } from "vitest";

import type { CurrentActor } from "../../domain/actor";
import { ForbiddenError, UnauthenticatedError } from "../../domain/errors";
import type { PlatifyRole } from "../../domain/roles";
import { ensureAuthenticated, ensureRole } from "./guards";

function actorWithRoles(roles: readonly PlatifyRole[]): CurrentActor {
  return {
    userId: "user-123",
    profile: null,
    roles,
    effectiveRole: roles.at(-1) ?? null,
  };
}

describe("identity guards", () => {
  it("rejects an unauthenticated request", () => {
    expect(() => ensureAuthenticated(null)).toThrow(UnauthenticatedError);
    expect(() => ensureRole(null, "author")).toThrow(UnauthenticatedError);
  });

  it("accepts any verified user in the authentication-only guard", () => {
    const regularActor = actorWithRoles([]);

    expect(ensureAuthenticated(regularActor)).toBe(regularActor);
  });

  it("rejects an authenticated regular user from the admin", () => {
    expect(() => ensureRole(actorWithRoles([]), "author")).toThrow(ForbiddenError);
  });

  it.each([
    ["author", "author", true],
    ["author", "editor", false],
    ["author", "admin", false],
    ["editor", "author", true],
    ["editor", "editor", true],
    ["editor", "admin", false],
    ["admin", "author", true],
    ["admin", "editor", true],
    ["admin", "admin", true],
  ] as const)("guards %s against %s", (ownedRole, minimumRole, allowed) => {
    const operation = () => ensureRole(actorWithRoles([ownedRole]), minimumRole);

    if (allowed) {
      expect(operation()).toMatchObject({ userId: "user-123" });
    } else {
      expect(operation).toThrow(ForbiddenError);
    }
  });
});
