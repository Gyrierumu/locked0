import { drizzle } from "drizzle-orm/postgres-js";
import { describe, expect, it, vi } from "vitest";

import * as schema from "@/db/schema";

vi.mock("server-only", () => ({}));

import { createDrizzleCatalogRepository } from "./drizzle-catalog-repository";

const gameId = "11111111-1111-4111-8111-111111111111";
const platformId = "22222222-2222-4222-8222-222222222222";

function repositoryWithRows() {
  const queries: string[] = [];
  const parameters: unknown[][] = [];
  const client = {
    options: { parsers: {}, serializers: {} },
    unsafe: vi.fn((query: string, params: unknown[]) => {
      queries.push(query);
      parameters.push(params);

      if (query.startsWith('select count(*) from "games"')) {
        return { values: async () => [["1"]] };
      }
      if (query.includes('from "platforms"')) {
        return {
          values: async () => [[platformId, "PC", "PC", "pc", 1, true, null]],
        };
      }
      if (query.includes("order by")) {
        return {
          values: async () => [
            [gameId, "Counted game", "counted-game", null, null, null, null, "active", "2", "1"],
          ],
        };
      }
      if (query.includes('where "games"."id" = $1')) {
        return { values: async () => [[gameId, "Counted game", "active", "2", "1"]] };
      }

      throw new Error(`Unexpected query: ${query}`);
    }),
  };
  const database = drizzle(client as never, { schema });

  return {
    parameters,
    queries,
    repository: createDrizzleCatalogRepository(database),
  };
}

describe("drizzle catalog repository count mapping", () => {
  it("maps PostgreSQL count strings to numeric 2/1 values for list and context DTOs", async () => {
    const { queries, repository } = repositoryWithRows();

    const games = await repository.listGames({ q: "", status: "all", page: 1, pageSize: 25 });
    const context = await repository.findGameContext(gameId);

    expect(games.items[0]).toMatchObject({
      id: gameId,
      releaseCount: 2,
      contentPackCount: 1,
    });
    expect(context).toMatchObject({
      id: gameId,
      releaseCount: 2,
      contentPackCount: 1,
    });
    expect(typeof games.items[0]?.releaseCount).toBe("number");
    expect(typeof context?.contentPackCount).toBe("number");

    const aggregateQueries = queries.filter((query) => query.includes("release_counts"));
    expect(aggregateQueries).toHaveLength(2);
    for (const query of aggregateQueries) {
      expect(query).toContain(
        'left join (select "game_id", count(*) as "release_count" from "game_releases"',
      );
      expect(query).toContain('"release_counts"."game_id" = "games"."id"');
      expect(query).toContain(
        'left join (select "game_id", count(*) as "content_pack_count" from "content_packs"',
      );
      expect(query).toContain('"content_pack_counts"."game_id" = "games"."id"');
      expect(query).not.toContain('where "game_id" = "id"');
    }

  });

  it("keeps unfiltered game and platform lists parameterized for Supavisor", async () => {
    // WHY: postgres.js + Supavisor transaction-mode pipeline compatibility workaround.
    const { parameters, repository } = repositoryWithRows();

    await Promise.all([
      repository.listGames({ q: "", status: "all", page: 1, pageSize: 25 }),
      repository.listPlatforms(),
    ]);

    expect(parameters).toHaveLength(3);
    expect(parameters.every((params) => params.length > 0)).toBe(true);
  });
});
