import "dotenv/config";

import { randomUUID } from "node:crypto";

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import * as schema from "../../src/db/schema";

vi.mock("server-only", () => ({}));

import { CatalogError } from "../../src/modules/catalog/domain/errors";
import type { CatalogRepository } from "../../src/modules/catalog/application/ports/catalog-repository";
import { createDrizzleCatalogRepository } from "../../src/modules/catalog/infrastructure/repositories/drizzle-catalog-repository";

const databaseUrl = process.env.DATABASE_URL;
const runtimeDescribe = databaseUrl ? describe : describe.skip;
const runId = randomUUID().slice(0, 8);

type RuntimeDatabase = PostgresJsDatabase<typeof schema>;
type RuntimeTransaction = Parameters<Parameters<RuntimeDatabase["transaction"]>[0]>[0];
type RootSql = ReturnType<typeof postgres>;

class RollbackSignal extends Error {}

runtimeDescribe("catalog repository runtime", () => {
  let rootSql: RootSql;
  let rootDb: RuntimeDatabase;

  async function withRollback(operation: (transaction: RuntimeTransaction) => Promise<void>) {
    try {
      await rootDb.transaction(async (transaction) => {
        await operation(transaction);
        throw new RollbackSignal("Rollback Catalog Admin fixture.");
      });
    } catch (error) {
      if (!(error instanceof RollbackSignal)) throw error;
    }
  }

  async function expectCatalogConflict(
    transaction: RuntimeTransaction,
    code: string,
    operation: (repository: CatalogRepository) => Promise<unknown>,
  ) {
    let captured: unknown;
    try {
      await transaction.transaction(async (savepoint) => {
        await operation(createDrizzleCatalogRepository(savepoint));
      });
    } catch (error) {
      captured = error;
    }
    expect(captured).toBeInstanceOf(CatalogError);
    expect(captured).toMatchObject({ code });
  }

  beforeAll(() => {
    rootSql = postgres(databaseUrl!, { max: 1, prepare: false });
    rootDb = drizzle(rootSql, { schema });
  });

  afterAll(async () => {
    await rootSql.end({ timeout: 5 });
  });

  it("searches by name and slug, filters status, and paginates on the server", async () => {
    await withRollback(async (transaction) => {
      const repository = createDrizzleCatalogRepository(transaction);
      const prefix = `catalog-${runId}`;

      for (let index = 0; index < 27; index += 1) {
        await repository.createGame({
          name: `${prefix} Game ${index}`,
          slug: `${prefix}-game-${index}`,
          summary: null,
          developerName: index === 0 ? "Needle Search Studio" : null,
          publisherName: null,
          releaseDate: null,
          status: index === 26 ? "archived" : "active",
        });
      }

      const firstPage = await repository.listGames({
        q: prefix,
        status: "all",
        page: 1,
        pageSize: 25,
      });
      const secondPage = await repository.listGames({
        q: prefix,
        status: "all",
        page: 2,
        pageSize: 25,
      });
      const byName = await repository.listGames({
        q: `${prefix} Game 3`,
        status: "all",
        page: 1,
        pageSize: 25,
      });
      const bySlug = await repository.listGames({
        q: `${prefix}-game-4`,
        status: "all",
        page: 1,
        pageSize: 25,
      });
      const byDeveloper = await repository.listGames({
        q: "Needle Search Studio",
        status: "all",
        page: 1,
        pageSize: 25,
      });
      const archived = await repository.listGames({
        q: prefix,
        status: "archived",
        page: 1,
        pageSize: 25,
      });

      expect(firstPage).toMatchObject({ page: 1, pageSize: 25, total: 27, totalPages: 2 });
      expect(firstPage.items).toHaveLength(25);
      expect(secondPage.items).toHaveLength(2);
      expect(byName.items.some((item) => item.name === `${prefix} Game 3`)).toBe(true);
      expect(bySlug.items.some((item) => item.slug === `${prefix}-game-4`)).toBe(true);
      expect(byDeveloper.items).toHaveLength(1);
      expect(archived.items).toHaveLength(1);
      expect(archived.items[0]?.status).toBe("archived");
    });
  }, 30_000);

  it("returns the real release and content pack counts in the game context", async () => {
    await withRollback(async (transaction) => {
      const repository = createDrizzleCatalogRepository(transaction);
      const suffix = `counts-${runId}`;
      const game = await repository.createGame({
        name: "Counted game",
        slug: `${suffix}-game`,
        summary: null,
        developerName: null,
        publisherName: null,
        releaseDate: null,
        status: "active",
      });
      const platform = await repository.createPlatform({
        name: "Counted platform",
        shortName: "CNT",
        slug: `${suffix}-platform`,
        sortOrder: 0,
        isActive: true,
      });

      await repository.createGameRelease(game.id, {
        platformId: platform.id,
        key: "global",
        name: null,
        regionCode: null,
        releaseDate: null,
      });
      await repository.createGameRelease(game.id, {
        platformId: platform.id,
        key: "japan",
        name: null,
        regionCode: "JP",
        releaseDate: null,
      });
      await repository.createContentPack(game.id, {
        name: "Counted expansion",
        slug: "counted-expansion",
        type: "expansion",
        description: null,
        releaseDate: null,
        status: "active",
      });

      await expect(repository.findGameContext(game.id)).resolves.toMatchObject({
        id: game.id,
        releaseCount: 2,
        contentPackCount: 1,
      });
      const games = await repository.listGames({
        q: suffix,
        status: "all",
        page: 1,
        pageSize: 25,
      });
      expect(games.items).toEqual([
        expect.objectContaining({
          id: game.id,
          releaseCount: 2,
          contentPackCount: 1,
        }),
      ]);
    });
  }, 30_000);

  it("maps unique constraints and keeps their intended scopes", async () => {
    await withRollback(async (transaction) => {
      const repository = createDrizzleCatalogRepository(transaction);
      const suffix = `scope-${runId}`;
      const firstGame = await repository.createGame({
        name: "First scope game",
        slug: `${suffix}-first`,
        summary: null,
        developerName: null,
        publisherName: null,
        releaseDate: null,
        status: "active",
      });
      const secondGame = await repository.createGame({
        name: "Second scope game",
        slug: `${suffix}-second`,
        summary: null,
        developerName: null,
        publisherName: null,
        releaseDate: null,
        status: "active",
      });

      await expectCatalogConflict(transaction, "duplicate_game_slug", (savepointRepository) =>
        savepointRepository.createGame({
          name: "Duplicate game",
          slug: `${suffix}-first`,
          summary: null,
          developerName: null,
          publisherName: null,
          releaseDate: null,
          status: "active",
        }),
      );

      const platform = await repository.createPlatform({
        name: "Runtime platform",
        shortName: "RTP",
        slug: `${suffix}-platform`,
        sortOrder: 0,
        isActive: true,
      });
      await expectCatalogConflict(
        transaction,
        "duplicate_platform_slug",
        (savepointRepository) =>
          savepointRepository.createPlatform({
          name: "Duplicate platform",
          shortName: "DUP",
          slug: `${suffix}-platform`,
          sortOrder: 1,
          isActive: true,
        }),
      );

      const firstRelease = await repository.createGameRelease(firstGame.id, {
        platformId: platform.id,
        key: "global",
        name: null,
        regionCode: null,
        releaseDate: null,
      });
      const secondRelease = await repository.createGameRelease(firstGame.id, {
        platformId: platform.id,
        key: "japan",
        name: null,
        regionCode: "JP",
        releaseDate: null,
      });
      expect(firstRelease.id).not.toBe(secondRelease.id);
      await expectCatalogConflict(transaction, "duplicate_release_key", (savepointRepository) =>
        savepointRepository.createGameRelease(firstGame.id, {
          platformId: platform.id,
          key: "global",
          name: null,
          regionCode: null,
          releaseDate: null,
        }),
      );

      await repository.createContentPack(firstGame.id, {
        name: "Shared slug first",
        slug: "shared-expansion",
        type: "expansion",
        description: null,
        releaseDate: null,
        status: "active",
      });
      await repository.createContentPack(secondGame.id, {
        name: "Shared slug second",
        slug: "shared-expansion",
        type: "dlc",
        description: null,
        releaseDate: null,
        status: "active",
      });
      await expectCatalogConflict(
        transaction,
        "duplicate_content_pack_slug",
        (savepointRepository) =>
          savepointRepository.createContentPack(firstGame.id, {
          name: "Duplicate pack",
          slug: "shared-expansion",
          type: "dlc",
          description: null,
          releaseDate: null,
          status: "active",
        }),
      );
    });
  }, 30_000);
});
