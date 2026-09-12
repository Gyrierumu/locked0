import { describe, expect, it, vi } from "vitest";

import type {
  AdminContentPack,
  AdminGameContext,
  AdminGameRelease,
  AdminPlatform,
  ContentPackInput,
  CreateGameInput,
  GameReleaseInput,
} from "../../contracts";
import { CatalogError } from "../../domain/errors";
import type { CatalogRepository } from "../ports/catalog-repository";
import {
  archiveContentPack,
  archiveGame,
  createContentPack,
  createGame,
  createGameRelease,
  restoreContentPack,
  restoreGame,
  setPlatformActive,
  updateGameRelease,
  updatePlatform,
} from "./catalog-commands";

const game: AdminGameContext = {
  id: "game-1",
  name: "Elden Ring",
  status: "active",
  releaseCount: 0,
  contentPackCount: 0,
};

const platform: AdminPlatform = {
  id: "platform-1",
  name: "PlayStation 5",
  shortName: "PS5",
  slug: "playstation-5",
  sortOrder: 1,
  isActive: true,
};

const release: AdminGameRelease = {
  id: "release-1",
  gameId: game.id,
  platform: {
    id: platform.id,
    name: platform.name,
    shortName: platform.shortName,
    isActive: platform.isActive,
  },
  key: "ps5-global",
  name: "PS5 Global",
  regionCode: null,
  releaseDate: null,
};

const contentPack: AdminContentPack = {
  id: "pack-1",
  gameId: game.id,
  name: "Shadow of the Erdtree",
  slug: "shadow-of-the-erdtree",
  type: "expansion",
  description: null,
  releaseDate: null,
  status: "active",
};

function repository(overrides: Partial<CatalogRepository> = {}): CatalogRepository {
  return {
    listGames: vi.fn(),
    findGame: vi.fn().mockResolvedValue(null),
    findGameContext: vi.fn().mockResolvedValue(game),
    createGame: vi.fn().mockResolvedValue({ id: game.id }),
    updateGame: vi.fn(),
    setGameStatus: vi.fn(),
    listPlatforms: vi.fn().mockResolvedValue([platform]),
    findPlatform: vi.fn().mockResolvedValue(platform),
    createPlatform: vi.fn().mockResolvedValue({ id: platform.id }),
    updatePlatform: vi.fn(),
    setPlatformActive: vi.fn(),
    listGameReleases: vi.fn().mockResolvedValue([release]),
    findGameRelease: vi.fn().mockResolvedValue(release),
    createGameRelease: vi.fn().mockResolvedValue({ id: release.id }),
    updateGameRelease: vi.fn(),
    listGameContentPacks: vi.fn().mockResolvedValue([contentPack]),
    findContentPack: vi.fn().mockResolvedValue(contentPack),
    createContentPack: vi.fn().mockResolvedValue({ id: contentPack.id }),
    updateContentPack: vi.fn(),
    setContentPackStatus: vi.fn(),
    ...overrides,
  };
}

const validGame: CreateGameInput = {
  name: " Elden Ring ",
  slug: "elden-ring",
  summary: " ",
  developerName: " FromSoftware ",
  publisherName: null,
  releaseDate: null,
  status: "active",
};

const validRelease: GameReleaseInput = {
  platformId: platform.id,
  key: "ps5-global",
  name: null,
  regionCode: null,
  releaseDate: null,
};

const validPack: ContentPackInput = {
  name: contentPack.name,
  slug: contentPack.slug,
  type: contentPack.type,
  description: null,
  releaseDate: null,
  status: "active",
};

describe("catalog commands", () => {
  it("creates a valid game with normalized optional values", async () => {
    const repo = repository();
    await expect(createGame({ roles: ["editor"], repository: repo }, validGame)).resolves.toEqual({
      id: game.id,
    });
    expect(repo.createGame).toHaveBeenCalledWith({
      ...validGame,
      name: "Elden Ring",
      summary: null,
      developerName: "FromSoftware",
    });
  });

  it("keeps game lifecycle admin-only and restores the same identity", async () => {
    const repo = repository();
    await expect(
      archiveGame({ roles: ["editor"], repository: repo }, game.id),
    ).rejects.toBeInstanceOf(CatalogError);
    await archiveGame({ roles: ["admin"], repository: repo }, game.id);
    await restoreGame({ roles: ["admin"], repository: repo }, game.id);
    expect(repo.setGameStatus).toHaveBeenNthCalledWith(1, game.id, "archived");
    expect(repo.setGameStatus).toHaveBeenNthCalledWith(2, game.id, "active");
  });

  it("blocks new releases and content packs for an archived game", async () => {
    const repo = repository({ findGameContext: vi.fn().mockResolvedValue({ ...game, status: "archived" }) });
    await expect(
      createGameRelease({ roles: ["editor"], repository: repo }, game.id, validRelease),
    ).rejects.toMatchObject({ code: "game_archived" });
    await expect(
      createContentPack({ roles: ["editor"], repository: repo }, game.id, validPack),
    ).rejects.toMatchObject({ code: "game_archived" });
  });

  it("allows multiple releases on the same platform when their keys differ", async () => {
    const repo = repository();
    const context = { roles: ["editor"] as const, repository: repo };
    await createGameRelease(context, game.id, validRelease);
    await createGameRelease(context, game.id, { ...validRelease, key: "ps5-japan" });
    expect(repo.createGameRelease).toHaveBeenCalledTimes(2);
    expect(repo.createGameRelease).toHaveBeenNthCalledWith(
      2,
      game.id,
      expect.objectContaining({ platformId: platform.id, key: "ps5-japan" }),
    );
  });

  it("rejects a missing or inactive platform for a new release", async () => {
    const missing = repository({ findPlatform: vi.fn().mockResolvedValue(null) });
    await expect(
      createGameRelease({ roles: ["editor"], repository: missing }, game.id, validRelease),
    ).rejects.toMatchObject({ code: "not_found" });

    const inactive = repository({
      findPlatform: vi.fn().mockResolvedValue({ ...platform, isActive: false }),
    });
    await expect(
      createGameRelease({ roles: ["editor"], repository: inactive }, game.id, validRelease),
    ).rejects.toMatchObject({ code: "platform_inactive" });
  });

  it("edits an existing release in place and preserves an inactive current platform", async () => {
    const repo = repository({
      findGameRelease: vi.fn().mockResolvedValue({
        ...release,
        platform: { ...release.platform, isActive: false },
      }),
      findPlatform: vi.fn().mockRejectedValue(new Error("must not revalidate unchanged platform")),
    });
    await updateGameRelease(
      { roles: ["editor"], repository: repo },
      game.id,
      release.id,
      { ...validRelease, name: "Updated" },
    );
    expect(repo.updateGameRelease).toHaveBeenCalledWith(
      game.id,
      release.id,
      expect.objectContaining({ name: "Updated" }),
    );
  });

  it("keeps platform mutation admin-only and lifecycle preserves identity", async () => {
    const repo = repository({ findPlatform: vi.fn().mockResolvedValue({ ...platform, isActive: false }) });
    await expect(
      updatePlatform(
        { roles: ["editor"], repository: repo },
        platform.id,
        { ...platform, name: "PS5" },
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
    await updatePlatform(
      { roles: ["admin"], repository: repo },
      platform.id,
      { ...platform, name: "PS5", isActive: true },
    );
    expect(repo.updatePlatform).toHaveBeenCalledWith(
      platform.id,
      expect.objectContaining({ isActive: false }),
    );
    await setPlatformActive({ roles: ["admin"], repository: repo }, platform.id, true);
    expect(repo.setPlatformActive).toHaveBeenCalledWith(platform.id, true);
  });

  it("archives and restores a content pack without replacing it", async () => {
    const repo = repository();
    const context = { roles: ["editor"] as const, repository: repo };
    await archiveContentPack(context, game.id, contentPack.id);
    await restoreContentPack(context, game.id, contentPack.id);
    expect(repo.setContentPackStatus).toHaveBeenNthCalledWith(
      1,
      game.id,
      contentPack.id,
      "archived",
    );
    expect(repo.setContentPackStatus).toHaveBeenNthCalledWith(
      2,
      game.id,
      contentPack.id,
      "active",
    );
  });
});
