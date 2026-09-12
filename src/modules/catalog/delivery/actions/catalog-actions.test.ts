import { beforeEach, describe, expect, it, vi } from "vitest";

import { routes } from "@/config/routes";

import { initialCatalogFormState } from "../action-state";

const mocks = vi.hoisted(() => ({
  archiveContentPack: vi.fn(),
  archiveGame: vi.fn(),
  createContentPack: vi.fn(),
  createGame: vi.fn(),
  createGameRelease: vi.fn(),
  createPlatform: vi.fn(),
  refresh: vi.fn(),
  restoreContentPack: vi.fn(),
  restoreGame: vi.fn(),
  revalidatePath: vi.fn(),
  setPlatformActive: vi.fn(),
  updateContentPack: vi.fn(),
  updateGameMetadata: vi.fn(),
  updateGameRelease: vi.fn(),
  updatePlatform: vi.fn(),
}));

vi.mock("next/cache", () => ({
  refresh: mocks.refresh,
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("../../server", () => ({
  archiveContentPack: mocks.archiveContentPack,
  archiveGame: mocks.archiveGame,
  createContentPack: mocks.createContentPack,
  createGame: mocks.createGame,
  createGameRelease: mocks.createGameRelease,
  createPlatform: mocks.createPlatform,
  restoreContentPack: mocks.restoreContentPack,
  restoreGame: mocks.restoreGame,
  setPlatformActive: mocks.setPlatformActive,
  updateContentPack: mocks.updateContentPack,
  updateGameMetadata: mocks.updateGameMetadata,
  updateGameRelease: mocks.updateGameRelease,
  updatePlatform: mocks.updatePlatform,
}));

import {
  archiveGameAction,
  createContentPackAction,
  createGameReleaseAction,
  restoreGameAction,
  updateGameAction,
} from "./catalog-actions";

const gameId = "11111111-1111-4111-8111-111111111111";
const platformId = "22222222-2222-4222-8222-222222222222";

function releaseFormData(): FormData {
  const formData = new FormData();
  formData.set("platformId", platformId);
  formData.set("key", "global");
  formData.set("name", "Global");
  formData.set("regionCode", "");
  formData.set("releaseDate", "");
  return formData;
}

function contentPackFormData(): FormData {
  const formData = new FormData();
  formData.set("name", "Expansion");
  formData.set("slug", "expansion");
  formData.set("type", "expansion");
  formData.set("description", "");
  formData.set("releaseDate", "");
  formData.set("status", "active");
  return formData;
}

function gameFormData(): FormData {
  const formData = new FormData();
  formData.set("name", "Updated game");
  formData.set("slug", "updated-game");
  formData.set("summary", "");
  formData.set("developerName", "");
  formData.set("publisherName", "");
  formData.set("releaseDate", "");
  return formData;
}

describe("catalog actions workspace refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refreshes the workspace and game list after count-changing creates", async () => {
    mocks.createGameRelease.mockResolvedValue({ id: "release-id" });
    mocks.createContentPack.mockResolvedValue({ id: "content-pack-id" });

    await expect(
      createGameReleaseAction(gameId, initialCatalogFormState, releaseFormData()),
    ).resolves.toMatchObject({ status: "success" });
    await expect(
      createContentPackAction(gameId, initialCatalogFormState, contentPackFormData()),
    ).resolves.toMatchObject({ status: "success" });

    expect(mocks.refresh).toHaveBeenCalledTimes(2);
    expect(mocks.revalidatePath).toHaveBeenCalledWith(routes.adminGames);
    expect(mocks.revalidatePath).toHaveBeenCalledWith(routes.adminGameReleases(gameId));
    expect(mocks.revalidatePath).toHaveBeenCalledWith(routes.adminGameContentPacks(gameId));
  });

  it("refreshes contextual game metadata and lifecycle state", async () => {
    mocks.updateGameMetadata.mockResolvedValue(undefined);
    mocks.archiveGame.mockResolvedValue(undefined);
    mocks.restoreGame.mockResolvedValue(undefined);

    await expect(
      updateGameAction(gameId, initialCatalogFormState, gameFormData()),
    ).resolves.toMatchObject({ status: "success" });
    await expect(archiveGameAction(gameId, initialCatalogFormState)).resolves.toMatchObject({
      status: "success",
    });
    await expect(restoreGameAction(gameId, initialCatalogFormState)).resolves.toMatchObject({
      status: "success",
    });

    expect(mocks.refresh).toHaveBeenCalledTimes(3);
  });
});
