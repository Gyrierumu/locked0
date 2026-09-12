import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getAdminGameContext,
  getCurrentCatalogCapabilities,
  listGameAchievementSets,
  listGameReleases,
} from "@/modules/catalog/server";
import { AchievementSetList } from "@/modules/catalog/ui";

export const metadata: Metadata = { title: "Achievement Sets" };

type AchievementSetsPageProps = Readonly<{
  params: Promise<{ gameId: string }>;
}>;

export default async function AchievementSetsPage({ params }: AchievementSetsPageProps) {
  const { gameId } = await params;
  const [game, releases, achievementSets, capabilities] = await Promise.all([
    getAdminGameContext(gameId),
    listGameReleases(gameId),
    listGameAchievementSets(gameId),
    getCurrentCatalogCapabilities(),
  ]);
  if (!game) notFound();

  return <AchievementSetList game={game} releases={releases} achievementSets={achievementSets} capabilities={capabilities} />;
}
