import { describe, expect, it, vi } from "vitest";

import type { AdminGameListQuery } from "../../contracts";
import type { CatalogRepository } from "../ports/catalog-repository";
import { getAdminGameContext, listAdminGames } from "./catalog-queries";

function queryRepository(): CatalogRepository {
  return {
    listGames: vi.fn().mockResolvedValue({
      items: [],
      page: 2,
      pageSize: 25,
      total: 28,
      totalPages: 2,
    }),
    findGame: vi.fn(),
    findGameContext: vi.fn(),
    createGame: vi.fn(),
    updateGame: vi.fn(),
    setGameStatus: vi.fn(),
    listPlatforms: vi.fn(),
    findPlatform: vi.fn(),
    createPlatform: vi.fn(),
    updatePlatform: vi.fn(),
    setPlatformActive: vi.fn(),
    listGameReleases: vi.fn(),
    findGameRelease: vi.fn(),
    createGameRelease: vi.fn(),
    updateGameRelease: vi.fn(),
    listGameContentPacks: vi.fn(),
    findContentPack: vi.fn(),
    createContentPack: vi.fn(),
    updateContentPack: vi.fn(),
    setContentPackStatus: vi.fn(),
  };
}

describe("catalog queries", () => {
  it("requires author access before reading the catalog", () => {
    const repository = queryRepository();
    const query: AdminGameListQuery = { q: "", status: "all", page: 1, pageSize: 25 };
    expect(() => listAdminGames({ roles: [], repository }, query)).toThrowError(
      expect.objectContaining({ code: "forbidden" }),
    );
  });

  it("forwards sanitized search, status and server pagination to the repository", async () => {
    const repository = queryRepository();
    const query: AdminGameListQuery = {
      q: "elden",
      status: "active",
      page: 2,
      pageSize: 25,
    };
    await expect(listAdminGames({ roles: ["author"], repository }, query)).resolves.toMatchObject({
      page: 2,
      totalPages: 2,
    });
    expect(repository.listGames).toHaveBeenCalledWith(query);
  });

  it("returns the real catalog counts in the game workspace context", async () => {
    const repository = queryRepository();
    vi.mocked(repository.findGameContext).mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      name: "Counted game",
      status: "active",
      releaseCount: 2,
      contentPackCount: 1,
    });

    await expect(
      getAdminGameContext(
        { roles: ["author"], repository },
        "11111111-1111-4111-8111-111111111111",
      ),
    ).resolves.toMatchObject({ releaseCount: 2, contentPackCount: 1 });
    expect(repository.findGameContext).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
    );
  });

  it("preserves the repository counts in the admin game list", async () => {
    const repository = queryRepository();
    vi.mocked(repository.listGames).mockResolvedValue({
      items: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          name: "Counted game",
          slug: "counted-game",
          developerName: null,
          publisherName: null,
          releaseDate: null,
          coverPath: null,
          status: "active",
          releaseCount: 2,
          contentPackCount: 1,
        },
      ],
      page: 1,
      pageSize: 25,
      total: 1,
      totalPages: 1,
    });

    const result = await listAdminGames(
      { roles: ["author"], repository },
      { q: "", status: "all", page: 1, pageSize: 25 },
    );

    expect(result.items[0]).toMatchObject({ releaseCount: 2, contentPackCount: 1 });
  });
});
