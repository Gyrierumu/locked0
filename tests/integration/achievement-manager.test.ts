import "dotenv/config";

import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import * as schema from "../../src/db/schema";
import {
  achievementGroups,
  achievementSets,
  achievements,
  gameReleases,
  games,
  platforms,
  releaseAchievementSets,
} from "../../src/db/schema";

vi.mock("server-only", () => ({}));

import {
  applyAchievementPaste,
  archiveAchievement,
  createAchievement,
  createAchievementGroup,
  createAchievementSet,
  moveAchievement,
  reorderAchievementGroups,
  restoreAchievement,
  updateAchievementSet,
} from "../../src/modules/catalog/application/commands/achievement-commands";
import type { AchievementRepository } from "../../src/modules/catalog/application/ports/achievement-repository";
import { getAchievementSetWorkspace } from "../../src/modules/catalog/application/queries/achievement-queries";
import { createDrizzleAchievementRepository } from "../../src/modules/catalog/infrastructure/repositories/drizzle-achievement-repository";

const databaseUrl = process.env.DATABASE_URL;
const runtimeDescribe = databaseUrl ? describe : describe.skip;
const runId = randomUUID().slice(0, 8);

type RuntimeDatabase = PostgresJsDatabase<typeof schema>;
type RuntimeTransaction = Parameters<Parameters<RuntimeDatabase["transaction"]>[0]>[0];
type RootSql = ReturnType<typeof postgres>;

class RollbackSignal extends Error {}

function firstRow<T>(rows: T[]): T {
  const row = rows[0];
  if (!row) throw new Error("Expected one database row.");
  return row;
}

runtimeDescribe("Achievement Manager runtime", () => {
  let rootSql: RootSql;
  let rootDb: RuntimeDatabase;
  let counter = 0;

  function label(prefix: string): string {
    counter += 1;
    return `${prefix}-${runId}-${counter}`;
  }

  async function withRollback(operation: (transaction: RuntimeTransaction) => Promise<void>) {
    try {
      await rootDb.transaction(async (transaction) => {
        await operation(transaction);
        throw new RollbackSignal("Rollback Achievement Manager fixture.");
      });
    } catch (error) {
      if (!(error instanceof RollbackSignal)) throw error;
    }
  }

  function repository(transaction: RuntimeTransaction): AchievementRepository {
    return createDrizzleAchievementRepository(
      transaction,
      (operation) => transaction.transaction(operation),
    );
  }

  async function fixture(transaction: RuntimeTransaction) {
    const suffix = label("achievement");
    const game = firstRow(await transaction.insert(games).values({ slug: `${suffix}-game`, name: "Elden Ring" }).returning());
    const otherGame = firstRow(await transaction.insert(games).values({ slug: `${suffix}-other`, name: "Other game" }).returning());
    const platform = firstRow(await transaction.insert(platforms).values({ slug: `${suffix}-ps5`, name: "PlayStation 5", shortName: "PS5" }).returning());
    const releases = await transaction.insert(gameReleases).values([
      { gameId: game.id, platformId: platform.id, key: "global", name: "PS5 Global" },
      { gameId: game.id, platformId: platform.id, key: "japan", name: "PS5 Japan" },
      { gameId: otherGame.id, platformId: platform.id, key: "other", name: "Other release" },
    ]).returning();
    return { game, otherGame, platform, releases };
  }

  beforeAll(() => {
    rootSql = postgres(databaseUrl!, { max: 1, prepare: false });
    rootDb = drizzle(rootSql, { schema });
  });

  afterAll(async () => {
    await rootSql.end({ timeout: 5 });
  });

  it("creates Set + one Base Group + multiple same-game links atomically", async () => {
    await withRollback(async (transaction) => {
      const graph = await fixture(transaction);
      const repo = repository(transaction);
      const releaseIds = graph.releases.slice(0, 2).map((release) => release.id);
      const created = await createAchievementSet(
        { roles: ["editor"], repository: repo },
        { gameId: graph.game.id, name: "Elden Ring — PS5", key: "ps5-global", regionCode: null, status: "active", releaseIds },
      );

      const groups = await repo.listAchievementGroups(created.id);
      const links = await transaction.select().from(releaseAchievementSets).where(eq(releaseAchievementSets.achievementSetId, created.id));
      expect(groups).toHaveLength(1);
      expect(groups[0]).toMatchObject({ name: "Base Game", type: "base", position: 0, contentPack: null });
      expect(links.map((link) => link.gameReleaseId).sort()).toEqual([...releaseIds].sort());

      await expect(createAchievementSet(
        { roles: ["editor"], repository: repo },
        { gameId: graph.game.id, name: "Duplicate", key: "ps5-global", regionCode: null, status: "active", releaseIds: [] },
      )).rejects.toMatchObject({ code: "duplicate_achievement_set_key" });
      await expect(createAchievementSet(
        { roles: ["editor"], repository: repo },
        { gameId: graph.game.id, name: "Cross game", key: "cross-game", regionCode: null, status: "active", releaseIds: [graph.releases[2]!.id] },
      )).rejects.toMatchObject({ code: "cross_game_release" });
    });
  }, 30_000);

  it("rolls back a Set and its Base Group when release linking fails", async () => {
    await withRollback(async (transaction) => {
      const graph = await fixture(transaction);
      const baseRepository = repository(transaction);
      const failingRepository: AchievementRepository = {
        ...baseRepository,
        transaction: (operation) => transaction.transaction(async (savepoint) => {
          const scoped = createDrizzleAchievementRepository(savepoint);
          return operation({
            ...scoped,
            replaceAchievementSetReleases: async () => {
              throw new Error("simulated link failure");
            },
          });
        }),
      };

      await expect(createAchievementSet(
        { roles: ["editor"], repository: failingRepository },
        { gameId: graph.game.id, name: "Must rollback", key: "must-rollback", regionCode: null, status: "active", releaseIds: [graph.releases[0]!.id] },
      )).rejects.toThrow("simulated link failure");
      const leaked = await transaction.select().from(achievementSets).where(and(eq(achievementSets.gameId, graph.game.id), eq(achievementSets.key, "must-rollback")));
      expect(leaked).toHaveLength(0);
    });
  }, 30_000);

  it("round-trips Achievement Set status through the read query", async () => {
    await withRollback(async (transaction) => {
      const graph = await fixture(transaction);
      const repo = repository(transaction);
      const createdSet = await createAchievementSet(
        { roles: ["editor"], repository: repo },
        {
          gameId: graph.game.id,
          name: "Lifecycle Set",
          key: "lifecycle",
          regionCode: null,
          status: "active",
          releaseIds: [],
        },
      );
      const context = { roles: ["author"] as const, repository: repo };

      await expect(
        getAchievementSetWorkspace(context, graph.game.id, createdSet.id),
      ).resolves.toMatchObject({ id: createdSet.id, status: "active" });

      await updateAchievementSet(
        { roles: ["editor"], repository: repo },
        graph.game.id,
        createdSet.id,
        { name: "Lifecycle Set", key: "lifecycle", regionCode: null, status: "archived" },
      );
      await expect(
        getAchievementSetWorkspace(context, graph.game.id, createdSet.id),
      ).resolves.toMatchObject({ id: createdSet.id, status: "archived" });

      await updateAchievementSet(
        { roles: ["admin"], repository: repo },
        graph.game.id,
        createdSet.id,
        { name: "Lifecycle Set", key: "lifecycle", regionCode: null, status: "active" },
      );
      await expect(
        getAchievementSetWorkspace(context, graph.game.id, createdSet.id),
      ).resolves.toMatchObject({ id: createdSet.id, status: "active" });
    });
  }, 30_000);

  it("supports Groups, canonical grid filters, paste, move, and lifecycle without replacing IDs", async () => {
    await withRollback(async (transaction) => {
      const graph = await fixture(transaction);
      const repo = repository(transaction);
      const createdSet = await createAchievementSet(
        { roles: ["admin"], repository: repo },
        { gameId: graph.game.id, name: "Runtime Set", key: "runtime", regionCode: null, status: "active", releaseIds: [graph.releases[0]!.id] },
      );
      const base = (await repo.listAchievementGroups(createdSet.id))[0]!;
      const dlc = await createAchievementGroup(
        { roles: ["editor"], repository: repo }, graph.game.id, createdSet.id,
        { name: "DLC", type: "dlc", contentPackId: null },
      );

      await applyAchievementPaste(
        { roles: ["editor"], repository: repo },
        { gameId: graph.game.id, achievementSetId: createdSet.id, targetGroupId: base.id, text: "name\ttype\thidden\tpoints\nElden Ring\tplatinum\tfalse\t\nElden Lord\tgold\ttrue\t50" },
      );
      const created = await createAchievement(
        { roles: ["editor"], repository: repo }, graph.game.id, createdSet.id,
        { achievementGroupId: dlc.id, name: "DLC One", slug: "dlc-one", description: null, achievementType: "bronze", points: 10, isHidden: false, status: "active" },
      );
      const sameSlugOtherGroup = await createAchievement(
        { roles: ["editor"], repository: repo }, graph.game.id, createdSet.id,
        { achievementGroupId: dlc.id, name: "Same slug in DLC", slug: "elden-ring", description: null, achievementType: "standard", points: null, isHidden: false, status: "active" },
      );
      expect(sameSlugOtherGroup.id).not.toBe(created.id);
      await expect(repo.getAchievementSummary(createdSet.id)).resolves.toEqual({ hiddenCount: 1, pointsTotal: 60 });
      const setListItem = (await repo.listAchievementSets(graph.game.id)).find((item) => item.id === createdSet.id);
      expect(setListItem).toMatchObject({ achievementCount: 4, typeCounts: { platinum: 1, gold: 1, bronze: 1, standard: 1 }, linkedReleases: [{ id: graph.releases[0]!.id }] });

      const filtered = await repo.listAchievements(createdSet.id, { q: "elden", groupId: base.id, type: "gold", status: "active", hidden: "hidden", page: 1, pageSize: 100 });
      expect(filtered.items.map((item) => item.slug)).toEqual(["elden-lord"]);
      const canonical = await repo.listAchievements(createdSet.id, { q: "", groupId: null, type: "all", status: "all", hidden: "all", page: 1, pageSize: 100 });
      expect(canonical.items.map((item) => item.slug)).toEqual(["elden-ring", "elden-lord", "dlc-one", "elden-ring"]);

      await moveAchievement({ roles: ["editor"], repository: repo }, graph.game.id, createdSet.id, created.id, base.id);
      await moveAchievement({ roles: ["editor"], repository: repo }, graph.game.id, createdSet.id, created.id, dlc.id);
      await archiveAchievement({ roles: ["editor"], repository: repo }, graph.game.id, createdSet.id, created.id);
      await restoreAchievement({ roles: ["admin"], repository: repo }, graph.game.id, createdSet.id, created.id);
      const moved = await repo.findAchievement(createdSet.id, created.id);
      expect(moved).toMatchObject({ id: created.id, achievementGroupId: dlc.id, position: 1, status: "active" });
      expect((await repo.listGroupAchievements(base.id)).map((item) => item.position)).toEqual([0, 1]);
      expect((await repo.listGroupAchievements(dlc.id)).map((item) => item.position)).toEqual([0, 1]);

      await reorderAchievementGroups({ roles: ["editor"], repository: repo }, graph.game.id, createdSet.id, [dlc.id, base.id]);
      expect((await repo.listAchievementGroups(createdSet.id)).map((group) => group.id)).toEqual([dlc.id, base.id]);

      await expect(transaction.transaction((savepoint) =>
        createDrizzleAchievementRepository(savepoint).createAchievement({ achievementGroupId: base.id, name: "Duplicate slug", slug: "elden-ring", description: null, achievementType: "standard", points: null, isHidden: false, status: "active", position: 99 }),
      )).rejects.toMatchObject({ code: "duplicate_achievement_slug" });
      const stored = await transaction.select().from(achievements).innerJoin(achievementGroups, eq(achievements.achievementGroupId, achievementGroups.id)).where(eq(achievementGroups.achievementSetId, createdSet.id));
      expect(stored).toHaveLength(4);
    });
  }, 30_000);
});
