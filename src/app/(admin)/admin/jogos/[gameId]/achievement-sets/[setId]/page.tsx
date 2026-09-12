import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getAchievementSetWorkspace,
  getAdminGameContext,
  getCurrentCatalogCapabilities,
  listAchievements,
  listGameContentPacks,
  listGameReleases,
  parseAdminAchievementListQuery,
} from "@/modules/catalog/server";
import {
  AchievementGroupList,
  AchievementManager,
  AchievementSetOverview,
  AchievementSetWorkspace,
} from "@/modules/catalog/ui";

export const metadata: Metadata = { title: "Achievement Set" };

type AchievementSetPageProps = Readonly<{
  params: Promise<{ gameId: string; setId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

export default async function AchievementSetPage({ params, searchParams }: AchievementSetPageProps) {
  const [{ gameId, setId }, rawSearchParams] = await Promise.all([params, searchParams]);
  const requestedView = typeof rawSearchParams.view === "string" ? rawSearchParams.view : "overview";
  const view = requestedView === "groups" || requestedView === "achievements" ? requestedView : "overview";
  const query = parseAdminAchievementListQuery(rawSearchParams);
  const [game, achievementSet, releases, contentPacks, capabilities, achievementResult] = await Promise.all([
    getAdminGameContext(gameId),
    getAchievementSetWorkspace(gameId, setId),
    listGameReleases(gameId),
    listGameContentPacks(gameId),
    getCurrentCatalogCapabilities(),
    view === "achievements" ? listAchievements(gameId, setId, query) : Promise.resolve(null),
  ]);
  if (!game || !achievementSet) notFound();

  let content;
  if (view === "groups") {
    content = (
      <AchievementGroupList
        gameId={gameId}
        achievementSetId={setId}
        groups={achievementSet.groups}
        contentPacks={contentPacks}
        canManage={capabilities.canManageAchievements}
      />
    );
  } else if (view === "achievements") {
    if (!achievementResult) notFound();
    content = (
      <AchievementManager
        gameId={gameId}
        achievementSetId={setId}
        groups={achievementSet.groups}
        achievements={achievementResult}
        query={query}
        canManage={capabilities.canManageAchievements}
      />
    );
  } else {
    content = (
      <AchievementSetOverview
        gameId={gameId}
        achievementSet={achievementSet}
        releases={releases}
        canManage={capabilities.canManageAchievements}
      />
    );
  }

  return <AchievementSetWorkspace game={game} achievementSet={achievementSet} view={view}>{content}</AchievementSetWorkspace>;
}
