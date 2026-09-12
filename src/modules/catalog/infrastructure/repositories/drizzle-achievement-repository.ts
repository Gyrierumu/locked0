import "server-only";

import { and, asc, count, eq, ilike, inArray, or, sql, sum } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  achievementGroups,
  achievementSets,
  achievements,
  contentPacks,
  gameReleases,
  games,
  platforms,
  releaseAchievementSets,
} from "@/db/schema";

import type {
  AchievementGroupType,
  AchievementSetStatus,
  AchievementStatus,
  AchievementType,
  AdminAchievement,
  AdminAchievementGroup,
  AdminAchievementSetListItem,
  AdminLinkedRelease,
  GameStatus,
} from "../../contracts";
import { CatalogError } from "../../domain/errors";
import type {
  AchievementRepository,
  AchievementInsert,
} from "../../application/ports/achievement-repository";
import { mapCatalogPersistenceError } from "../postgres-errors";

type RootDatabase = ReturnType<typeof getDb>;
type AchievementDatabase = Pick<RootDatabase, "delete" | "insert" | "select" | "update">;
type TransactionRunner = <T>(
  operation: (database: AchievementDatabase) => Promise<T>,
) => Promise<T>;

function status(value: string): AchievementStatus {
  if (value === "active" || value === "archived") return value;
  throw new Error(`Unexpected lifecycle status: ${value}`);
}

function gameStatus(value: string): GameStatus {
  return status(value);
}

function groupType(value: string): AchievementGroupType {
  if (["base", "dlc", "expansion", "update", "mode", "other"].includes(value)) {
    return value as AchievementGroupType;
  }
  throw new Error(`Unexpected achievement group type: ${value}`);
}

function achievementType(value: string): AchievementType {
  if (["bronze", "silver", "gold", "platinum", "standard"].includes(value)) {
    return value as AchievementType;
  }
  throw new Error(`Unexpected achievement type: ${value}`);
}

function escapeLike(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
}

const emptyTypeCounts = () => ({ bronze: 0, silver: 0, gold: 0, platinum: 0, standard: 0 });

function buildDrizzleAchievementRepository(
  getDatabase: () => AchievementDatabase,
  runTransaction?: TransactionRunner,
): AchievementRepository {
  const repository: AchievementRepository = {
    transaction<T>(operation: (scoped: AchievementRepository) => Promise<T>): Promise<T> {
      if (!runTransaction) return operation(repository);
      return runTransaction((database) =>
        operation(buildDrizzleAchievementRepository(() => database)),
      );
    },

    async findGameState(gameId) {
      const rows = await getDatabase()
        .select({ id: games.id, status: games.status })
        .from(games)
        .where(eq(games.id, gameId))
        .limit(1);
      const row = rows[0];
      return row ? { id: row.id, status: gameStatus(row.status) } : null;
    },

    async countGameReleases(gameId, releaseIds) {
      if (releaseIds.length === 0) return 0;
      const rows = await getDatabase()
        .select({ value: count() })
        .from(gameReleases)
        .where(and(eq(gameReleases.gameId, gameId), inArray(gameReleases.id, [...releaseIds])));
      return rows[0]?.value ?? 0;
    },

    async findContentPackState(contentPackId) {
      const rows = await getDatabase()
        .select({ id: contentPacks.id, gameId: contentPacks.gameId, status: contentPacks.status })
        .from(contentPacks)
        .where(eq(contentPacks.id, contentPackId))
        .limit(1);
      const row = rows[0];
      return row ? { ...row, status: gameStatus(row.status) } : null;
    },

    async listAchievementSets(gameId) {
      const database = getDatabase();
      const setRows = await database
        .select({
          id: achievementSets.id,
          gameId: achievementSets.gameId,
          name: achievementSets.name,
          key: achievementSets.key,
          regionCode: achievementSets.regionCode,
          status: achievementSets.status,
        })
        .from(achievementSets)
        .where(eq(achievementSets.gameId, gameId))
        .orderBy(asc(achievementSets.name));
      if (setRows.length === 0) return [];
      const setIds = setRows.map((row) => row.id);
      const [linkRows, countRows] = await Promise.all([
        database
          .select({
            achievementSetId: releaseAchievementSets.achievementSetId,
            id: gameReleases.id,
            name: gameReleases.name,
            key: gameReleases.key,
            regionCode: gameReleases.regionCode,
            platformId: platforms.id,
            platformName: platforms.name,
            platformShortName: platforms.shortName,
          })
          .from(releaseAchievementSets)
          .innerJoin(
            gameReleases,
            eq(releaseAchievementSets.gameReleaseId, gameReleases.id),
          )
          .innerJoin(platforms, eq(gameReleases.platformId, platforms.id))
          .where(inArray(releaseAchievementSets.achievementSetId, setIds))
          .orderBy(asc(platforms.sortOrder), asc(gameReleases.key)),
        database
          .select({
            achievementSetId: achievementGroups.achievementSetId,
            type: achievements.achievementType,
            value: count(),
          })
          .from(achievementGroups)
          .innerJoin(achievements, eq(achievements.achievementGroupId, achievementGroups.id))
          .where(inArray(achievementGroups.achievementSetId, setIds))
          .groupBy(achievementGroups.achievementSetId, achievements.achievementType),
      ]);

      const links = new Map<string, AdminLinkedRelease[]>();
      for (const row of linkRows) {
        const items = links.get(row.achievementSetId) ?? [];
        items.push({
          id: row.id,
          name: row.name,
          key: row.key,
          regionCode: row.regionCode,
          platform: {
            id: row.platformId,
            name: row.platformName,
            shortName: row.platformShortName,
          },
        });
        links.set(row.achievementSetId, items);
      }
      const counts = new Map<string, ReturnType<typeof emptyTypeCounts>>();
      for (const row of countRows) {
        const values = counts.get(row.achievementSetId) ?? emptyTypeCounts();
        values[achievementType(row.type)] = row.value;
        counts.set(row.achievementSetId, values);
      }

      return setRows.map((row) => {
        const typeCounts = counts.get(row.id) ?? emptyTypeCounts();
        return {
          ...row,
          status: status(row.status) as AchievementSetStatus,
          linkedReleases: links.get(row.id) ?? [],
          achievementCount: Object.values(typeCounts).reduce((total, value) => total + value, 0),
          typeCounts,
        } satisfies AdminAchievementSetListItem;
      });
    },

    async findAchievementSet(gameId, achievementSetId) {
      const sets = await repository.listAchievementSets(gameId);
      return sets.find((item) => item.id === achievementSetId) ?? null;
    },

    async getAchievementSummary(achievementSetId) {
      const rows = await getDatabase()
        .select({
          hiddenCount: sql<number>`count(*) filter (where ${achievements.isHidden} = true)`.mapWith(Number),
          pointsTotal: sql<number>`coalesce(${sum(achievements.points)}, 0)`.mapWith(Number),
        })
        .from(achievements)
        .innerJoin(achievementGroups, eq(achievements.achievementGroupId, achievementGroups.id))
        .where(eq(achievementGroups.achievementSetId, achievementSetId));
      return rows[0] ?? { hiddenCount: 0, pointsTotal: 0 };
    },

    async createAchievementSet(gameId, input) {
      try {
        const rows = await getDatabase()
          .insert(achievementSets)
          .values({ gameId, ...input })
          .returning({ id: achievementSets.id });
        const row = rows[0];
        if (!row) throw new Error("Achievement set insert returned no identity.");
        return row;
      } catch (error) {
        mapCatalogPersistenceError(error, "achievement_set");
      }
    },

    async updateAchievementSet(gameId, achievementSetId, input) {
      try {
        const rows = await getDatabase()
          .update(achievementSets)
          .set({ ...input, updatedAt: new Date() })
          .where(and(eq(achievementSets.gameId, gameId), eq(achievementSets.id, achievementSetId)))
          .returning({ id: achievementSets.id });
        if (rows.length === 0) throw new CatalogError("not_found");
      } catch (error) {
        if (error instanceof CatalogError) throw error;
        mapCatalogPersistenceError(error, "achievement_set");
      }
    },

    async replaceAchievementSetReleases(achievementSetId, releaseIds) {
      await getDatabase()
        .delete(releaseAchievementSets)
        .where(eq(releaseAchievementSets.achievementSetId, achievementSetId));
      if (releaseIds.length > 0) {
        await getDatabase().insert(releaseAchievementSets).values(
          releaseIds.map((gameReleaseId) => ({ achievementSetId, gameReleaseId })),
        );
      }
    },

    async listAchievementGroups(achievementSetId) {
      const database = getDatabase();
      const achievementCounts = database
        .select({ groupId: achievements.achievementGroupId, value: count().as("achievement_count") })
        .from(achievements)
        .groupBy(achievements.achievementGroupId)
        .as("achievement_counts");
      const rows = await database
        .select({
          id: achievementGroups.id,
          achievementSetId: achievementGroups.achievementSetId,
          name: achievementGroups.name,
          type: achievementGroups.type,
          position: achievementGroups.position,
          contentPackId: contentPacks.id,
          contentPackName: contentPacks.name,
          contentPackStatus: contentPacks.status,
          achievementCount: sql<number>`coalesce(${achievementCounts.value}, 0)`.mapWith(Number),
        })
        .from(achievementGroups)
        .leftJoin(contentPacks, eq(achievementGroups.contentPackId, contentPacks.id))
        .leftJoin(achievementCounts, eq(achievementCounts.groupId, achievementGroups.id))
        .where(eq(achievementGroups.achievementSetId, achievementSetId))
        .orderBy(asc(achievementGroups.position));
      return rows.map((row) => ({
        id: row.id,
        achievementSetId: row.achievementSetId,
        name: row.name,
        type: groupType(row.type),
        position: row.position,
        contentPack: row.contentPackId && row.contentPackName && row.contentPackStatus
          ? {
              id: row.contentPackId,
              name: row.contentPackName,
              status: gameStatus(row.contentPackStatus),
            }
          : null,
        achievementCount: row.achievementCount,
      })) satisfies AdminAchievementGroup[];
    },

    async findAchievementGroup(achievementSetId, groupId) {
      const groups = await repository.listAchievementGroups(achievementSetId);
      return groups.find((group) => group.id === groupId) ?? null;
    },

    async createAchievementGroup(achievementSetId, input, position) {
      try {
        const rows = await getDatabase()
          .insert(achievementGroups)
          .values({ achievementSetId, ...input, position })
          .returning({ id: achievementGroups.id });
        const row = rows[0];
        if (!row) throw new Error("Achievement group insert returned no identity.");
        return row;
      } catch (error) {
        mapCatalogPersistenceError(error, "achievement_group");
      }
    },

    async updateAchievementGroup(achievementSetId, groupId, input) {
      try {
        const rows = await getDatabase()
          .update(achievementGroups)
          .set({ ...input, updatedAt: new Date() })
          .where(and(
            eq(achievementGroups.achievementSetId, achievementSetId),
            eq(achievementGroups.id, groupId),
          ))
          .returning({ id: achievementGroups.id });
        if (rows.length === 0) throw new CatalogError("not_found");
      } catch (error) {
        if (error instanceof CatalogError) throw error;
        mapCatalogPersistenceError(error, "achievement_group");
      }
    },

    async setAchievementGroupPosition(groupId, position) {
      try {
        const rows = await getDatabase()
          .update(achievementGroups)
          .set({ position, updatedAt: new Date() })
          .where(eq(achievementGroups.id, groupId))
          .returning({ id: achievementGroups.id });
        if (rows.length === 0) throw new CatalogError("not_found");
      } catch (error) {
        if (error instanceof CatalogError) throw error;
        mapCatalogPersistenceError(error, "achievement_group");
      }
    },

    async listAchievements(achievementSetId, query) {
      const database = getDatabase();
      const search = query.q ? `%${escapeLike(query.q)}%` : null;
      const where = and(
        eq(achievementGroups.achievementSetId, achievementSetId),
        query.groupId ? eq(achievementGroups.id, query.groupId) : undefined,
        query.type === "all" ? undefined : eq(achievements.achievementType, query.type),
        query.status === "all" ? undefined : eq(achievements.status, query.status),
        query.hidden === "all"
          ? undefined
          : eq(achievements.isHidden, query.hidden === "hidden"),
        search ? or(ilike(achievements.name, search), ilike(achievements.slug, search)) : undefined,
      );
      const totals = await database
        .select({ value: count() })
        .from(achievements)
        .innerJoin(achievementGroups, eq(achievements.achievementGroupId, achievementGroups.id))
        .where(where);
      const total = totals[0]?.value ?? 0;
      const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
      const page = Math.min(query.page, totalPages);
      const rows = await database
        .select({
          id: achievements.id,
          achievementGroupId: achievements.achievementGroupId,
          groupName: achievementGroups.name,
          groupPosition: achievementGroups.position,
          name: achievements.name,
          slug: achievements.slug,
          description: achievements.description,
          achievementType: achievements.achievementType,
          points: achievements.points,
          isHidden: achievements.isHidden,
          iconPath: achievements.iconPath,
          position: achievements.position,
          status: achievements.status,
        })
        .from(achievements)
        .innerJoin(achievementGroups, eq(achievements.achievementGroupId, achievementGroups.id))
        .where(where)
        .orderBy(asc(achievementGroups.position), asc(achievements.position))
        .limit(query.pageSize)
        .offset((page - 1) * query.pageSize);
      return {
        items: rows.map((row) => ({
          ...row,
          achievementType: achievementType(row.achievementType),
          status: status(row.status),
        })),
        page,
        pageSize: query.pageSize,
        total,
        totalPages,
      };
    },

    async listGroupAchievements(groupId) {
      const rows = await getDatabase()
        .select({
          id: achievements.id,
          achievementGroupId: achievements.achievementGroupId,
          groupName: achievementGroups.name,
          groupPosition: achievementGroups.position,
          name: achievements.name,
          slug: achievements.slug,
          description: achievements.description,
          achievementType: achievements.achievementType,
          points: achievements.points,
          isHidden: achievements.isHidden,
          iconPath: achievements.iconPath,
          position: achievements.position,
          status: achievements.status,
        })
        .from(achievements)
        .innerJoin(achievementGroups, eq(achievements.achievementGroupId, achievementGroups.id))
        .where(eq(achievements.achievementGroupId, groupId))
        .orderBy(asc(achievements.position));
      return rows.map((row) => ({
        ...row,
        achievementType: achievementType(row.achievementType),
        status: status(row.status),
      })) satisfies AdminAchievement[];
    },

    async findAchievement(achievementSetId, achievementId) {
      const result = await repository.listAchievements(achievementSetId, {
        q: "",
        groupId: null,
        type: "all",
        status: "all",
        hidden: "all",
        page: 1,
        pageSize: 100,
      });
      if (result.total <= 100) return result.items.find((item) => item.id === achievementId) ?? null;
      const rows = await getDatabase()
        .select({
          id: achievements.id,
          achievementGroupId: achievements.achievementGroupId,
          groupName: achievementGroups.name,
          groupPosition: achievementGroups.position,
          name: achievements.name,
          slug: achievements.slug,
          description: achievements.description,
          achievementType: achievements.achievementType,
          points: achievements.points,
          isHidden: achievements.isHidden,
          iconPath: achievements.iconPath,
          position: achievements.position,
          status: achievements.status,
        })
        .from(achievements)
        .innerJoin(achievementGroups, eq(achievements.achievementGroupId, achievementGroups.id))
        .where(and(
          eq(achievementGroups.achievementSetId, achievementSetId),
          eq(achievements.id, achievementId),
        ))
        .limit(1);
      const row = rows[0];
      return row ? {
        ...row,
        achievementType: achievementType(row.achievementType),
        status: status(row.status),
      } : null;
    },

    async createAchievement(input: AchievementInsert) {
      try {
        const rows = await getDatabase()
          .insert(achievements)
          .values(input)
          .returning({ id: achievements.id });
        const row = rows[0];
        if (!row) throw new Error("Achievement insert returned no identity.");
        return row;
      } catch (error) {
        mapCatalogPersistenceError(error, "achievement");
      }
    },

    async createAchievements(inputs) {
      if (inputs.length === 0) return;
      try {
        await getDatabase().insert(achievements).values([...inputs]);
      } catch (error) {
        mapCatalogPersistenceError(error, "achievement");
      }
    },

    async updateAchievement(achievementSetId, achievementId, input) {
      const groupIds = getDatabase()
        .select({ id: achievementGroups.id })
        .from(achievementGroups)
        .where(eq(achievementGroups.achievementSetId, achievementSetId));
      try {
        const rows = await getDatabase()
          .update(achievements)
          .set({ ...input, updatedAt: new Date() })
          .where(and(eq(achievements.id, achievementId), inArray(achievements.achievementGroupId, groupIds)))
          .returning({ id: achievements.id });
        if (rows.length === 0) throw new CatalogError("not_found");
      } catch (error) {
        if (error instanceof CatalogError) throw error;
        mapCatalogPersistenceError(error, "achievement");
      }
    },

    async moveAchievementToGroup(achievementId, achievementGroupId, position) {
      try {
        const rows = await getDatabase()
          .update(achievements)
          .set({ achievementGroupId, position, updatedAt: new Date() })
          .where(eq(achievements.id, achievementId))
          .returning({ id: achievements.id });
        if (rows.length === 0) throw new CatalogError("not_found");
      } catch (error) {
        if (error instanceof CatalogError) throw error;
        mapCatalogPersistenceError(error, "achievement");
      }
    },

    async setAchievementPosition(achievementId, position) {
      try {
        const rows = await getDatabase()
          .update(achievements)
          .set({ position, updatedAt: new Date() })
          .where(eq(achievements.id, achievementId))
          .returning({ id: achievements.id });
        if (rows.length === 0) throw new CatalogError("not_found");
      } catch (error) {
        if (error instanceof CatalogError) throw error;
        mapCatalogPersistenceError(error, "achievement");
      }
    },

    async setAchievementStatus(achievementSetId, achievementId, nextStatus) {
      const groupIds = getDatabase()
        .select({ id: achievementGroups.id })
        .from(achievementGroups)
        .where(eq(achievementGroups.achievementSetId, achievementSetId));
      const rows = await getDatabase()
        .update(achievements)
        .set({ status: nextStatus, updatedAt: new Date() })
        .where(and(eq(achievements.id, achievementId), inArray(achievements.achievementGroupId, groupIds)))
        .returning({ id: achievements.id });
      if (rows.length === 0) throw new CatalogError("not_found");
    },

    async listAchievementSlugs(groupIds) {
      if (groupIds.length === 0) return [];
      return getDatabase()
        .select({ groupId: achievements.achievementGroupId, slug: achievements.slug })
        .from(achievements)
        .where(inArray(achievements.achievementGroupId, [...groupIds]));
    },
  };
  return repository;
}

export function createDrizzleAchievementRepository(
  database: AchievementDatabase,
  runTransaction?: TransactionRunner,
): AchievementRepository {
  return buildDrizzleAchievementRepository(() => database, runTransaction);
}

export const drizzleAchievementRepository = buildDrizzleAchievementRepository(
  getDb,
  (operation) => getDb().transaction(operation),
);
