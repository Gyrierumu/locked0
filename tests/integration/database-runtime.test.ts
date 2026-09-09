import "dotenv/config";

import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  achievementGroups,
  achievementSets,
  achievements,
  checklistItems,
  gameReleases,
  games,
  guideContentNodes,
  guideSections,
  guideSteps,
  guideTargets,
  guideVersions,
  guides,
  mediaAssets,
  platforms,
  profiles,
  releaseAchievementSets,
  userAchievementProgress,
  userChecklistProgress,
  userCompletions,
  userGuideProgress,
  userRoles,
} from "../../src/db/schema";
import * as schema from "../../src/db/schema";

const databaseUrl = process.env.DATABASE_URL;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasSupabaseAuth = Boolean(supabaseUrl && supabaseServiceRoleKey);
const runtimeDescribe = databaseUrl ? describe : describe.skip;
const authIt = hasSupabaseAuth ? it : it.skip;
const runId = randomUUID().slice(0, 8);

type RuntimeDatabase = PostgresJsDatabase<typeof schema>;
type RootSql = ReturnType<typeof postgres>;
type RuntimeTransaction = Parameters<Parameters<RuntimeDatabase["transaction"]>[0]>[0];

class RollbackSignal extends Error {}

function firstRow<T>(rows: T[]): T {
  const row = rows[0];
  if (!row) throw new Error("Expected the database to return one row.");
  return row;
}

async function expectConstraintError(
  transaction: RuntimeTransaction,
  code: "23503" | "23505" | "23514",
  operation: (database: RuntimeTransaction) => Promise<unknown>,
): Promise<void> {
  let databaseError: unknown;

  try {
    await transaction.transaction(async (savepoint) => {
      await operation(savepoint);
    });
  } catch (error) {
    databaseError = error;
  }

  const wrappedError = databaseError as
    | { cause?: { code?: unknown }; code?: unknown }
    | null
    | undefined;
  expect(wrappedError?.cause?.code ?? wrappedError?.code).toBe(code);
}

async function createCatalogGraph(database: RuntimeTransaction, label: string) {
  const game = firstRow(
    await database
      .insert(games)
      .values({ slug: `runtime-game-${label}`, name: `Runtime Game ${label}` })
      .returning(),
  );
  const platform = firstRow(
    await database
      .insert(platforms)
      .values({
        slug: `runtime-platform-${label}`,
        name: `Runtime Platform ${label}`,
        shortName: `RT-${label}`,
      })
      .returning(),
  );
  const release = firstRow(
    await database
      .insert(gameReleases)
      .values({
        gameId: game.id,
        platformId: platform.id,
        key: `release-${label}`,
      })
      .returning(),
  );
  const achievementSet = firstRow(
    await database
      .insert(achievementSets)
      .values({ gameId: game.id, key: `set-${label}`, name: `Runtime Set ${label}` })
      .returning(),
  );

  await database.insert(releaseAchievementSets).values({
    gameReleaseId: release.id,
    achievementSetId: achievementSet.id,
  });

  return { achievementSet, game, platform, release };
}

runtimeDescribe("database runtime", () => {
  let rootSql: RootSql;
  let rootDb: RuntimeDatabase;
  let authClient: ReturnType<typeof createClient> | undefined;
  let authUserId: string | undefined;
  let fixtureCounter = 0;

  function nextLabel(prefix: string): string {
    fixtureCounter += 1;
    return `${prefix}-${runId}-${fixtureCounter}`;
  }

  function requireAuthUser(): string {
    if (!authUserId) throw new Error("Supabase Auth runtime configuration is required.");
    return authUserId;
  }

  function requireAuthClient() {
    if (!authClient) throw new Error("Supabase Auth runtime configuration is required.");
    return authClient;
  }

  async function withRollback(
    operation: (database: RuntimeTransaction, transaction: RuntimeTransaction) => Promise<void>,
  ): Promise<void> {
    try {
      await rootDb.transaction(async (transaction) => {
        await operation(transaction, transaction);
        throw new RollbackSignal("Rollback runtime test fixture.");
      });
    } catch (error) {
      if (!(error instanceof RollbackSignal)) throw error;
    }
  }

  beforeAll(async () => {
    rootSql = postgres(databaseUrl!, { max: 1, prepare: false });
    rootDb = drizzle(rootSql, { schema });

    if (hasSupabaseAuth) {
      authClient = createClient(supabaseUrl!, supabaseServiceRoleKey!, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data, error } = await authClient.auth.admin.createUser({
        email: `platify-runtime-${runId}@example.test`,
        email_confirm: true,
        password: `Runtime-${randomUUID()}-Aa1!`,
      });

      if (error) throw error;
      authUserId = data.user.id;
    }
  }, 30_000);

  afterAll(async () => {
    if (authClient && authUserId) {
      await authClient.auth.admin.deleteUser(authUserId);
    }
    await rootSql.end({ timeout: 5 });
  });

  it("connects and performs insert, select, update, transaction, and rollback", async () => {
    const result = await rootSql<{ value: number }[]>`select 1::int as value`;
    expect(result[0]?.value).toBe(1);

    const label = nextLabel("crud");
    let rolledBackGameId = "";

    await withRollback(async (database) => {
      const inserted = firstRow(
        await database
          .insert(games)
          .values({ slug: `runtime-${label}`, name: "Before update" })
          .returning(),
      );
      rolledBackGameId = inserted.id;

      const selected = await database.query.games.findFirst({
        where: eq(games.id, inserted.id),
      });
      expect(selected?.name).toBe("Before update");

      const updated = firstRow(
        await database
          .update(games)
          .set({ name: "After update", updatedAt: new Date() })
          .where(eq(games.id, inserted.id))
          .returning(),
      );
      expect(updated.name).toBe("After update");
    });

    const afterRollback = await rootDb.query.games.findFirst({
      where: eq(games.id, rolledBackGameId),
    });
    expect(afterRollback).toBeUndefined();
  });

  it("creates and reads the Game, Platform, Release, and AchievementSet graph", async () => {
    await withRollback(async (database) => {
      const graph = await createCatalogGraph(database, nextLabel("graph"));
      const selected = await database.query.gameReleases.findFirst({
        where: eq(gameReleases.id, graph.release.id),
        with: {
          achievementSetLinks: { with: { achievementSet: true } },
          game: true,
          platform: true,
        },
      });

      expect(selected?.game.id).toBe(graph.game.id);
      expect(selected?.platform.id).toBe(graph.platform.id);
      expect(selected?.achievementSetLinks[0]?.achievementSet.id).toBe(graph.achievementSet.id);
    });
  });

  it("enforces editorial partial indexes, checks, revisions, and publication invariants", async () => {
    await withRollback(async (database, transaction) => {
      const graph = await createCatalogGraph(database, nextLabel("editorial"));
      const secondSet = firstRow(
        await database
          .insert(achievementSets)
          .values({ gameId: graph.game.id, key: nextLabel("set"), name: "Second set" })
          .returning(),
      );
      const contentPack = firstRow(
        await database
          .insert(schema.contentPacks)
          .values({
            gameId: graph.game.id,
            slug: nextLabel("pack"),
            name: "Runtime DLC",
            type: "dlc",
          })
          .returning(),
      );

      await database.insert(achievementGroups).values({
        achievementSetId: graph.achievementSet.id,
        name: "Base",
        position: 0,
        type: "base",
      });
      await expectConstraintError(transaction, "23505", (savepointDb) =>
        savepointDb.insert(achievementGroups).values({
          achievementSetId: graph.achievementSet.id,
          name: "Duplicate base",
          position: 1,
          type: "base",
        }),
      );
      await expectConstraintError(transaction, "23514", (savepointDb) =>
        savepointDb.insert(achievementGroups).values({
          achievementSetId: secondSet.id,
          contentPackId: contentPack.id,
          name: "Invalid base pack",
          position: 0,
          type: "base",
        }),
      );

      const guide = firstRow(
        await database
          .insert(guides)
          .values({ gameId: graph.game.id, slug: nextLabel("guide"), title: "Runtime Guide" })
          .returning(),
      );
      expect([guide.draftRevision, guide.structureRevision, guide.editRevision]).toEqual([0, 0, 0]);

      const stepA = firstRow(
        await database
          .insert(guideSteps)
          .values({ guideId: guide.id, anchor: "step-a", title: "Step A", position: 0 })
          .returning(),
      );
      await expectConstraintError(transaction, "23505", (savepointDb) =>
        savepointDb.insert(guideSteps).values({
          guideId: guide.id,
          anchor: "step-conflict",
          title: "Conflict",
          position: 0,
        }),
      );
      await database
        .update(guideSteps)
        .set({ retiredAt: new Date(), updatedAt: new Date() })
        .where(eq(guideSteps.id, stepA.id));
      const stepB = firstRow(
        await database
          .insert(guideSteps)
          .values({ guideId: guide.id, anchor: "step-b", title: "Step B", position: 0 })
          .returning(),
      );

      const sectionA = firstRow(
        await database
          .insert(guideSections)
          .values({ guideStepId: stepB.id, anchor: "section-a", title: "Section A", position: 0 })
          .returning(),
      );
      await expectConstraintError(transaction, "23505", (savepointDb) =>
        savepointDb.insert(guideSections).values({
          guideStepId: stepB.id,
          anchor: "section-conflict",
          title: "Conflict",
          position: 0,
        }),
      );
      await database
        .update(guideSections)
        .set({ retiredAt: new Date(), updatedAt: new Date() })
        .where(eq(guideSections.id, sectionA.id));
      const sectionB = firstRow(
        await database
          .insert(guideSections)
          .values({ guideStepId: stepB.id, anchor: "section-b", title: "Section B", position: 0 })
          .returning(),
      );

      const nodeA = firstRow(
        await database
          .insert(guideContentNodes)
          .values({ guideSectionId: sectionB.id, position: 0, type: "text" })
          .returning(),
      );
      await expectConstraintError(transaction, "23505", (savepointDb) =>
        savepointDb.insert(guideContentNodes).values({
          guideSectionId: sectionB.id,
          position: 0,
          type: "text",
        }),
      );
      await database
        .update(guideContentNodes)
        .set({ retiredAt: new Date(), updatedAt: new Date() })
        .where(eq(guideContentNodes.id, nodeA.id));
      const nodeB = firstRow(
        await database
          .insert(guideContentNodes)
          .values({ guideSectionId: sectionB.id, position: 0, type: "text" })
          .returning(),
      );

      const generalTarget = firstRow(
        await database
          .insert(guideTargets)
          .values({ guideId: guide.id, achievementSetId: graph.achievementSet.id })
          .returning(),
      );
      await expectConstraintError(transaction, "23505", (savepointDb) =>
        savepointDb.insert(guideTargets).values({
          guideId: guide.id,
          achievementSetId: graph.achievementSet.id,
        }),
      );
      await database
        .update(guideTargets)
        .set({ retiredAt: new Date(), updatedAt: new Date() })
        .where(eq(guideTargets.id, generalTarget.id));
      await expectConstraintError(transaction, "23505", (savepointDb) =>
        savepointDb.insert(guideTargets).values({
          guideId: guide.id,
          achievementSetId: graph.achievementSet.id,
        }),
      );

      await database.insert(guideTargets).values({
        guideId: guide.id,
        achievementSetId: graph.achievementSet.id,
        gameReleaseId: graph.release.id,
      });
      await expectConstraintError(transaction, "23505", (savepointDb) =>
        savepointDb.insert(guideTargets).values({
          guideId: guide.id,
          achievementSetId: graph.achievementSet.id,
          gameReleaseId: graph.release.id,
        }),
      );

      const checklistNode = firstRow(
        await database
          .insert(guideContentNodes)
          .values({ guideSectionId: sectionB.id, position: 1, type: "checklist" })
          .returning(),
      );
      const checklistItem = firstRow(
        await database
          .insert(checklistItems)
          .values({ contentNodeId: checklistNode.id, title: "Runtime item" })
          .returning(),
      );

      const negativeRevisionOperations = [
        (savepointDb: RuntimeTransaction) =>
          savepointDb.update(guides).set({ draftRevision: -1 }).where(eq(guides.id, guide.id)),
        (savepointDb: RuntimeTransaction) =>
          savepointDb.update(guides).set({ structureRevision: -1 }).where(eq(guides.id, guide.id)),
        (savepointDb: RuntimeTransaction) =>
          savepointDb.update(guides).set({ editRevision: -1 }).where(eq(guides.id, guide.id)),
        (savepointDb: RuntimeTransaction) =>
          savepointDb
            .update(guideTargets)
            .set({ editRevision: -1 })
            .where(eq(guideTargets.id, generalTarget.id)),
        (savepointDb: RuntimeTransaction) =>
          savepointDb.update(guideSteps).set({ editRevision: -1 }).where(eq(guideSteps.id, stepB.id)),
        (savepointDb: RuntimeTransaction) =>
          savepointDb
            .update(guideSections)
            .set({ editRevision: -1 })
            .where(eq(guideSections.id, sectionB.id)),
        (savepointDb: RuntimeTransaction) =>
          savepointDb
            .update(guideContentNodes)
            .set({ editRevision: -1 })
            .where(eq(guideContentNodes.id, nodeB.id)),
        (savepointDb: RuntimeTransaction) =>
          savepointDb
            .update(checklistItems)
            .set({ editRevision: -1 })
            .where(eq(checklistItems.id, checklistItem.id)),
      ];
      for (const operation of negativeRevisionOperations) {
        await expectConstraintError(transaction, "23514", operation);
      }

      const versionC = firstRow(
        await database
          .insert(guideVersions)
          .values({
            guideId: guide.id,
            versionNumber: 1,
            changelog: "Initial runtime version",
            snapshot: {},
            sourceDraftRevision: 0,
            publishedAt: new Date(),
          })
          .returning(),
      );
      await expectConstraintError(transaction, "23514", (savepointDb) =>
        savepointDb.insert(guideVersions).values({
          guideId: guide.id,
          versionNumber: 2,
          changelog: "No source",
          snapshot: {},
          publishedAt: new Date(),
        }),
      );
      await expectConstraintError(transaction, "23514", (savepointDb) =>
        savepointDb.insert(guideVersions).values({
          guideId: guide.id,
          versionNumber: 2,
          changelog: "Two sources",
          snapshot: {},
          sourceDraftRevision: 0,
          sourceVersionId: versionC.id,
          publishedAt: new Date(),
        }),
      );
      const versionD = firstRow(
        await database
          .insert(guideVersions)
          .values({
            guideId: guide.id,
            versionNumber: 2,
            changelog: "Derived runtime version",
            snapshot: {},
            sourceVersionId: versionC.id,
            publishedAt: new Date(),
          })
          .returning(),
      );
      expect(versionD.sourceDraftRevision).toBeNull();
      await expectConstraintError(transaction, "23514", (savepointDb) =>
        savepointDb.insert(guideVersions).values({
          guideId: guide.id,
          versionNumber: 3,
          changelog: "   ",
          snapshot: {},
          sourceDraftRevision: 0,
          publishedAt: new Date(),
        }),
      );

      await expectConstraintError(transaction, "23514", (savepointDb) =>
        savepointDb
          .update(guides)
          .set({ firstPublishedAt: new Date() })
          .where(eq(guides.id, guide.id)),
      );
      await expectConstraintError(transaction, "23514", (savepointDb) =>
        savepointDb
          .update(guides)
          .set({ publishedVersionId: versionC.id })
          .where(eq(guides.id, guide.id)),
      );
      const publishedAt = new Date();
      const publishedGuide = firstRow(
        await database
          .update(guides)
          .set({ firstPublishedAt: publishedAt, publishedVersionId: versionC.id })
          .where(eq(guides.id, guide.id))
          .returning(),
      );
      expect(publishedGuide.firstPublishedAt).toEqual(publishedAt);
    });
  }, 30_000);

  authIt("enforces identity, media, progress, and FK delete behavior", async () => {
    await withRollback(async (database, transaction) => {
      const userId = requireAuthUser();
      const graph = await createCatalogGraph(database, nextLabel("progress"));
      const group = firstRow(
        await database
          .insert(achievementGroups)
          .values({
            achievementSetId: graph.achievementSet.id,
            name: "Base",
            position: 0,
            type: "base",
          })
          .returning(),
      );
      const achievement = firstRow(
        await database
          .insert(achievements)
          .values({
            achievementGroupId: group.id,
            slug: "runtime-achievement",
            name: "Runtime Achievement",
            achievementType: "standard",
            position: 0,
          })
          .returning(),
      );
      const guide = firstRow(
        await database
          .insert(guides)
          .values({ gameId: graph.game.id, slug: nextLabel("guide"), title: "Progress Guide" })
          .returning(),
      );
      const target = firstRow(
        await database
          .insert(guideTargets)
          .values({ guideId: guide.id, achievementSetId: graph.achievementSet.id })
          .returning(),
      );
      const step = firstRow(
        await database
          .insert(guideSteps)
          .values({ guideId: guide.id, anchor: "position-step", title: "Position", position: 0 })
          .returning(),
      );
      const section = firstRow(
        await database
          .insert(guideSections)
          .values({
            guideStepId: step.id,
            anchor: "position-section",
            title: "Position",
            position: 0,
          })
          .returning(),
      );
      const contentNode = firstRow(
        await database
          .insert(guideContentNodes)
          .values({ guideSectionId: section.id, position: 0, type: "text" })
          .returning(),
      );

      const profile = firstRow(
        await database
          .insert(profiles)
          .values({ userId, username: `platify_${runId}` })
          .returning(),
      );
      expect(profile.username).toBe(`platify_${runId}`);
      await expectConstraintError(transaction, "23514", (savepointDb) =>
        savepointDb.update(profiles).set({ username: "PlatifyUser" }).where(eq(profiles.userId, userId)),
      );
      await expectConstraintError(transaction, "23514", (savepointDb) =>
        savepointDb.update(profiles).set({ username: "x" }).where(eq(profiles.userId, userId)),
      );

      await database.insert(userRoles).values([
        { userId, role: "author" },
        { userId, role: "editor" },
        { userId, role: "admin" },
      ]);
      await expectConstraintError(transaction, "23514", (savepointDb) =>
        savepointDb.insert(userRoles).values({ userId, role: "superuser" }),
      );

      await database.insert(mediaAssets).values({
        storagePath: `runtime/${runId}/valid.png`,
        originalFilename: "valid.png",
        mimeType: "image/png",
        byteSize: 1,
        width: 1,
        height: null,
      });
      await expectConstraintError(transaction, "23514", (savepointDb) =>
        savepointDb.insert(mediaAssets).values({
          storagePath: `runtime/${runId}/zero.png`,
          originalFilename: "zero.png",
          mimeType: "image/png",
          byteSize: 0,
        }),
      );
      await expectConstraintError(transaction, "23514", (savepointDb) =>
        savepointDb.insert(mediaAssets).values({
          storagePath: `runtime/${runId}/width.png`,
          originalFilename: "width.png",
          mimeType: "image/png",
          byteSize: 1,
          width: -1,
        }),
      );

      const completion = firstRow(
        await database
          .insert(userCompletions)
          .values({ userId, achievementSetId: graph.achievementSet.id, startedAt: new Date() })
          .returning(),
      );
      await expectConstraintError(transaction, "23505", (savepointDb) =>
        savepointDb.insert(userCompletions).values({
          userId,
          achievementSetId: graph.achievementSet.id,
          startedAt: new Date(),
        }),
      );
      await expectConstraintError(transaction, "23514", (savepointDb) =>
        savepointDb
          .update(userCompletions)
          .set({ goal: "invalid" })
          .where(eq(userCompletions.id, completion.id)),
      );

      await database.insert(userAchievementProgress).values({
        userCompletionId: completion.id,
        achievementId: achievement.id,
      });
      await expectConstraintError(transaction, "23505", (savepointDb) =>
        savepointDb.insert(userAchievementProgress).values({
          userCompletionId: completion.id,
          achievementId: achievement.id,
        }),
      );
      await expectConstraintError(transaction, "23503", (savepointDb) =>
        savepointDb.delete(achievements).where(eq(achievements.id, achievement.id)),
      );

      const guideProgress = firstRow(
        await database
          .insert(userGuideProgress)
          .values({
            userId,
            guideTargetId: target.id,
            achievementSetId: graph.achievementSet.id,
            userCompletionId: completion.id,
            startedAt: new Date(),
            lastActivityAt: new Date(),
            lastStepId: step.id,
            lastSectionId: section.id,
            lastContentNodeId: contentNode.id,
          })
          .returning(),
      );
      await expectConstraintError(transaction, "23505", (savepointDb) =>
        savepointDb.insert(userGuideProgress).values({
          userId,
          guideTargetId: target.id,
          achievementSetId: graph.achievementSet.id,
          userCompletionId: completion.id,
          startedAt: new Date(),
          lastActivityAt: new Date(),
        }),
      );

      await database.delete(guideContentNodes).where(eq(guideContentNodes.id, contentNode.id));
      let survivingProgress = await database.query.userGuideProgress.findFirst({
        where: eq(userGuideProgress.id, guideProgress.id),
      });
      expect(survivingProgress?.lastContentNodeId).toBeNull();
      await database.delete(guideSections).where(eq(guideSections.id, section.id));
      survivingProgress = await database.query.userGuideProgress.findFirst({
        where: eq(userGuideProgress.id, guideProgress.id),
      });
      expect(survivingProgress?.lastSectionId).toBeNull();
      await database.delete(guideSteps).where(eq(guideSteps.id, step.id));
      survivingProgress = await database.query.userGuideProgress.findFirst({
        where: eq(userGuideProgress.id, guideProgress.id),
      });
      expect(survivingProgress?.lastStepId).toBeNull();

      const checklistStep = firstRow(
        await database
          .insert(guideSteps)
          .values({ guideId: guide.id, anchor: "checklist-step", title: "Checklist", position: 0 })
          .returning(),
      );
      const checklistSection = firstRow(
        await database
          .insert(guideSections)
          .values({
            guideStepId: checklistStep.id,
            anchor: "checklist-section",
            title: "Checklist",
            position: 0,
          })
          .returning(),
      );
      const checklistNode = firstRow(
        await database
          .insert(guideContentNodes)
          .values({ guideSectionId: checklistSection.id, position: 0, type: "checklist" })
          .returning(),
      );
      const checklistItem = firstRow(
        await database
          .insert(checklistItems)
          .values({ contentNodeId: checklistNode.id, title: "Runtime checklist item" })
          .returning(),
      );

      await database.insert(userChecklistProgress).values({
        userGuideProgressId: guideProgress.id,
        checklistItemId: checklistItem.id,
        completedAt: new Date(),
      });
      await expectConstraintError(transaction, "23505", (savepointDb) =>
        savepointDb.insert(userChecklistProgress).values({
          userGuideProgressId: guideProgress.id,
          checklistItemId: checklistItem.id,
          completedAt: new Date(),
        }),
      );

      await database.delete(gameReleases).where(eq(gameReleases.id, graph.release.id));
      const cascadedAssociation = await database.query.releaseAchievementSets.findFirst({
        where: eq(releaseAchievementSets.gameReleaseId, graph.release.id),
      });
      expect(cascadedAssociation).toBeUndefined();
    });
  }, 30_000);

  authIt("preserves authored history when a Supabase Auth user is deleted", async () => {
    const client = requireAuthClient();
    const label = nextLabel("author");
    let temporaryUserId: string | undefined;
    let gameId: string | undefined;
    let guideId: string | undefined;
    let versionId: string | undefined;

    try {
      const { data, error } = await client.auth.admin.createUser({
        email: `platify-author-${label}@example.test`,
        email_confirm: true,
        password: `Runtime-${randomUUID()}-Aa1!`,
      });
      if (error) throw error;
      temporaryUserId = data.user.id;

      const game = firstRow(
        await rootDb
          .insert(games)
          .values({ slug: `runtime-${label}`, name: "Authorship Runtime Game" })
          .returning(),
      );
      gameId = game.id;
      const guide = firstRow(
        await rootDb
          .insert(guides)
          .values({
            gameId: game.id,
            slug: `runtime-${label}`,
            title: "Authorship Runtime Guide",
            createdBy: temporaryUserId,
          })
          .returning(),
      );
      guideId = guide.id;
      const version = firstRow(
        await rootDb
          .insert(guideVersions)
          .values({
            guideId: guide.id,
            versionNumber: 1,
            changelog: "Runtime authorship",
            snapshot: {},
            sourceDraftRevision: 0,
            publishedBy: temporaryUserId,
            publishedAt: new Date(),
          })
          .returning(),
      );
      versionId = version.id;

      const { error: deleteError } = await client.auth.admin.deleteUser(temporaryUserId);
      if (deleteError) throw deleteError;
      temporaryUserId = undefined;

      const preservedGuide = await rootDb.query.guides.findFirst({ where: eq(guides.id, guide.id) });
      const preservedVersion = await rootDb.query.guideVersions.findFirst({
        where: eq(guideVersions.id, version.id),
      });
      expect(preservedGuide?.createdBy).toBeNull();
      expect(preservedVersion?.publishedBy).toBeNull();
    } finally {
      if (versionId) await rootDb.delete(guideVersions).where(eq(guideVersions.id, versionId));
      if (guideId) await rootDb.delete(guides).where(eq(guides.id, guideId));
      if (gameId) await rootDb.delete(games).where(eq(games.id, gameId));
      if (temporaryUserId) await client.auth.admin.deleteUser(temporaryUserId);
    }
  }, 30_000);
});
