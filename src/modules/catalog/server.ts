import "server-only";

import { cache } from "react";

import type {
  ContentPackInput,
  CreateGameInput,
  GameMetadataInput,
  GameReleaseInput,
  PlatformInput,
} from "./contracts";
import {
  archiveContentPack as archiveContentPackCommand,
  archiveGame as archiveGameCommand,
  createContentPack as createContentPackCommand,
  createGame as createGameCommand,
  createGameRelease as createGameReleaseCommand,
  createPlatform as createPlatformCommand,
  restoreContentPack as restoreContentPackCommand,
  restoreGame as restoreGameCommand,
  setPlatformActive as setPlatformActiveCommand,
  updateContentPack as updateContentPackCommand,
  updateGameMetadata as updateGameMetadataCommand,
  updateGameRelease as updateGameReleaseCommand,
  updatePlatform as updatePlatformCommand,
} from "./application/commands/catalog-commands";
import {
  getAdminGame as getAdminGameQuery,
  getAdminGameContext as getAdminGameContextQuery,
  listAdminGames as listAdminGamesQuery,
  listAdminPlatforms as listAdminPlatformsQuery,
  listGameContentPacks as listGameContentPacksQuery,
  listGameReleases as listGameReleasesQuery,
} from "./application/queries/catalog-queries";
import { getCatalogCapabilities as calculateCapabilities } from "./domain/permissions";
import {
  adminGameListSchema,
  catalogIdSchema,
} from "./delivery/schemas/catalog-schemas";
import { drizzleCatalogRepository } from "./infrastructure/repositories/drizzle-catalog-repository";
import { requireRole } from "@/modules/identity/server";

async function readContext() {
  const actor = await requireRole("author");
  return { roles: actor.roles, repository: drizzleCatalogRepository };
}

async function commandContext(minimumRole: "editor" | "admin") {
  const actor = await requireRole(minimumRole);
  return { roles: actor.roles, repository: drizzleCatalogRepository };
}

function validId(id: string): boolean {
  return catalogIdSchema.safeParse(id).success;
}

export const getCurrentCatalogCapabilities = cache(async function getCurrentCatalogCapabilities() {
  const actor = await requireRole("author");
  return calculateCapabilities(actor.roles);
});

export function parseAdminGameListQuery(input: unknown) {
  return adminGameListSchema.parse(input);
}

export async function listAdminGames(input: unknown) {
  const query = adminGameListSchema.parse(input);
  return listAdminGamesQuery(await readContext(), query);
}

export async function getAdminGame(gameId: string) {
  const context = await readContext();
  if (!validId(gameId)) return null;
  return getAdminGameQuery(context, gameId);
}

export const getAdminGameContext = cache(async function getAdminGameContext(gameId: string) {
  const context = await readContext();
  if (!validId(gameId)) return null;
  return getAdminGameContextQuery(context, gameId);
});

export async function listAdminPlatforms(options?: Readonly<{ activeOnly?: boolean }>) {
  return listAdminPlatformsQuery(await readContext(), options);
}

export async function listGameReleases(gameId: string) {
  const context = await readContext();
  if (!validId(gameId)) return [];
  return listGameReleasesQuery(context, gameId);
}

export async function listGameContentPacks(gameId: string) {
  const context = await readContext();
  if (!validId(gameId)) return [];
  return listGameContentPacksQuery(context, gameId);
}

export async function createGame(input: CreateGameInput) {
  return createGameCommand(await commandContext("editor"), input);
}

export async function updateGameMetadata(gameId: string, input: GameMetadataInput) {
  return updateGameMetadataCommand(await commandContext("editor"), gameId, input);
}

export async function archiveGame(gameId: string) {
  return archiveGameCommand(await commandContext("admin"), gameId);
}

export async function restoreGame(gameId: string) {
  return restoreGameCommand(await commandContext("admin"), gameId);
}

export async function createPlatform(input: PlatformInput) {
  return createPlatformCommand(await commandContext("admin"), input);
}

export async function updatePlatform(platformId: string, input: PlatformInput) {
  return updatePlatformCommand(await commandContext("admin"), platformId, input);
}

export async function setPlatformActive(platformId: string, isActive: boolean) {
  return setPlatformActiveCommand(await commandContext("admin"), platformId, isActive);
}

export async function createGameRelease(gameId: string, input: GameReleaseInput) {
  return createGameReleaseCommand(await commandContext("editor"), gameId, input);
}

export async function updateGameRelease(
  gameId: string,
  releaseId: string,
  input: GameReleaseInput,
) {
  return updateGameReleaseCommand(
    await commandContext("editor"),
    gameId,
    releaseId,
    input,
  );
}

export async function createContentPack(gameId: string, input: ContentPackInput) {
  return createContentPackCommand(await commandContext("editor"), gameId, input);
}

export async function updateContentPack(
  gameId: string,
  contentPackId: string,
  input: ContentPackInput,
) {
  return updateContentPackCommand(
    await commandContext("editor"),
    gameId,
    contentPackId,
    input,
  );
}

export async function archiveContentPack(gameId: string, contentPackId: string) {
  return archiveContentPackCommand(
    await commandContext("editor"),
    gameId,
    contentPackId,
  );
}

export async function restoreContentPack(gameId: string, contentPackId: string) {
  return restoreContentPackCommand(
    await commandContext("editor"),
    gameId,
    contentPackId,
  );
}
