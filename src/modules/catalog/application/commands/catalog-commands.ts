import type {
  ContentPackInput,
  CreateGameInput,
  GameMetadataInput,
  GameReleaseInput,
  GameStatus,
  PlatformInput,
} from "../../contracts";
import { CatalogError } from "../../domain/errors";
import type { CatalogRole } from "../../domain/models";
import { assertCatalogPermission } from "../../domain/permissions";
import type { CatalogRepository } from "../ports/catalog-repository";

type CommandContext = Readonly<{
  roles: readonly CatalogRole[];
  repository: CatalogRepository;
}>;

function nullable(value: string | null): string | null {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

function normalizeGameInput(input: GameMetadataInput): GameMetadataInput {
  return {
    name: input.name.trim(),
    slug: input.slug.trim(),
    summary: nullable(input.summary),
    developerName: nullable(input.developerName),
    publisherName: nullable(input.publisherName),
    releaseDate: nullable(input.releaseDate),
  };
}

function normalizeReleaseInput(input: GameReleaseInput): GameReleaseInput {
  return {
    platformId: input.platformId,
    key: input.key.trim(),
    name: nullable(input.name),
    regionCode: nullable(input.regionCode),
    releaseDate: nullable(input.releaseDate),
  };
}

function normalizeContentPackInput(input: ContentPackInput): ContentPackInput {
  return {
    name: input.name.trim(),
    slug: input.slug.trim(),
    type: input.type,
    description: nullable(input.description),
    releaseDate: nullable(input.releaseDate),
    status: input.status,
  };
}

async function requireGame(context: CommandContext, gameId: string) {
  const game = await context.repository.findGameContext(gameId);
  if (!game) throw new CatalogError("not_found");
  return game;
}

export function createGame(context: CommandContext, input: CreateGameInput) {
  assertCatalogPermission(context.roles, "manage_game");
  return context.repository.createGame({ ...normalizeGameInput(input), status: input.status });
}

export async function updateGameMetadata(
  context: CommandContext,
  gameId: string,
  input: GameMetadataInput,
): Promise<void> {
  assertCatalogPermission(context.roles, "manage_game");
  await requireGame(context, gameId);
  await context.repository.updateGame(gameId, normalizeGameInput(input));
}

async function setGameStatus(
  context: CommandContext,
  gameId: string,
  status: GameStatus,
): Promise<void> {
  assertCatalogPermission(context.roles, "manage_game_lifecycle");
  await requireGame(context, gameId);
  await context.repository.setGameStatus(gameId, status);
}

export function archiveGame(context: CommandContext, gameId: string) {
  return setGameStatus(context, gameId, "archived");
}

export function restoreGame(context: CommandContext, gameId: string) {
  return setGameStatus(context, gameId, "active");
}

export function createPlatform(context: CommandContext, input: PlatformInput) {
  assertCatalogPermission(context.roles, "manage_platform");
  return context.repository.createPlatform({
    ...input,
    name: input.name.trim(),
    shortName: input.shortName.trim(),
    slug: input.slug.trim(),
  });
}

export async function updatePlatform(
  context: CommandContext,
  platformId: string,
  input: PlatformInput,
): Promise<void> {
  assertCatalogPermission(context.roles, "manage_platform");
  const existing = await context.repository.findPlatform(platformId);
  if (!existing) throw new CatalogError("not_found");
  await context.repository.updatePlatform(platformId, {
    ...input,
    name: input.name.trim(),
    shortName: input.shortName.trim(),
    slug: input.slug.trim(),
    isActive: existing.isActive,
  });
}

export async function setPlatformActive(
  context: CommandContext,
  platformId: string,
  isActive: boolean,
): Promise<void> {
  assertCatalogPermission(context.roles, "manage_platform");
  if (!(await context.repository.findPlatform(platformId))) throw new CatalogError("not_found");
  await context.repository.setPlatformActive(platformId, isActive);
}

export async function createGameRelease(
  context: CommandContext,
  gameId: string,
  input: GameReleaseInput,
) {
  assertCatalogPermission(context.roles, "manage_release");
  const game = await requireGame(context, gameId);
  if (game.status === "archived") throw new CatalogError("game_archived");

  const platform = await context.repository.findPlatform(input.platformId);
  if (!platform) throw new CatalogError("not_found");
  if (!platform.isActive) throw new CatalogError("platform_inactive");

  return context.repository.createGameRelease(gameId, normalizeReleaseInput(input));
}

export async function updateGameRelease(
  context: CommandContext,
  gameId: string,
  releaseId: string,
  input: GameReleaseInput,
): Promise<void> {
  assertCatalogPermission(context.roles, "manage_release");
  await requireGame(context, gameId);
  const release = await context.repository.findGameRelease(gameId, releaseId);
  if (!release) throw new CatalogError("not_found");

  if (release.platform.id !== input.platformId) {
    const platform = await context.repository.findPlatform(input.platformId);
    if (!platform) throw new CatalogError("not_found");
    if (!platform.isActive) throw new CatalogError("platform_inactive");
  }

  await context.repository.updateGameRelease(
    gameId,
    releaseId,
    normalizeReleaseInput(input),
  );
}

export async function createContentPack(
  context: CommandContext,
  gameId: string,
  input: ContentPackInput,
) {
  assertCatalogPermission(context.roles, "manage_content_pack");
  const game = await requireGame(context, gameId);
  if (game.status === "archived") throw new CatalogError("game_archived");
  return context.repository.createContentPack(gameId, normalizeContentPackInput(input));
}

export async function updateContentPack(
  context: CommandContext,
  gameId: string,
  contentPackId: string,
  input: ContentPackInput,
): Promise<void> {
  assertCatalogPermission(context.roles, "manage_content_pack");
  await requireGame(context, gameId);
  const existing = await context.repository.findContentPack(gameId, contentPackId);
  if (!existing) {
    throw new CatalogError("not_found");
  }
  await context.repository.updateContentPack(
    gameId,
    contentPackId,
    { ...normalizeContentPackInput(input), status: existing.status },
  );
}

async function setContentPackStatus(
  context: CommandContext,
  gameId: string,
  contentPackId: string,
  status: GameStatus,
): Promise<void> {
  assertCatalogPermission(context.roles, "manage_content_pack");
  await requireGame(context, gameId);
  if (!(await context.repository.findContentPack(gameId, contentPackId))) {
    throw new CatalogError("not_found");
  }
  await context.repository.setContentPackStatus(gameId, contentPackId, status);
}

export function archiveContentPack(
  context: CommandContext,
  gameId: string,
  contentPackId: string,
) {
  return setContentPackStatus(context, gameId, contentPackId, "archived");
}

export function restoreContentPack(
  context: CommandContext,
  gameId: string,
  contentPackId: string,
) {
  return setContentPackStatus(context, gameId, contentPackId, "active");
}
