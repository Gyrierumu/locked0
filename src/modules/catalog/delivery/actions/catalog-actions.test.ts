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
  clearGameCover: vi.fn(),
  clearGameHero: vi.fn(),
  clearPlatformIcon: vi.fn(),
  getSelectableMediaAsset: vi.fn(),
  refresh: vi.fn(),
  restoreContentPack: vi.fn(),
  restoreGame: vi.fn(),
  revalidatePath: vi.fn(),
  setPlatformActive: vi.fn(),
  setGameCover: vi.fn(),
  setGameHero: vi.fn(),
  setPlatformIcon: vi.fn(),
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

vi.mock("@/modules/media/server", () => ({
  getSelectableMediaAsset: mocks.getSelectableMediaAsset,
}));

vi.mock("../../server", () => ({
  archiveContentPack: mocks.archiveContentPack,
  archiveGame: mocks.archiveGame,
  createContentPack: mocks.createContentPack,
  createGame: mocks.createGame,
  createGameRelease: mocks.createGameRelease,
  createPlatform: mocks.createPlatform,
  clearGameCover: mocks.clearGameCover,
  clearGameHero: mocks.clearGameHero,
  clearPlatformIcon: mocks.clearPlatformIcon,
  restoreContentPack: mocks.restoreContentPack,
  restoreGame: mocks.restoreGame,
  setPlatformActive: mocks.setPlatformActive,
  setGameCover: mocks.setGameCover,
  setGameHero: mocks.setGameHero,
  setPlatformIcon: mocks.setPlatformIcon,
  updateContentPack: mocks.updateContentPack,
  updateGameMetadata: mocks.updateGameMetadata,
  updateGameRelease: mocks.updateGameRelease,
  updatePlatform: mocks.updatePlatform,
}));

import {
  archiveGameAction,
  clearGameCoverAction,
  createContentPackAction,
  createGameReleaseAction,
  restoreGameAction,
  setGameCoverAction,
  setPlatformIconAction,
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

  it("resolves an active MediaAsset server-side instead of accepting a client storage path", async () => {
    const assetId = "33333333-3333-4333-8333-333333333333";
    mocks.getSelectableMediaAsset.mockResolvedValue({ id: assetId, storagePath: "editorial/trusted/asset.png" });
    await expect(setGameCoverAction(gameId, assetId)).resolves.toMatchObject({ status: "success" });
    expect(mocks.getSelectableMediaAsset).toHaveBeenCalledWith(assetId);
    expect(mocks.setGameCover).toHaveBeenCalledWith(gameId, "editorial/trusted/asset.png");
    await expect(clearGameCoverAction(gameId)).resolves.toMatchObject({ status: "success" });
    expect(mocks.clearGameCover).toHaveBeenCalledWith(gameId);

    await expect(setPlatformIconAction(platformId, assetId)).resolves.toMatchObject({ status: "success" });
    expect(mocks.setPlatformIcon).toHaveBeenCalledWith(platformId, "editorial/trusted/asset.png");
  });
});
