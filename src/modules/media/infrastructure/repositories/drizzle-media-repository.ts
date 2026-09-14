import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  isNull,
  or,
  sql,
} from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  achievementGroups,
  achievementSets,
  achievements,
  games,
  guideContentNodes,
  guideSections,
  guides,
  guideSteps,
  mediaAssets,
  platforms,
} from "@/db/schema";
import { supavisorPipelineGuard } from "@/db/supavisor";

import type { MediaUsage } from "../../contracts";
import type {
  MediaAssetRecord,
  MediaRepository,
} from "../../application/ports/media-repository";

type RootDatabase = ReturnType<typeof getDb>;
type MediaDatabase = Pick<RootDatabase, "delete" | "insert" | "select" | "update">;

function escapeLike(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
}

const assetSelection = {
  id: mediaAssets.id,
  scopeGameId: games.id,
  scopeGameName: games.name,
  storagePath: mediaAssets.storagePath,
  originalFilename: mediaAssets.originalFilename,
  mimeType: mediaAssets.mimeType,
  byteSize: mediaAssets.byteSize,
  width: mediaAssets.width,
  height: mediaAssets.height,
  checksumSha256: mediaAssets.checksumSha256,
  sourceUrl: mediaAssets.sourceUrl,
  credit: mediaAssets.credit,
  createdBy: mediaAssets.createdBy,
  firstPublishedAt: mediaAssets.firstPublishedAt,
  retiredAt: mediaAssets.retiredAt,
  createdAt: mediaAssets.createdAt,
};

type AssetRow = Readonly<{
  id: string;
  scopeGameId: string | null;
  scopeGameName: string | null;
  storagePath: string;
  originalFilename: string;
  mimeType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  checksumSha256: string | null;
  sourceUrl: string | null;
  credit: string | null;
  createdBy: string | null;
  firstPublishedAt: Date | null;
  retiredAt: Date | null;
  createdAt: Date;
}>;

function mapAsset(row: AssetRow): MediaAssetRecord {
  const { scopeGameId, scopeGameName, ...asset } = row;
  return {
    ...asset,
    byteSize: Number(asset.byteSize),
    scopeGame:
      scopeGameId && scopeGameName ? { id: scopeGameId, name: scopeGameName } : null,
  };
}

function buildDrizzleMediaRepository(getDatabase: () => MediaDatabase): MediaRepository {
  return {
    async listAssets(query) {
      const database = getDatabase();
      const search = query.q ? `%${escapeLike(query.q)}%` : null;
      const where = and(
        supavisorPipelineGuard(),
        query.gameId ? eq(mediaAssets.scopeGameId, query.gameId) : undefined,
        query.status === "active"
          ? isNull(mediaAssets.retiredAt)
          : query.status === "retired"
            ? isNotNull(mediaAssets.retiredAt)
            : undefined,
        search
          ? or(
              ilike(mediaAssets.originalFilename, search),
              ilike(mediaAssets.credit, search),
              ilike(mediaAssets.sourceUrl, search),
            )
          : undefined,
      );
      const totals = await database.select({ total: count() }).from(mediaAssets).where(where);
      const total = totals[0]?.total ?? 0;
      const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
      const page = Math.min(query.page, totalPages);
      const rows = await database
        .select(assetSelection)
        .from(mediaAssets)
        .leftJoin(games, eq(mediaAssets.scopeGameId, games.id))
        .where(where)
        .orderBy(desc(mediaAssets.createdAt), desc(mediaAssets.id))
        .limit(query.pageSize)
        .offset((page - 1) * query.pageSize);
      return {
        items: rows.map((row) => mapAsset(row as AssetRow)),
        page,
        pageSize: query.pageSize,
        total,
        totalPages,
      };
    },

    async findAsset(id) {
      const rows = await getDatabase()
        .select(assetSelection)
        .from(mediaAssets)
        .leftJoin(games, eq(mediaAssets.scopeGameId, games.id))
        .where(eq(mediaAssets.id, id))
        .limit(1);
      return rows[0] ? mapAsset(rows[0] as AssetRow) : null;
    },

    async findAssetByStoragePath(path) {
      const rows = await getDatabase()
        .select(assetSelection)
        .from(mediaAssets)
        .leftJoin(games, eq(mediaAssets.scopeGameId, games.id))
        .where(eq(mediaAssets.storagePath, path))
        .limit(1);
      return rows[0] ? mapAsset(rows[0] as AssetRow) : null;
    },

    async insertAsset(input) {
      await getDatabase().insert(mediaAssets).values(input);
    },

    async updateMetadata(id, input) {
      await getDatabase()
        .update(mediaAssets)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(mediaAssets.id, id));
    },

    async setRetiredAt(id, value) {
      await getDatabase()
        .update(mediaAssets)
        .set({ retiredAt: value, updatedAt: new Date() })
        .where(eq(mediaAssets.id, id));
    },

    async deleteAsset(id) {
      const rows = await getDatabase()
        .delete(mediaAssets)
        .where(and(eq(mediaAssets.id, id), isNull(mediaAssets.firstPublishedAt)))
        .returning({ id: mediaAssets.id });
      return rows.length === 1;
    },

    async markFirstPublished(assetIds, publishedAt) {
      if (assetIds.length === 0) return;
      await getDatabase()
        .update(mediaAssets)
        .set({ firstPublishedAt: publishedAt, updatedAt: new Date() })
        .where(and(inArray(mediaAssets.id, [...assetIds]), isNull(mediaAssets.firstPublishedAt)));
    },

    async listUsage(assetId, storagePath) {
      const database = getDatabase();
      const [coverRows, heroRows, platformRows, achievementRows, guideRows] = await Promise.all([
        database.select({ entityId: games.id, label: games.name }).from(games).where(eq(games.coverPath, storagePath)),
        database.select({ entityId: games.id, label: games.name }).from(games).where(eq(games.heroPath, storagePath)),
        database.select({ entityId: platforms.id, label: platforms.name }).from(platforms).where(eq(platforms.iconPath, storagePath)),
        database
          .select({ entityId: achievements.id, label: achievements.name, context: games.name })
          .from(achievements)
          .innerJoin(achievementGroups, eq(achievements.achievementGroupId, achievementGroups.id))
          .innerJoin(achievementSets, eq(achievementGroups.achievementSetId, achievementSets.id))
          .innerJoin(games, eq(achievementSets.gameId, games.id))
          .where(eq(achievements.iconPath, storagePath)),
        database
          .select({
            entityId: guideContentNodes.id,
            label: guides.title,
            stepTitle: guideSteps.title,
            sectionTitle: guideSections.title,
          })
          .from(guideContentNodes)
          .innerJoin(guideSections, eq(guideContentNodes.guideSectionId, guideSections.id))
          .innerJoin(guideSteps, eq(guideSections.guideStepId, guideSteps.id))
          .innerJoin(guides, eq(guideSteps.guideId, guides.id))
          .where(and(
            eq(guideContentNodes.type, "image"),
            sql`${guideContentNodes.data} ->> 'assetId' = ${assetId}`,
            isNull(guideContentNodes.retiredAt),
            isNull(guideSections.retiredAt),
            isNull(guideSteps.retiredAt),
            isNull(guides.archivedAt),
          )),
      ]);

      return [
        ...coverRows.map((row) => ({ ...row, kind: "game_cover", context: null }) satisfies MediaUsage),
        ...heroRows.map((row) => ({ ...row, kind: "game_hero", context: null }) satisfies MediaUsage),
        ...platformRows.map((row) => ({ ...row, kind: "platform_icon", context: null }) satisfies MediaUsage),
        ...achievementRows.map((row) => ({ ...row, kind: "achievement_icon" }) satisfies MediaUsage),
        ...guideRows.map((row) => ({
          entityId: row.entityId,
          label: row.label,
          kind: "guide_image" as const,
          context: `${row.stepTitle} / ${row.sectionTitle}`,
        } satisfies MediaUsage)),
      ];
    },

    async listScopeGames() {
      return getDatabase()
        .select({ id: games.id, name: games.name })
        .from(games)
        .where(supavisorPipelineGuard())
        .orderBy(asc(games.name));
    },

    async gameExists(gameId) {
      const rows = await getDatabase()
        .select({ value: count() })
        .from(games)
        .where(eq(games.id, gameId));
      return (rows[0]?.value ?? 0) > 0;
    },
  };
}

export function createDrizzleMediaRepository(database: MediaDatabase): MediaRepository {
  return buildDrizzleMediaRepository(() => database);
}

export const drizzleMediaRepository = buildDrizzleMediaRepository(getDb);
