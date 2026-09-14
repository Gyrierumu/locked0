import "dotenv/config";

import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import * as schema from "../../src/db/schema";
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
} from "../../src/db/schema";

vi.mock("server-only", () => ({}));

import { createDrizzleMediaRepository } from "../../src/modules/media/infrastructure/repositories/drizzle-media-repository";

const databaseUrl = process.env.DATABASE_URL;
const runtimeDescribe = databaseUrl ? describe : describe.skip;
const runId = randomUUID().slice(0, 8);

type RuntimeDatabase = PostgresJsDatabase<typeof schema>;
type RuntimeTransaction = Parameters<Parameters<RuntimeDatabase["transaction"]>[0]>[0];
type RootSql = ReturnType<typeof postgres>;

class RollbackSignal extends Error {}

function first<T>(rows: T[]): T {
  const row = rows[0];
  if (!row) throw new Error("Expected one fixture row.");
  return row;
}

runtimeDescribe("Media Manager repository runtime", () => {
  let rootSql: RootSql;
  let rootDb: RuntimeDatabase;

  beforeAll(() => {
    rootSql = postgres(databaseUrl!, { max: 1, prepare: false });
    rootDb = drizzle(rootSql, { schema });
  });

  afterAll(async () => {
    await rootSql.end({ timeout: 5 });
  });

  async function withRollback(operation: (transaction: RuntimeTransaction) => Promise<void>) {
    try {
      await rootDb.transaction(async (transaction) => {
        await operation(transaction);
        throw new RollbackSignal("Rollback Media Manager fixture.");
      });
    } catch (error) {
      if (!(error instanceof RollbackSignal)) throw error;
    }
  }

  it("filters, searches and paginates assets newest-first", async () => {
    await withRollback(async (transaction) => {
      const game = first(await transaction.insert(games).values({ slug: `media-${runId}`, name: "Elden Ring" }).returning());
      const older = new Date("2026-01-01T00:00:00Z");
      const newer = new Date("2026-02-01T00:00:00Z");
      await transaction.insert(mediaAssets).values([
        { id: randomUUID(), scopeGameId: game.id, storagePath: `editorial/${runId}/one.png`, originalFilename: "world-map.png", mimeType: "image/png", byteSize: 10, width: 2, height: 2, credit: "Cartographer", createdAt: older },
        { id: randomUUID(), scopeGameId: game.id, storagePath: `editorial/${runId}/two.png`, originalFilename: "boss.png", mimeType: "image/png", byteSize: 10, width: 2, height: 2, sourceUrl: "https://example.com/needle", createdAt: newer },
        { id: randomUUID(), storagePath: `editorial/${runId}/retired.png`, originalFilename: "retired.png", mimeType: "image/png", byteSize: 10, width: 2, height: 2, retiredAt: new Date() },
      ]);
      const repository = createDrizzleMediaRepository(transaction);
      const active = await repository.listAssets({ q: "", gameId: game.id, status: "active", page: 1, pageSize: 24 });
      expect(active.items.map((item) => item.originalFilename)).toEqual(["boss.png", "world-map.png"]);
      await expect(repository.listAssets({ q: "cartographer", gameId: null, status: "all", page: 1, pageSize: 24 })).resolves.toMatchObject({ total: 1 });
      await expect(repository.listAssets({ q: "needle", gameId: null, status: "all", page: 1, pageSize: 24 })).resolves.toMatchObject({ total: 1 });
      await expect(repository.listAssets({ q: "", gameId: null, status: "retired", page: 1, pageSize: 24 })).resolves.toMatchObject({ total: 1 });
    });
  }, 30_000);

  it("derives all current usage kinds and ignores retired Guide image nodes", async () => {
    await withRollback(async (transaction) => {
      const game = first(await transaction.insert(games).values({ slug: `usage-${runId}`, name: "Usage Game" }).returning());
      const platform = first(await transaction.insert(platforms).values({ slug: `usage-${runId}`, name: "PS5", shortName: "PS5" }).returning());
      const set = first(await transaction.insert(achievementSets).values({ gameId: game.id, key: "main", name: "Main" }).returning());
      const group = first(await transaction.insert(achievementGroups).values({ achievementSetId: set.id, name: "Base", type: "base", position: 0 }).returning());
      const achievement = first(await transaction.insert(achievements).values({ achievementGroupId: group.id, slug: "legend", name: "Legend", achievementType: "gold", position: 0 }).returning());
      const assetId = randomUUID();
      const storagePath = `editorial/${assetId}/asset.png`;
      await transaction.insert(mediaAssets).values({ id: assetId, storagePath, originalFilename: "usage.png", mimeType: "image/png", byteSize: 10 });
      await transaction.update(games).set({ coverPath: storagePath, heroPath: storagePath }).where(eq(games.id, game.id));
      await transaction.update(platforms).set({ iconPath: storagePath }).where(eq(platforms.id, platform.id));
      await transaction.update(achievements).set({ iconPath: storagePath }).where(eq(achievements.id, achievement.id));
      const guide = first(await transaction.insert(guides).values({ gameId: game.id, slug: `guide-${runId}`, title: "Guide" }).returning());
      const step = first(await transaction.insert(guideSteps).values({ guideId: guide.id, anchor: "step", title: "Step", position: 0 }).returning());
      const section = first(await transaction.insert(guideSections).values({ guideStepId: step.id, anchor: "section", title: "Section", position: 0 }).returning());
      const node = first(await transaction.insert(guideContentNodes).values({ guideSectionId: section.id, type: "image", position: 0, data: { assetId } }).returning());
      const repository = createDrizzleMediaRepository(transaction);
      const usages = await repository.listUsage(assetId, storagePath);
      expect(usages.map((usage) => usage.kind).sort()).toEqual(["achievement_icon", "game_cover", "game_hero", "guide_image", "platform_icon"].sort());
      await transaction.update(guideContentNodes).set({ retiredAt: new Date() }).where(eq(guideContentNodes.id, node.id));
      const afterRetirement = await repository.listUsage(assetId, storagePath);
      expect(afterRetirement.some((usage) => usage.kind === "guide_image")).toBe(false);
    });
  }, 30_000);

  it("marks publication once and preserves the original timestamp", async () => {
    await withRollback(async (transaction) => {
      const assetId = randomUUID();
      await transaction.insert(mediaAssets).values({ id: assetId, storagePath: `editorial/${assetId}/asset.png`, originalFilename: "publish.png", mimeType: "image/png", byteSize: 10 });
      const repository = createDrizzleMediaRepository(transaction);
      const firstPublishedAt = new Date("2026-03-01T00:00:00Z");
      await repository.markFirstPublished([assetId], firstPublishedAt);
      await repository.markFirstPublished([assetId], new Date("2026-04-01T00:00:00Z"));
      const stored = await repository.findAsset(assetId);
      expect(stored?.firstPublishedAt).toEqual(firstPublishedAt);
    });
  }, 30_000);
});
