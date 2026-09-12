import type { AdminGameListQuery } from "../../contracts";
import { assertCatalogPermission } from "../../domain/permissions";
import type { CatalogRole } from "../../domain/models";
import type { CatalogRepository } from "../ports/catalog-repository";

type QueryContext = Readonly<{
  roles: readonly CatalogRole[];
  repository: CatalogRepository;
}>;

function authorizeRead(context: QueryContext): void {
  assertCatalogPermission(context.roles, "read");
}

export function listAdminGames(context: QueryContext, query: AdminGameListQuery) {
  authorizeRead(context);
  return context.repository.listGames(query);
}

export function getAdminGame(context: QueryContext, gameId: string) {
  authorizeRead(context);
  return context.repository.findGame(gameId);
}

export function getAdminGameContext(context: QueryContext, gameId: string) {
  authorizeRead(context);
  return context.repository.findGameContext(gameId);
}

export function listAdminPlatforms(
  context: QueryContext,
  options?: Readonly<{ activeOnly?: boolean }>,
) {
  authorizeRead(context);
  return context.repository.listPlatforms(options);
}

export function listGameReleases(context: QueryContext, gameId: string) {
  authorizeRead(context);
  return context.repository.listGameReleases(gameId);
}

export function listGameContentPacks(context: QueryContext, gameId: string) {
  authorizeRead(context);
  return context.repository.listGameContentPacks(gameId);
}

