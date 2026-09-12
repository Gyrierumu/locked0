import type { AdminAchievementListQuery, CatalogRole } from "../../contracts";
import { assertCatalogPermission } from "../../domain/permissions";
import type { AchievementRepository } from "../ports/achievement-repository";

type QueryContext = Readonly<{
  roles: readonly CatalogRole[];
  repository: AchievementRepository;
}>;

function authorizeRead(context: QueryContext): void {
  assertCatalogPermission(context.roles, "read");
}

export function listGameAchievementSets(context: QueryContext, gameId: string) {
  authorizeRead(context);
  return context.repository.listAchievementSets(gameId);
}

export async function getAchievementSetWorkspace(
  context: QueryContext,
  gameId: string,
  achievementSetId: string,
) {
  authorizeRead(context);
  const achievementSet = await context.repository.findAchievementSet(gameId, achievementSetId);
  if (!achievementSet) return null;
  const [groups, summary] = await Promise.all([
    context.repository.listAchievementGroups(achievementSetId),
    context.repository.getAchievementSummary(achievementSetId),
  ]);

  return {
    ...achievementSet,
    groups,
    hiddenCount: summary.hiddenCount,
    pointsTotal: summary.pointsTotal,
  };
}

export function listAchievementGroups(
  context: QueryContext,
  gameId: string,
  achievementSetId: string,
) {
  authorizeRead(context);
  return context.repository.findAchievementSet(gameId, achievementSetId).then((achievementSet) =>
    achievementSet ? context.repository.listAchievementGroups(achievementSetId) : [],
  );
}

export async function listAchievements(
  context: QueryContext,
  gameId: string,
  achievementSetId: string,
  query: AdminAchievementListQuery,
) {
  authorizeRead(context);
  if (!(await context.repository.findAchievementSet(gameId, achievementSetId))) return null;
  return context.repository.listAchievements(achievementSetId, query);
}
