import "server-only";

import { eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { profiles, userRoles } from "@/db/schema";
import type { IdentityRepository } from "@/modules/identity/application/ports/identity-repository";
import { isPlatifyRole } from "@/modules/identity/domain/roles";

export const drizzleIdentityRepository: IdentityRepository = {
  async findProfileByUserId(userId) {
    const [profile] = await getDb()
      .select({
        username: profiles.username,
        displayName: profiles.displayName,
        avatarPath: profiles.avatarPath,
      })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    return profile ?? null;
  },

  async findRolesByUserId(userId) {
    const rows = await getDb()
      .select({ role: userRoles.role })
      .from(userRoles)
      .where(eq(userRoles.userId, userId));

    return rows.map(({ role }) => role).filter(isPlatifyRole);
  },
};
