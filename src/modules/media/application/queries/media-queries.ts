import type { AdminMediaAsset, AdminMediaListQuery } from "../../contracts";
import { MediaError } from "../../domain/errors";
import { assertMediaPermission, type MediaRole } from "../../domain/permissions";
import type { MediaAssetRecord, MediaRepository } from "../ports/media-repository";
import type { MediaStoragePort } from "../ports/media-storage";

type MediaQueryContext = Readonly<{
  roles: readonly MediaRole[];
  repository: MediaRepository;
  storage: MediaStoragePort;
}>;

function dto(asset: MediaAssetRecord, storage: MediaStoragePort): AdminMediaAsset {
  return {
    id: asset.id,
    originalFilename: asset.originalFilename,
    mimeType: asset.mimeType,
    byteSize: asset.byteSize,
    width: asset.width,
    height: asset.height,
    scopeGame: asset.scopeGame,
    sourceUrl: asset.sourceUrl,
    credit: asset.credit,
    previewUrl: storage.resolvePublicUrl(asset.storagePath),
    firstPublishedAt: asset.firstPublishedAt?.toISOString() ?? null,
    retiredAt: asset.retiredAt?.toISOString() ?? null,
    createdAt: asset.createdAt.toISOString(),
  };
}

export async function listAdminMediaAssets(
  context: MediaQueryContext,
  query: AdminMediaListQuery,
) {
  assertMediaPermission(context.roles, "read");
  const result = await context.repository.listAssets(query);
  return { ...result, items: result.items.map((asset) => dto(asset, context.storage)) };
}

export async function getMediaAsset(context: MediaQueryContext, assetId: string) {
  assertMediaPermission(context.roles, "read");
  const asset = await context.repository.findAsset(assetId);
  return asset ? dto(asset, context.storage) : null;
}

export async function getMediaUsage(context: MediaQueryContext, assetId: string) {
  assertMediaPermission(context.roles, "read");
  const asset = await context.repository.findAsset(assetId);
  if (!asset) throw new MediaError("MEDIA_NOT_FOUND");
  return context.repository.listUsage(asset.id, asset.storagePath);
}

export async function getSelectableMediaAsset(
  context: MediaQueryContext,
  assetId: string,
): Promise<Readonly<{ id: string; storagePath: string }>> {
  assertMediaPermission(context.roles, "read");
  const asset = await context.repository.findAsset(assetId);
  if (!asset) throw new MediaError("MEDIA_NOT_FOUND");
  if (asset.retiredAt) throw new MediaError("MEDIA_RETIRED");
  return { id: asset.id, storagePath: asset.storagePath };
}

export async function listMediaScopeGames(context: MediaQueryContext) {
  assertMediaPermission(context.roles, "read");
  return context.repository.listScopeGames();
}

export async function resolvePublicMediaPaths(
  context: MediaQueryContext,
  paths: readonly (string | null)[],
): Promise<Readonly<Record<string, string>>> {
  assertMediaPermission(context.roles, "read");
  return Object.fromEntries(
    paths.filter((path): path is string => Boolean(path)).map((path) => [path, context.storage.resolvePublicUrl(path)]),
  );
}
