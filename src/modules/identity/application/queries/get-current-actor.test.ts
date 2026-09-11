import { describe, expect, it, vi } from "vitest";

import type { IdentityRepository } from "../ports/identity-repository";
import { getCurrentActor } from "./get-current-actor";

describe("getCurrentActor", () => {
  it("composes verified identity, optional profile and the highest persisted role", async () => {
    const repository: IdentityRepository = {
      findProfileByUserId: vi.fn().mockResolvedValue({
        username: "platify_editor",
        displayName: "Platify Editor",
        avatarPath: null,
      }),
      findRolesByUserId: vi.fn().mockResolvedValue(["author", "editor"]),
    };

    const actor = await getCurrentActor(
      { userId: "user-123", email: "editor@example.test" },
      repository,
    );

    expect(actor).toEqual({
      userId: "user-123",
      email: "editor@example.test",
      profile: {
        username: "platify_editor",
        displayName: "Platify Editor",
        avatarPath: null,
      },
      roles: ["author", "editor"],
      effectiveRole: "editor",
    });
    expect(repository.findProfileByUserId).toHaveBeenCalledWith("user-123");
    expect(repository.findRolesByUserId).toHaveBeenCalledWith("user-123");
  });

  it("keeps an authenticated actor valid without a profile or role", async () => {
    const repository: IdentityRepository = {
      findProfileByUserId: vi.fn().mockResolvedValue(null),
      findRolesByUserId: vi.fn().mockResolvedValue([]),
    };

    const actor = await getCurrentActor({ userId: "user-regular" }, repository);

    expect(actor).toEqual({
      userId: "user-regular",
      profile: null,
      roles: [],
      effectiveRole: null,
    });
  });
});
