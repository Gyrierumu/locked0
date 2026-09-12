import "server-only";

import { cache } from "react";

import type {
  AchievementGroupInput,
  AchievementSetMetadataInput,
  ContentPackInput,
  CreateAchievementInput,
  CreateAchievementSetInput,
  CreateGameInput,
  GameMetadataInput,
  GameReleaseInput,
  PlatformInput,
} from "./contracts";
import {
  applyAchievementPaste as applyAchievementPasteCommand,
  archiveAchievement as archiveAchievementCommand,
  createAchievement as createAchievementCommand,
  createAchievementGroup as createAchievementGroupCommand,
  createAchievementSet as createAchievementSetCommand,
  moveAchievement as moveAchievementCommand,
  previewAchievementPaste as previewAchievementPasteCommand,
  reorderAchievementGroups as reorderAchievementGroupsCommand,
  replaceAchievementSetReleases as replaceAchievementSetReleasesCommand,
  restoreAchievement as restoreAchievementCommand,
  updateAchievement as updateAchievementCommand,
  updateAchievementGroup as updateAchievementGroupCommand,
  updateAchievementSet as updateAchievementSetCommand,
} from "./application/commands/achievement-commands";
import {
  getAchievementSetWorkspace as getAchievementSetWorkspaceQuery,
  listAchievementGroups as listAchievementGroupsQuery,
  listAchievements as listAchievementsQuery,
  listGameAchievementSets as listGameAchievementSetsQuery,
} from "./application/queries/achievement-queries";
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
  adminAchievementListSchema,
  adminGameListSchema,
  catalogIdSchema,
} from "./delivery/schemas/catalog-schemas";
import { drizzleAchievementRepository } from "./infrastructure/repositories/drizzle-achievement-repository";
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

async function achievementReadContext() {
  const actor = await requireRole("author");
  return { roles: actor.roles, repository: drizzleAchievementRepository };
}

async function achievementCommandContext() {
  const actor = await requireRole("editor");
  return { roles: actor.roles, repository: drizzleAchievementRepository };
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

export function parseAdminAchievementListQuery(input: unknown) {
  return adminAchievementListSchema.parse(input);
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

export async function listGameAchievementSets(gameId: string) {
  if (!validId(gameId)) return [];
  return listGameAchievementSetsQuery(await achievementReadContext(), gameId);
}

export async function getAchievementSetWorkspace(gameId: string, achievementSetId: string) {
  if (!validId(gameId) || !validId(achievementSetId)) return null;
  return getAchievementSetWorkspaceQuery(
    await achievementReadContext(),
    gameId,
    achievementSetId,
  );
}

export async function listAchievementGroups(gameId: string, achievementSetId: string) {
  if (!validId(gameId) || !validId(achievementSetId)) return [];
  return listAchievementGroupsQuery(
    await achievementReadContext(),
    gameId,
    achievementSetId,
  );
}

export async function listAchievements(
  gameId: string,
  achievementSetId: string,
  input: unknown,
) {
  if (!validId(gameId) || !validId(achievementSetId)) return null;
  return listAchievementsQuery(
    await achievementReadContext(),
    gameId,
    achievementSetId,
    adminAchievementListSchema.parse(input),
  );
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

export async function createAchievementSet(input: CreateAchievementSetInput) {
  return createAchievementSetCommand(await achievementCommandContext(), input);
}

export async function updateAchievementSet(
  gameId: string,
  achievementSetId: string,
  input: AchievementSetMetadataInput,
) {
  return updateAchievementSetCommand(
    await achievementCommandContext(),
    gameId,
    achievementSetId,
    input,
  );
}

export async function replaceAchievementSetReleases(
  gameId: string,
  achievementSetId: string,
  releaseIds: readonly string[],
) {
  return replaceAchievementSetReleasesCommand(
    await achievementCommandContext(),
    gameId,
    achievementSetId,
    releaseIds,
  );
}

export async function createAchievementGroup(
  gameId: string,
  achievementSetId: string,
  input: AchievementGroupInput,
) {
  return createAchievementGroupCommand(
    await achievementCommandContext(),
    gameId,
    achievementSetId,
    input,
  );
}

export async function updateAchievementGroup(
  gameId: string,
  achievementSetId: string,
  groupId: string,
  input: AchievementGroupInput,
) {
  return updateAchievementGroupCommand(
    await achievementCommandContext(),
    gameId,
    achievementSetId,
    groupId,
    input,
  );
}

export async function reorderAchievementGroups(
  gameId: string,
  achievementSetId: string,
  orderedGroupIds: readonly string[],
) {
  return reorderAchievementGroupsCommand(
    await achievementCommandContext(),
    gameId,
    achievementSetId,
    orderedGroupIds,
  );
}

export async function createAchievement(
  gameId: string,
  achievementSetId: string,
  input: CreateAchievementInput,
) {
  return createAchievementCommand(
    await achievementCommandContext(),
    gameId,
    achievementSetId,
    input,
  );
}

export async function updateAchievement(
  gameId: string,
  achievementSetId: string,
  achievementId: string,
  input: CreateAchievementInput,
) {
  return updateAchievementCommand(
    await achievementCommandContext(),
    gameId,
    achievementSetId,
    achievementId,
    input,
  );
}

export async function moveAchievement(
  gameId: string,
  achievementSetId: string,
  achievementId: string,
  targetGroupId: string,
) {
  return moveAchievementCommand(
    await achievementCommandContext(),
    gameId,
    achievementSetId,
    achievementId,
    targetGroupId,
  );
}

export async function archiveAchievement(
  gameId: string,
  achievementSetId: string,
  achievementId: string,
) {
  return archiveAchievementCommand(
    await achievementCommandContext(),
    gameId,
    achievementSetId,
    achievementId,
  );
}

export async function restoreAchievement(
  gameId: string,
  achievementSetId: string,
  achievementId: string,
) {
  return restoreAchievementCommand(
    await achievementCommandContext(),
    gameId,
    achievementSetId,
    achievementId,
  );
}

export async function previewAchievementPaste(input: {
  gameId: string;
  achievementSetId: string;
  targetGroupId: string;
  text: string;
}) {
  return previewAchievementPasteCommand(await achievementCommandContext(), input);
}

export async function applyAchievementPaste(input: {
  gameId: string;
  achievementSetId: string;
  targetGroupId: string;
  text: string;
}) {
  return applyAchievementPasteCommand(await achievementCommandContext(), input);
}
