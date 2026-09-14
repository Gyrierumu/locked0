import "server-only";

import { randomUUID } from "node:crypto";
import { cache } from "react";

import { requireRole } from "@/modules/identity/server";

import type { MediaAssetMetadataInput, MediaUploadMetadata } from "./contracts";
import {
  createMediaUpload as createMediaUploadCommand,
  deleteUnusedMediaAsset as deleteUnusedMediaAssetCommand,
  finalizeMediaUpload as finalizeMediaUploadCommand,
  markMediaAssetsFirstPublished as markMediaAssetsFirstPublishedCommand,
  restoreMediaAsset as restoreMediaAssetCommand,
  retireMediaAsset as retireMediaAssetCommand,
  updateMediaAssetMetadata as updateMediaAssetMetadataCommand,
} from "./application/commands/media-commands";
import {
  getMediaAsset as getMediaAssetQuery,
  getMediaUsage as getMediaUsageQuery,
  getSelectableMediaAsset as getSelectableMediaAssetQuery,
  listAdminMediaAssets as listAdminMediaAssetsQuery,
  listMediaScopeGames as listMediaScopeGamesQuery,
  resolvePublicMediaPaths as resolvePublicMediaPathsQuery,
} from "./application/queries/media-queries";
import { getMediaCapabilities as calculateCapabilities } from "./domain/permissions";
import { adminMediaListSchema, mediaIdSchema } from "./delivery/schemas/media-schemas";
import { drizzleMediaRepository } from "./infrastructure/repositories/drizzle-media-repository";
import { sharpImageProcessor } from "./infrastructure/sharp-image-processor";
import { supabaseMediaStorage } from "./infrastructure/supabase-media-storage";

function safeStorageReport(context: Readonly<Record<string, unknown>>): void {
  console.error("media_storage_failure", context);
}

async function queryContext() {
  const actor = await requireRole("author");
  return { roles: actor.roles, repository: drizzleMediaRepository, storage: supabaseMediaStorage };
}

async function commandContext(minimumRole: "author" | "editor" | "admin") {
  const actor = await requireRole(minimumRole);
  return {
    actorId: actor.userId,
    roles: actor.roles,
    repository: drizzleMediaRepository,
    storage: supabaseMediaStorage,
    imageProcessor: sharpImageProcessor,
    idGenerator: randomUUID,
    now: () => new Date(),
    reportStorageError: safeStorageReport,
  };
}

export const getCurrentMediaCapabilities = cache(async function getCurrentMediaCapabilities() {
  const actor = await requireRole("author");
  return calculateCapabilities(actor.roles);
});

export function parseAdminMediaListQuery(input: unknown) {
  return adminMediaListSchema.parse(input);
}

export async function listAdminMediaAssets(input: unknown) {
  return listAdminMediaAssetsQuery(await queryContext(), adminMediaListSchema.parse(input));
}

export async function getMediaAsset(assetId: string) {
  if (!mediaIdSchema.safeParse(assetId).success) return null;
  return getMediaAssetQuery(await queryContext(), assetId);
}

export async function getMediaUsage(assetId: string) {
  mediaIdSchema.parse(assetId);
  return getMediaUsageQuery(await queryContext(), assetId);
}

export async function getSelectableMediaAsset(assetId: string) {
  mediaIdSchema.parse(assetId);
  return getSelectableMediaAssetQuery(await queryContext(), assetId);
}

export async function listMediaScopeGames() {
  return listMediaScopeGamesQuery(await queryContext());
}

export async function resolvePublicMediaPaths(paths: readonly (string | null)[]) {
  return resolvePublicMediaPathsQuery(await queryContext(), paths);
}

export async function createMediaUpload(input: MediaUploadMetadata) {
  return createMediaUploadCommand(await commandContext("author"), input);
}

export async function finalizeMediaUpload(assetId: string, input: MediaUploadMetadata) {
  mediaIdSchema.parse(assetId);
  return finalizeMediaUploadCommand(await commandContext("author"), assetId, input);
}

export async function updateMediaAssetMetadata(
  assetId: string,
  input: MediaAssetMetadataInput,
) {
  mediaIdSchema.parse(assetId);
  return updateMediaAssetMetadataCommand(await commandContext("editor"), assetId, input);
}

export async function retireMediaAsset(assetId: string) {
  mediaIdSchema.parse(assetId);
  return retireMediaAssetCommand(await commandContext("editor"), assetId);
}

export async function restoreMediaAsset(assetId: string) {
  mediaIdSchema.parse(assetId);
  return restoreMediaAssetCommand(await commandContext("editor"), assetId);
}

export async function deleteUnusedMediaAsset(assetId: string) {
  mediaIdSchema.parse(assetId);
  return deleteUnusedMediaAssetCommand(await commandContext("admin"), assetId);
}

export function markMediaAssetsFirstPublished(assetIds: readonly string[], timestamp: Date) {
  const ids = assetIds.map((assetId) => mediaIdSchema.parse(assetId));
  if (Number.isNaN(timestamp.getTime())) throw new TypeError("Invalid publication timestamp.");
  return markMediaAssetsFirstPublishedCommand(drizzleMediaRepository, ids, timestamp);
}
