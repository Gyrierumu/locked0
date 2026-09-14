import { describe, expect, it, vi } from "vitest";

import type { AdminMediaListQuery } from "../../contracts";
import type { MediaAssetRecord, MediaRepository } from "../ports/media-repository";
import type { MediaStoragePort } from "../ports/media-storage";
import {
  getSelectableMediaAsset,
  listAdminMediaAssets,
  listMediaScopeGames,
  resolvePublicMediaPaths,
} from "./media-queries";

const asset: MediaAssetRecord = {
  id: "asset-1",
  scopeGame: { id: "game-1", name: "Elden Ring" },
  storagePath: "editorial/asset-1/asset.png",
  originalFilename: "map.png",
  mimeType: "image/png",
  byteSize: 1024,
  width: 100,
  height: 50,
  checksumSha256: "hash",
  sourceUrl: null,
  credit: "LOCKED:0",
  createdBy: "actor-1",
  firstPublishedAt: null,
  retiredAt: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
};

function repository(): MediaRepository {
  return {
    listAssets: vi.fn().mockResolvedValue({ items: [asset], page: 1, pageSize: 24, total: 1, totalPages: 1 }),
    findAsset: vi.fn().mockResolvedValue(asset),
    findAssetByStoragePath: vi.fn(),
    insertAsset: vi.fn(),
    updateMetadata: vi.fn(),
    setRetiredAt: vi.fn(),
    deleteAsset: vi.fn(),
    markFirstPublished: vi.fn(),
    listUsage: vi.fn(),
    listScopeGames: vi.fn(),
    gameExists: vi.fn(),
  };
}

function storage(): MediaStoragePort {
  return {
    createSignedStagingUpload: vi.fn(),
    getStagingObjectMetadata: vi.fn(),
    downloadStagingObject: vi.fn(),
    writeFinalObject: vi.fn(),
    deleteStagingObject: vi.fn(),
    deleteFinalObject: vi.fn(),
    resolvePublicUrl: vi.fn((path) => `https://cdn.test/${path}`),
  };
}

describe("media queries", () => {
  it("completes an empty library and scope query without resolving Storage URLs", async () => {
    const repo = repository();
    const store = storage();
    const query: AdminMediaListQuery = {
      q: "",
      gameId: null,
      status: "active",
      page: 1,
      pageSize: 24,
    };
    vi.mocked(repo.listAssets).mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 24,
      total: 0,
      totalPages: 1,
    });
    vi.mocked(repo.listScopeGames).mockResolvedValue([]);

    await expect(
      Promise.all([
        listAdminMediaAssets({ roles: ["admin"], repository: repo, storage: store }, query),
        listMediaScopeGames({ roles: ["admin"], repository: repo, storage: store }),
      ]),
    ).resolves.toEqual([
      { items: [], page: 1, pageSize: 24, total: 0, totalPages: 1 },
      [],
    ]);
    expect(store.resolvePublicUrl).not.toHaveBeenCalled();
  });

  it("forwards sanitized pagination/search/filters and maps a provider-neutral DTO", async () => {
    const repo = repository();
    const store = storage();
    const query: AdminMediaListQuery = { q: "map", gameId: "game-1", status: "active", page: 1, pageSize: 24 };
    const result = await listAdminMediaAssets({ roles: ["author"], repository: repo, storage: store }, query);
    expect(repo.listAssets).toHaveBeenCalledWith(query);
    expect(result.items[0]).toEqual({
      id: asset.id,
      originalFilename: "map.png",
      mimeType: "image/png",
      byteSize: 1024,
      width: 100,
      height: 50,
      scopeGame: asset.scopeGame,
      sourceUrl: null,
      credit: "LOCKED:0",
      previewUrl: `https://cdn.test/${asset.storagePath}`,
      firstPublishedAt: null,
      retiredAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    expect(result.items[0]).not.toHaveProperty("storagePath");
  });

  it("does not allow a retired asset to be selected for a new use", async () => {
    const repo = repository();
    vi.mocked(repo.findAsset).mockResolvedValue({ ...asset, retiredAt: new Date() });
    await expect(getSelectableMediaAsset({ roles: ["author"], repository: repo, storage: storage() }, asset.id)).rejects.toMatchObject({ code: "MEDIA_RETIRED" });
  });

  it("resolves only final paths through the centralized storage boundary", async () => {
    const store = storage();
    const paths = await resolvePublicMediaPaths(
      { roles: ["author"], repository: repository(), storage: store },
      [asset.storagePath, null],
    );
    expect(paths).toEqual({ [asset.storagePath]: `https://cdn.test/${asset.storagePath}` });
    expect(store.resolvePublicUrl).toHaveBeenCalledTimes(1);
  });
});
