import "server-only";

import { and, asc, count, desc, eq, ilike, or, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import { contentPacks, gameReleases, games, platforms } from "@/db/schema";

import type {
  AdminContentPack,
  AdminGame,
  AdminGameContext,
  AdminGameListItem,
  AdminGameRelease,
  AdminPlatform,
  ContentPackType,
  GameStatus,
} from "../../contracts";
import { CatalogError } from "../../domain/errors";
import type { CatalogRepository } from "../../application/ports/catalog-repository";
import { mapCatalogPersistenceError } from "../postgres-errors";

function gameStatus(value: string): GameStatus {
  if (value === "active" || value === "archived") return value;
  throw new Error(`Unexpected game status: ${value}`);
}

function contentPackType(value: string): ContentPackType {
  if (["expansion", "dlc", "update", "mode", "other"].includes(value)) {
    return value as ContentPackType;
  }
  throw new Error(`Unexpected content pack type: ${value}`);
}

function escapeLike(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
}

type CatalogDatabase = Pick<ReturnType<typeof getDb>, "insert" | "select" | "update">;

function gameCountJoins(database: CatalogDatabase) {
  const releaseCounts = database
    .select({
      gameId: gameReleases.gameId,
      value: count().as("release_count"),
    })
    .from(gameReleases)
    .groupBy(gameReleases.gameId)
    .as("release_counts");
  const contentPackCounts = database
    .select({
      gameId: contentPacks.gameId,
      value: count().as("content_pack_count"),
    })
    .from(contentPacks)
    .groupBy(contentPacks.gameId)
    .as("content_pack_counts");

  return {
    releaseCounts,
    contentPackCounts,
    releaseCount: sql<number>`coalesce(${releaseCounts.value}, 0)`.mapWith(Number),
    contentPackCount: sql<number>`coalesce(${contentPackCounts.value}, 0)`.mapWith(Number),
  };
}

function mapGameListRow(row: {
  id: string;
  name: string;
  slug: string;
  developerName: string | null;
  publisherName: string | null;
  releaseDate: string | null;
  coverPath: string | null;
  status: string;
  releaseCount: number;
  contentPackCount: number;
}): AdminGameListItem {
  return { ...row, status: gameStatus(row.status) };
}

function buildDrizzleCatalogRepository(getDatabase: () => CatalogDatabase): CatalogRepository {
  return {
  async listGames(query) {
    const database = getDatabase();
    const { releaseCounts, contentPackCounts, releaseCount, contentPackCount } =
      gameCountJoins(database);
    const search = query.q.length > 0 ? `%${escapeLike(query.q)}%` : null;
    const conditions = [
      query.status === "all" ? undefined : eq(games.status, query.status),
      search
        ? or(
            ilike(games.name, search),
            ilike(games.slug, search),
            ilike(games.developerName, search),
            ilike(games.publisherName, search),
          )
        : undefined,
    ];
    const where = and(...conditions);

    const totals = await database.select({ total: count() }).from(games).where(where);
    const total = totals[0]?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
    const page = Math.min(query.page, totalPages);
    const rows = await database
      .select({
        id: games.id,
        name: games.name,
        slug: games.slug,
        developerName: games.developerName,
        publisherName: games.publisherName,
        releaseDate: games.releaseDate,
        coverPath: games.coverPath,
        status: games.status,
        releaseCount,
        contentPackCount,
      })
      .from(games)
      .leftJoin(releaseCounts, eq(releaseCounts.gameId, games.id))
      .leftJoin(contentPackCounts, eq(contentPackCounts.gameId, games.id))
      .where(where)
      .orderBy(desc(games.updatedAt), asc(games.name))
      .limit(query.pageSize)
      .offset((page - 1) * query.pageSize);

    return {
      items: rows.map(mapGameListRow),
      page,
      pageSize: query.pageSize,
      total,
      totalPages,
    };
  },

  async findGame(id) {
    const database = getDatabase();
    const { releaseCounts, contentPackCounts, releaseCount, contentPackCount } =
      gameCountJoins(database);
    const rows = await database
      .select({
        id: games.id,
        name: games.name,
        slug: games.slug,
        summary: games.summary,
        developerName: games.developerName,
        publisherName: games.publisherName,
        releaseDate: games.releaseDate,
        coverPath: games.coverPath,
        heroPath: games.heroPath,
        status: games.status,
        releaseCount,
        contentPackCount,
      })
      .from(games)
      .leftJoin(releaseCounts, eq(releaseCounts.gameId, games.id))
      .leftJoin(contentPackCounts, eq(contentPackCounts.gameId, games.id))
      .where(eq(games.id, id))
      .limit(1);
    const row = rows[0];
    return row ? ({ ...row, status: gameStatus(row.status) } satisfies AdminGame) : null;
  },

  async findGameContext(id) {
    const database = getDatabase();
    const { releaseCounts, contentPackCounts, releaseCount, contentPackCount } =
      gameCountJoins(database);
    const rows = await database
      .select({
        id: games.id,
        name: games.name,
        status: games.status,
        releaseCount,
        contentPackCount,
      })
      .from(games)
      .leftJoin(releaseCounts, eq(releaseCounts.gameId, games.id))
      .leftJoin(contentPackCounts, eq(contentPackCounts.gameId, games.id))
      .where(eq(games.id, id))
      .limit(1);
    const row = rows[0];
    return row ? ({ ...row, status: gameStatus(row.status) } satisfies AdminGameContext) : null;
  },

  async createGame(input) {
    try {
      const rows = await getDatabase().insert(games).values(input).returning({ id: games.id });
      const result = rows[0];
      if (!result) throw new Error("Game insert returned no identity.");
      return result;
    } catch (error) {
      mapCatalogPersistenceError(error, "game");
    }
  },

  async updateGame(id, input) {
    try {
      const rows = await getDatabase()
        .update(games)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(games.id, id))
        .returning({ id: games.id });
      if (rows.length === 0) throw new CatalogError("not_found");
    } catch (error) {
      if (error instanceof CatalogError) throw error;
      mapCatalogPersistenceError(error, "game");
    }
  },

  async setGameStatus(id, status) {
    const rows = await getDatabase()
      .update(games)
      .set({ status, updatedAt: new Date() })
      .where(eq(games.id, id))
      .returning({ id: games.id });
    if (rows.length === 0) throw new CatalogError("not_found");
  },

  async listPlatforms(options) {
    const rows = await getDatabase()
      .select({
        id: platforms.id,
        name: platforms.name,
        shortName: platforms.shortName,
        slug: platforms.slug,
        sortOrder: platforms.sortOrder,
        isActive: platforms.isActive,
      })
      .from(platforms)
      .where(options?.activeOnly ? eq(platforms.isActive, true) : undefined)
      .orderBy(asc(platforms.sortOrder), asc(platforms.name));
    return rows satisfies AdminPlatform[];
  },

  async findPlatform(id) {
    const rows = await getDatabase()
      .select({
        id: platforms.id,
        name: platforms.name,
        shortName: platforms.shortName,
        slug: platforms.slug,
        sortOrder: platforms.sortOrder,
        isActive: platforms.isActive,
      })
      .from(platforms)
      .where(eq(platforms.id, id))
      .limit(1);
    return rows[0] ?? null;
  },

  async createPlatform(input) {
    try {
      const rows = await getDatabase().insert(platforms).values(input).returning({ id: platforms.id });
      const result = rows[0];
      if (!result) throw new Error("Platform insert returned no identity.");
      return result;
    } catch (error) {
      mapCatalogPersistenceError(error, "platform");
    }
  },

  async updatePlatform(id, input) {
    try {
      const rows = await getDatabase()
        .update(platforms)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(platforms.id, id))
        .returning({ id: platforms.id });
      if (rows.length === 0) throw new CatalogError("not_found");
    } catch (error) {
      if (error instanceof CatalogError) throw error;
      mapCatalogPersistenceError(error, "platform");
    }
  },

  async setPlatformActive(id, isActive) {
    const rows = await getDatabase()
      .update(platforms)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(platforms.id, id))
      .returning({ id: platforms.id });
    if (rows.length === 0) throw new CatalogError("not_found");
  },

  async listGameReleases(gameId) {
    const rows = await getDatabase()
      .select({
        id: gameReleases.id,
        gameId: gameReleases.gameId,
        platformId: platforms.id,
        platformName: platforms.name,
        platformShortName: platforms.shortName,
        platformIsActive: platforms.isActive,
        key: gameReleases.key,
        name: gameReleases.name,
        regionCode: gameReleases.regionCode,
        releaseDate: gameReleases.releaseDate,
      })
      .from(gameReleases)
      .innerJoin(platforms, eq(gameReleases.platformId, platforms.id))
      .where(eq(gameReleases.gameId, gameId))
      .orderBy(asc(platforms.sortOrder), asc(platforms.name), asc(gameReleases.key));

    return rows.map(({ platformId, platformName, platformShortName, platformIsActive, ...row }) => ({
      ...row,
      platform: {
        id: platformId,
        name: platformName,
        shortName: platformShortName,
        isActive: platformIsActive,
      },
    })) satisfies AdminGameRelease[];
  },

  async findGameRelease(gameId, releaseId) {
    const rows = await getDatabase()
      .select({
        id: gameReleases.id,
        gameId: gameReleases.gameId,
        platformId: platforms.id,
        platformName: platforms.name,
        platformShortName: platforms.shortName,
        platformIsActive: platforms.isActive,
        key: gameReleases.key,
        name: gameReleases.name,
        regionCode: gameReleases.regionCode,
        releaseDate: gameReleases.releaseDate,
      })
      .from(gameReleases)
      .innerJoin(platforms, eq(gameReleases.platformId, platforms.id))
      .where(and(eq(gameReleases.gameId, gameId), eq(gameReleases.id, releaseId)))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    const { platformId, platformName, platformShortName, platformIsActive, ...release } = row;
    return {
      ...release,
      platform: {
        id: platformId,
        name: platformName,
        shortName: platformShortName,
        isActive: platformIsActive,
      },
    };
  },

  async createGameRelease(gameId, input) {
    try {
      const rows = await getDatabase()
        .insert(gameReleases)
        .values({ gameId, ...input })
        .returning({ id: gameReleases.id });
      const result = rows[0];
      if (!result) throw new Error("Release insert returned no identity.");
      return result;
    } catch (error) {
      mapCatalogPersistenceError(error, "release");
    }
  },

  async updateGameRelease(gameId, releaseId, input) {
    try {
      const rows = await getDatabase()
        .update(gameReleases)
        .set({ ...input, updatedAt: new Date() })
        .where(and(eq(gameReleases.gameId, gameId), eq(gameReleases.id, releaseId)))
        .returning({ id: gameReleases.id });
      if (rows.length === 0) throw new CatalogError("not_found");
    } catch (error) {
      if (error instanceof CatalogError) throw error;
      mapCatalogPersistenceError(error, "release");
    }
  },

  async listGameContentPacks(gameId) {
    const rows = await getDatabase()
      .select({
        id: contentPacks.id,
        gameId: contentPacks.gameId,
        name: contentPacks.name,
        slug: contentPacks.slug,
        type: contentPacks.type,
        description: contentPacks.description,
        releaseDate: contentPacks.releaseDate,
        status: contentPacks.status,
      })
      .from(contentPacks)
      .where(eq(contentPacks.gameId, gameId))
      .orderBy(asc(contentPacks.releaseDate), asc(contentPacks.name));

    return rows.map((row) => ({
      ...row,
      type: contentPackType(row.type),
      status: gameStatus(row.status),
    })) satisfies AdminContentPack[];
  },

  async findContentPack(gameId, contentPackId) {
    const rows = await getDatabase()
      .select({
        id: contentPacks.id,
        gameId: contentPacks.gameId,
        name: contentPacks.name,
        slug: contentPacks.slug,
        type: contentPacks.type,
        description: contentPacks.description,
        releaseDate: contentPacks.releaseDate,
        status: contentPacks.status,
      })
      .from(contentPacks)
      .where(and(eq(contentPacks.gameId, gameId), eq(contentPacks.id, contentPackId)))
      .limit(1);
    const row = rows[0];
    return row
      ? ({
          ...row,
          type: contentPackType(row.type),
          status: gameStatus(row.status),
        } satisfies AdminContentPack)
      : null;
  },

  async createContentPack(gameId, input) {
    try {
      const rows = await getDatabase()
        .insert(contentPacks)
        .values({ gameId, ...input })
        .returning({ id: contentPacks.id });
      const result = rows[0];
      if (!result) throw new Error("Content pack insert returned no identity.");
      return result;
    } catch (error) {
      mapCatalogPersistenceError(error, "content_pack");
    }
  },

  async updateContentPack(gameId, contentPackId, input) {
    try {
      const rows = await getDatabase()
        .update(contentPacks)
        .set({ ...input, updatedAt: new Date() })
        .where(and(eq(contentPacks.gameId, gameId), eq(contentPacks.id, contentPackId)))
        .returning({ id: contentPacks.id });
      if (rows.length === 0) throw new CatalogError("not_found");
    } catch (error) {
      if (error instanceof CatalogError) throw error;
      mapCatalogPersistenceError(error, "content_pack");
    }
  },

  async setContentPackStatus(gameId, contentPackId, status) {
    const rows = await getDatabase()
      .update(contentPacks)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(contentPacks.gameId, gameId), eq(contentPacks.id, contentPackId)))
      .returning({ id: contentPacks.id });
    if (rows.length === 0) throw new CatalogError("not_found");
  },
  };
}

export function createDrizzleCatalogRepository(database: CatalogDatabase): CatalogRepository {
  return buildDrizzleCatalogRepository(() => database);
}

export const drizzleCatalogRepository = buildDrizzleCatalogRepository(getDb);
