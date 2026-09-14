import type {
  MediaAssetMetadataInput,
  MediaUploadMetadata,
  MediaUploadTicket,
} from "../../contracts";
import { MediaError } from "../../domain/errors";
import {
  MAX_IMAGE_BYTES,
  finalPathFor,
  isAllowedMediaMimeType,
  stagingPathFor,
} from "../../domain/policy";
import { assertMediaPermission, type MediaRole } from "../../domain/permissions";
import type { MediaImageProcessor } from "../ports/image-processor";
import type { MediaRepository } from "../ports/media-repository";
import { MediaStoragePortError, type MediaStoragePort } from "../ports/media-storage";

type SafeLogContext = Readonly<{
  assetId: string;
  operation: string;
  storagePath: string;
  bucketCategory: "staging" | "final";
  errorCategory: string;
}>;

export type MediaCommandContext = Readonly<{
  actorId: string;
  roles: readonly MediaRole[];
  repository: MediaRepository;
  storage: MediaStoragePort;
  imageProcessor: MediaImageProcessor;
  idGenerator: () => string;
  now: () => Date;
  reportStorageError: (context: SafeLogContext) => void;
}>;

function nullableText(value: string | null, maximumLength: number): string | null {
  const normalized = value?.replace(/[\u0000-\u001f\u007f]/g, " ").trim() ?? "";
  if (normalized.length === 0) return null;
  if (normalized.length > maximumLength) throw new MediaError("MEDIA_INVALID_METADATA");
  return normalized;
}

function sourceUrl(value: string | null): string | null {
  const normalized = nullableText(value, 2_000);
  if (!normalized) return null;
  try {
    const url = new URL(normalized);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new MediaError("MEDIA_INVALID_METADATA");
    }
    return url.toString();
  } catch (error) {
    if (error instanceof MediaError) throw error;
    throw new MediaError("MEDIA_INVALID_METADATA");
  }
}

function originalFilename(value: string): string {
  const normalized = nullableText(value, 255);
  if (!normalized) throw new MediaError("MEDIA_INVALID_METADATA");
  return normalized;
}

async function validateScope(repository: MediaRepository, scopeGameId: string | null) {
  if (scopeGameId && !(await repository.gameExists(scopeGameId))) {
    throw new MediaError("MEDIA_INVALID_METADATA");
  }
}

async function normalizedMetadata(
  repository: MediaRepository,
  input: MediaUploadMetadata,
): Promise<MediaUploadMetadata> {
  if (!isAllowedMediaMimeType(input.declaredMimeType)) {
    throw new MediaError("MEDIA_UNSUPPORTED_TYPE");
  }
  if (
    !Number.isSafeInteger(input.declaredByteSize) ||
    input.declaredByteSize <= 0 ||
    input.declaredByteSize > MAX_IMAGE_BYTES
  ) {
    throw new MediaError("MEDIA_TOO_LARGE");
  }
  await validateScope(repository, input.scopeGameId);
  return {
    originalFilename: originalFilename(input.originalFilename),
    declaredMimeType: input.declaredMimeType,
    declaredByteSize: input.declaredByteSize,
    scopeGameId: input.scopeGameId,
    sourceUrl: sourceUrl(input.sourceUrl),
    credit: nullableText(input.credit, 500),
  };
}

function storageFailure(
  context: MediaCommandContext,
  assetId: string,
  storagePath: string,
  bucketCategory: "staging" | "final",
  operation: string,
  error: unknown,
  missingCode: "MEDIA_UPLOAD_MISSING" | "MEDIA_STORAGE_FAILURE",
): never {
  if (error instanceof MediaStoragePortError) {
    if (error.kind === "missing") throw new MediaError(missingCode);
    if (error.kind === "conflict") throw new MediaError("MEDIA_FINAL_PATH_CONFLICT");
  }
  context.reportStorageError({
    assetId,
    operation,
    storagePath,
    bucketCategory,
    errorCategory: error instanceof MediaStoragePortError ? error.kind : "unexpected",
  });
  throw new MediaError("MEDIA_STORAGE_FAILURE");
}

async function cleanup(
  context: MediaCommandContext,
  assetId: string,
  storagePath: string,
  bucketCategory: "staging" | "final",
): Promise<void> {
  try {
    if (bucketCategory === "staging") await context.storage.deleteStagingObject(storagePath);
    else await context.storage.deleteFinalObject(storagePath);
  } catch (error) {
    context.reportStorageError({
      assetId,
      operation: "cleanup",
      storagePath,
      bucketCategory,
      errorCategory: error instanceof MediaStoragePortError ? error.kind : "unexpected",
    });
  }
}

export async function createMediaUpload(
  context: MediaCommandContext,
  input: MediaUploadMetadata,
): Promise<MediaUploadTicket> {
  assertMediaPermission(context.roles, "upload");
  await normalizedMetadata(context.repository, input);
  const assetId = context.idGenerator();
  const expectedPath = stagingPathFor(context.actorId, assetId);
  try {
    const upload = await context.storage.createSignedStagingUpload(expectedPath);
    if (upload.path !== expectedPath) throw new MediaError("MEDIA_UPLOAD_INVALID_PATH");
    return { assetId, upload };
  } catch (error) {
    if (error instanceof MediaError) throw error;
    storageFailure(
      context,
      assetId,
      expectedPath,
      "staging",
      "authorize-upload",
      error,
      "MEDIA_STORAGE_FAILURE",
    );
  }
}

export async function finalizeMediaUpload(
  context: MediaCommandContext,
  assetId: string,
  input: MediaUploadMetadata,
) {
  assertMediaPermission(context.roles, "upload");
  const metadata = await normalizedMetadata(context.repository, input);
  const stagingPath = stagingPathFor(context.actorId, assetId);

  let objectMetadata: Awaited<ReturnType<MediaStoragePort["getStagingObjectMetadata"]>>;
  try {
    objectMetadata = await context.storage.getStagingObjectMetadata(stagingPath);
  } catch (error) {
    if (!(error instanceof MediaStoragePortError && error.kind === "missing")) {
      await cleanup(context, assetId, stagingPath, "staging");
    }
    storageFailure(
      context,
      assetId,
      stagingPath,
      "staging",
      "inspect-upload",
      error,
      "MEDIA_UPLOAD_MISSING",
    );
  }
  if (!Number.isFinite(objectMetadata.byteSize) || objectMetadata.byteSize <= 0) {
    await cleanup(context, assetId, stagingPath, "staging");
    throw new MediaError("MEDIA_UPLOAD_MISSING");
  }
  if (objectMetadata.byteSize > MAX_IMAGE_BYTES) {
    await cleanup(context, assetId, stagingPath, "staging");
    throw new MediaError("MEDIA_TOO_LARGE");
  }

  let sourceBytes: Uint8Array;
  try {
    sourceBytes = await context.storage.downloadStagingObject(stagingPath);
  } catch (error) {
    if (!(error instanceof MediaStoragePortError && error.kind === "missing")) {
      await cleanup(context, assetId, stagingPath, "staging");
    }
    storageFailure(
      context,
      assetId,
      stagingPath,
      "staging",
      "download-upload",
      error,
      "MEDIA_UPLOAD_MISSING",
    );
  }
  if (sourceBytes.byteLength <= 0 || sourceBytes.byteLength > MAX_IMAGE_BYTES) {
    await cleanup(context, assetId, stagingPath, "staging");
    throw new MediaError(sourceBytes.byteLength > MAX_IMAGE_BYTES ? "MEDIA_TOO_LARGE" : "MEDIA_INVALID_IMAGE");
  }

  let processed;
  try {
    processed = await context.imageProcessor.process(sourceBytes);
  } catch (error) {
    await cleanup(context, assetId, stagingPath, "staging");
    if (error instanceof MediaError) throw error;
    throw new MediaError("MEDIA_INVALID_IMAGE");
  }
  if (processed.bytes.byteLength > MAX_IMAGE_BYTES) {
    await cleanup(context, assetId, stagingPath, "staging");
    throw new MediaError("MEDIA_TOO_LARGE");
  }

  const finalPath = finalPathFor(assetId, processed.extension);
  try {
    await context.storage.writeFinalObject(finalPath, processed.bytes, processed.mimeType);
  } catch (error) {
    await cleanup(context, assetId, stagingPath, "staging");
    storageFailure(
      context,
      assetId,
      finalPath,
      "final",
      "write-final",
      error,
      "MEDIA_STORAGE_FAILURE",
    );
  }

  try {
    await context.repository.insertAsset({
      id: assetId,
      scopeGameId: metadata.scopeGameId,
      storagePath: finalPath,
      originalFilename: metadata.originalFilename,
      mimeType: processed.mimeType,
      byteSize: processed.bytes.byteLength,
      width: processed.width,
      height: processed.height,
      checksumSha256: processed.checksumSha256,
      sourceUrl: metadata.sourceUrl,
      credit: metadata.credit,
      createdBy: context.actorId,
    });
  } catch (error) {
    await Promise.all([
      cleanup(context, assetId, finalPath, "final"),
      cleanup(context, assetId, stagingPath, "staging"),
    ]);
    if (error instanceof MediaError) throw error;
    throw new MediaError("MEDIA_PERSISTENCE_FAILURE");
  }

  await cleanup(context, assetId, stagingPath, "staging");
  return { id: assetId } as const;
}

export async function updateMediaAssetMetadata(
  context: MediaCommandContext,
  assetId: string,
  input: MediaAssetMetadataInput,
): Promise<void> {
  assertMediaPermission(context.roles, "manage_metadata");
  if (!(await context.repository.findAsset(assetId))) throw new MediaError("MEDIA_NOT_FOUND");
  await validateScope(context.repository, input.scopeGameId);
  await context.repository.updateMetadata(assetId, {
    scopeGameId: input.scopeGameId,
    sourceUrl: sourceUrl(input.sourceUrl),
    credit: nullableText(input.credit, 500),
  });
}

export async function retireMediaAsset(
  context: MediaCommandContext,
  assetId: string,
): Promise<void> {
  assertMediaPermission(context.roles, "manage_lifecycle");
  const asset = await context.repository.findAsset(assetId);
  if (!asset) throw new MediaError("MEDIA_NOT_FOUND");
  const usages = await context.repository.listUsage(asset.id, asset.storagePath);
  if (usages.length > 0) throw new MediaError("MEDIA_ASSET_IN_USE", { usages });
  await context.repository.setRetiredAt(asset.id, asset.retiredAt ?? context.now());
}

export async function restoreMediaAsset(
  context: MediaCommandContext,
  assetId: string,
): Promise<void> {
  assertMediaPermission(context.roles, "manage_lifecycle");
  if (!(await context.repository.findAsset(assetId))) throw new MediaError("MEDIA_NOT_FOUND");
  await context.repository.setRetiredAt(assetId, null);
}

export async function deleteUnusedMediaAsset(
  context: MediaCommandContext,
  assetId: string,
): Promise<void> {
  assertMediaPermission(context.roles, "hard_delete");
  const asset = await context.repository.findAsset(assetId);
  if (!asset) throw new MediaError("MEDIA_NOT_FOUND");
  if (asset.firstPublishedAt) throw new MediaError("MEDIA_ALREADY_PUBLISHED");
  const usages = await context.repository.listUsage(asset.id, asset.storagePath);
  if (usages.length > 0) throw new MediaError("MEDIA_ASSET_IN_USE", { usages });
  if (!(await context.repository.deleteAsset(asset.id))) {
    throw new MediaError("MEDIA_DELETE_NOT_ALLOWED");
  }
  try {
    await context.storage.deleteFinalObject(asset.storagePath);
  } catch (error) {
    context.reportStorageError({
      assetId,
      operation: "hard-delete-cleanup",
      storagePath: asset.storagePath,
      bucketCategory: "final",
      errorCategory: error instanceof MediaStoragePortError ? error.kind : "unexpected",
    });
    throw new MediaError("MEDIA_STORAGE_FAILURE");
  }
}

export function markMediaAssetsFirstPublished(
  repository: MediaRepository,
  assetIds: readonly string[],
  publishedAt: Date,
): Promise<void> {
  if (assetIds.length === 0) return Promise.resolve();
  return repository.markFirstPublished([...new Set(assetIds)], publishedAt);
}
