import { describe, expect, it, vi } from "vitest";

import type { MediaUploadMetadata } from "../../contracts";
import { MediaError } from "../../domain/errors";
import type { MediaImageProcessor } from "../ports/image-processor";
import type { MediaAssetRecord, MediaRepository } from "../ports/media-repository";
import { MediaStoragePortError, type MediaStoragePort } from "../ports/media-storage";
import {
  createMediaUpload,
  deleteUnusedMediaAsset,
  finalizeMediaUpload,
  markMediaAssetsFirstPublished,
  restoreMediaAsset,
  retireMediaAsset,
  updateMediaAssetMetadata,
  type MediaCommandContext,
} from "./media-commands";

const assetId = "11111111-1111-4111-8111-111111111111";
const actorId = "22222222-2222-4222-8222-222222222222";
const gameId = "33333333-3333-4333-8333-333333333333";

const upload: MediaUploadMetadata = {
  originalFilename: " map.png ",
  declaredMimeType: "image/png",
  declaredByteSize: 4,
  scopeGameId: gameId,
  sourceUrl: "https://example.com/map",
  credit: " Cartographer ",
};

const activeAsset: MediaAssetRecord = {
  id: assetId,
  scopeGame: { id: gameId, name: "Elden Ring" },
  storagePath: `editorial/${assetId}/asset.png`,
  originalFilename: "map.png",
  mimeType: "image/png",
  byteSize: 3,
  width: 2,
  height: 2,
  checksumSha256: "abc",
  sourceUrl: null,
  credit: null,
  createdBy: actorId,
  firstPublishedAt: null,
  retiredAt: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
};

function repository(overrides: Partial<MediaRepository> = {}): MediaRepository {
  return {
    listAssets: vi.fn(),
    findAsset: vi.fn().mockResolvedValue(activeAsset),
    findAssetByStoragePath: vi.fn(),
    insertAsset: vi.fn(),
    updateMetadata: vi.fn(),
    setRetiredAt: vi.fn(),
    deleteAsset: vi.fn().mockResolvedValue(true),
    markFirstPublished: vi.fn(),
    listUsage: vi.fn().mockResolvedValue([]),
    listScopeGames: vi.fn().mockResolvedValue([]),
    gameExists: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function storage(overrides: Partial<MediaStoragePort> = {}): MediaStoragePort {
  return {
    createSignedStagingUpload: vi.fn(async (path) => ({ bucket: "locked0-media-staging", path, token: "signed-token" })),
    getStagingObjectMetadata: vi.fn().mockResolvedValue({ byteSize: 4, contentType: "application/octet-stream" }),
    downloadStagingObject: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4])),
    writeFinalObject: vi.fn(),
    deleteStagingObject: vi.fn(),
    deleteFinalObject: vi.fn(),
    resolvePublicUrl: vi.fn((path) => `https://storage.test/${path}`),
    ...overrides,
  };
}

function processor(overrides: Partial<MediaImageProcessor> = {}): MediaImageProcessor {
  return {
    process: vi.fn().mockResolvedValue({
      bytes: new Uint8Array([7, 8, 9]),
      mimeType: "image/png",
      extension: "png",
      width: 2,
      height: 2,
      checksumSha256: "checksum",
    }),
    ...overrides,
  };
}

function context(overrides: Partial<MediaCommandContext> = {}): MediaCommandContext {
  return {
    actorId,
    roles: ["author"],
    repository: repository(),
    storage: storage(),
    imageProcessor: processor(),
    idGenerator: () => assetId,
    now: () => new Date("2026-02-01T00:00:00Z"),
    reportStorageError: vi.fn(),
    ...overrides,
  };
}

describe("media upload commands", () => {
  it.each(["author", "editor", "admin"] as const)("authorizes %s to request staging upload", async (role) => {
    const ctx = context({ roles: [role] });
    const ticket = await createMediaUpload(ctx, upload);
    expect(ticket).toEqual({
      assetId,
      upload: {
        bucket: "locked0-media-staging",
        path: `uploads/${actorId}/${assetId}/source`,
        token: "signed-token",
      },
    });
    expect(ctx.storage.createSignedStagingUpload).toHaveBeenCalledWith(`uploads/${actorId}/${assetId}/source`);
  });

  it("rejects users without role, unsupported MIME and oversized preconditions", async () => {
    await expect(createMediaUpload(context({ roles: [] }), upload)).rejects.toMatchObject({ code: "MEDIA_FORBIDDEN" });
    await expect(createMediaUpload(context(), { ...upload, declaredMimeType: "image/svg+xml" })).rejects.toMatchObject({ code: "MEDIA_UNSUPPORTED_TYPE" });
    await expect(createMediaUpload(context(), { ...upload, declaredByteSize: 10 * 1024 * 1024 + 1 })).rejects.toMatchObject({ code: "MEDIA_TOO_LARGE" });
  });

  it("rejects a provider target that does not match the server-generated staging path", async () => {
    const ctx = context({ storage: storage({ createSignedStagingUpload: vi.fn().mockResolvedValue({ bucket: "locked0-media-staging", path: "uploads/other/path", token: "token" }) }) });
    await expect(createMediaUpload(ctx, upload)).rejects.toMatchObject({ code: "MEDIA_UPLOAD_INVALID_PATH" });
  });

  it("finalizes into immutable public storage before inserting a created_by-bound MediaAsset", async () => {
    const ctx = context();
    await expect(finalizeMediaUpload(ctx, assetId, upload)).resolves.toEqual({ id: assetId });
    const stagingPath = `uploads/${actorId}/${assetId}/source`;
    const finalPath = `editorial/${assetId}/asset.png`;
    expect(ctx.storage.getStagingObjectMetadata).toHaveBeenCalledWith(stagingPath);
    expect(ctx.storage.downloadStagingObject).toHaveBeenCalledWith(stagingPath);
    expect(ctx.storage.writeFinalObject).toHaveBeenCalledWith(finalPath, new Uint8Array([7, 8, 9]), "image/png");
    expect(ctx.repository.insertAsset).toHaveBeenCalledWith({
      id: assetId,
      scopeGameId: gameId,
      storagePath: finalPath,
      originalFilename: "map.png",
      mimeType: "image/png",
      byteSize: 3,
      width: 2,
      height: 2,
      checksumSha256: "checksum",
      sourceUrl: "https://example.com/map",
      credit: "Cartographer",
      createdBy: actorId,
    });
    expect(ctx.storage.deleteStagingObject).toHaveBeenCalledWith(stagingPath);
  });

  it("creates no row for invalid images and cleans staging", async () => {
    const ctx = context({ imageProcessor: processor({ process: vi.fn().mockRejectedValue(new MediaError("MEDIA_INVALID_IMAGE")) }) });
    await expect(finalizeMediaUpload(ctx, assetId, upload)).rejects.toMatchObject({ code: "MEDIA_INVALID_IMAGE" });
    expect(ctx.repository.insertAsset).not.toHaveBeenCalled();
    expect(ctx.storage.deleteStagingObject).toHaveBeenCalledWith(`uploads/${actorId}/${assetId}/source`);
  });

  it("cleans staging and safely reports an unexpected download failure", async () => {
    const ctx = context({
      storage: storage({
        downloadStagingObject: vi.fn().mockRejectedValue(new MediaStoragePortError("provider")),
      }),
    });
    await expect(finalizeMediaUpload(ctx, assetId, upload)).rejects.toMatchObject({
      code: "MEDIA_STORAGE_FAILURE",
    });
    expect(ctx.storage.deleteStagingObject).toHaveBeenCalledWith(
      `uploads/${actorId}/${assetId}/source`,
    );
    expect(ctx.reportStorageError).toHaveBeenCalledWith({
      assetId,
      operation: "download-upload",
      storagePath: `uploads/${actorId}/${assetId}/source`,
      bucketCategory: "staging",
      errorCategory: "provider",
    });
  });

  it("maps a final path conflict without inserting or overwriting", async () => {
    const ctx = context({ storage: storage({ writeFinalObject: vi.fn().mockRejectedValue(new MediaStoragePortError("conflict")) }) });
    await expect(finalizeMediaUpload(ctx, assetId, upload)).rejects.toMatchObject({ code: "MEDIA_FINAL_PATH_CONFLICT" });
    expect(ctx.repository.insertAsset).not.toHaveBeenCalled();
  });

  it("compensates a failed insert by deleting final and staging objects", async () => {
    const ctx = context({ repository: repository({ insertAsset: vi.fn().mockRejectedValue(new Error("db down")) }) });
    await expect(finalizeMediaUpload(ctx, assetId, upload)).rejects.toMatchObject({ code: "MEDIA_PERSISTENCE_FAILURE" });
    expect(ctx.storage.deleteFinalObject).toHaveBeenCalledWith(activeAsset.storagePath);
    expect(ctx.storage.deleteStagingObject).toHaveBeenCalled();
  });
});

describe("media metadata and lifecycle commands", () => {
  it("allows editor metadata changes, blocks author changes and validates HTTP URLs", async () => {
    const author = context();
    await expect(updateMediaAssetMetadata(author, assetId, { scopeGameId: null, sourceUrl: null, credit: null })).rejects.toMatchObject({ code: "MEDIA_FORBIDDEN" });
    const editor = context({ roles: ["editor"] });
    await updateMediaAssetMetadata(editor, assetId, { scopeGameId: gameId, sourceUrl: "https://example.com", credit: " Credit " });
    expect(editor.repository.updateMetadata).toHaveBeenCalledWith(assetId, { scopeGameId: gameId, sourceUrl: "https://example.com/", credit: "Credit" });
    await expect(updateMediaAssetMetadata(editor, assetId, { scopeGameId: null, sourceUrl: "javascript:alert(1)", credit: null })).rejects.toMatchObject({ code: "MEDIA_INVALID_METADATA" });
  });

  it("retires unused assets, blocks current usage, and restores the same identity", async () => {
    const editor = context({ roles: ["editor"] });
    await retireMediaAsset(editor, assetId);
    expect(editor.repository.setRetiredAt).toHaveBeenCalledWith(assetId, new Date("2026-02-01T00:00:00Z"));
    await restoreMediaAsset(editor, assetId);
    expect(editor.repository.setRetiredAt).toHaveBeenLastCalledWith(assetId, null);

    const used = context({ roles: ["editor"], repository: repository({ listUsage: vi.fn().mockResolvedValue([{ kind: "game_cover", entityId: gameId, label: "Elden Ring", context: null }]) }) });
    await expect(retireMediaAsset(used, assetId)).rejects.toMatchObject({ code: "MEDIA_ASSET_IN_USE" });
  });

  it("keeps hard delete admin-only and denies published or used assets", async () => {
    await expect(deleteUnusedMediaAsset(context({ roles: ["editor"] }), assetId)).rejects.toMatchObject({ code: "MEDIA_FORBIDDEN" });
    const published = context({ roles: ["admin"], repository: repository({ findAsset: vi.fn().mockResolvedValue({ ...activeAsset, firstPublishedAt: new Date() }) }) });
    await expect(deleteUnusedMediaAsset(published, assetId)).rejects.toMatchObject({ code: "MEDIA_ALREADY_PUBLISHED" });
    const used = context({ roles: ["admin"], repository: repository({ listUsage: vi.fn().mockResolvedValue([{ kind: "platform_icon", entityId: "p", label: "PS5", context: null }]) }) });
    await expect(deleteUnusedMediaAsset(used, assetId)).rejects.toMatchObject({ code: "MEDIA_ASSET_IN_USE" });

    const admin = context({ roles: ["admin"] });
    await deleteUnusedMediaAsset(admin, assetId);
    expect(admin.repository.deleteAsset).toHaveBeenCalledWith(assetId);
    expect(admin.storage.deleteFinalObject).toHaveBeenCalledWith(activeAsset.storagePath);
  });

  it("reports a structured orphan cleanup error if storage deletion fails after row deletion", async () => {
    const admin = context({
      roles: ["admin"],
      storage: storage({
        deleteFinalObject: vi.fn().mockRejectedValue(new MediaStoragePortError("provider")),
      }),
    });

    await expect(deleteUnusedMediaAsset(admin, assetId)).rejects.toMatchObject({
      code: "MEDIA_STORAGE_FAILURE",
    });
    expect(admin.repository.deleteAsset).toHaveBeenCalledWith(assetId);
    expect(admin.reportStorageError).toHaveBeenCalledWith({
      assetId,
      operation: "hard-delete-cleanup",
      storagePath: activeAsset.storagePath,
      bucketCategory: "final",
      errorCategory: "provider",
    });
  });

  it("delegates unique publication IDs as an idempotent NULL-only repository update", async () => {
    const repo = repository();
    const timestamp = new Date("2026-03-01T00:00:00Z");
    await markMediaAssetsFirstPublished(repo, [assetId, assetId, gameId], timestamp);
    expect(repo.markFirstPublished).toHaveBeenCalledWith([assetId, gameId], timestamp);
  });
});
