import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getAdminGameContext,
  getCurrentCatalogCapabilities,
  listAdminPlatforms,
  listGameReleases,
} from "@/modules/catalog/server";
import { ReleaseList } from "@/modules/catalog/ui";

export const metadata: Metadata = {
  title: "Releases",
};

type ReleasesPageProps = Readonly<{
  params: Promise<{ gameId: string }>;
}>;

export default async function ReleasesPage({ params }: ReleasesPageProps) {
  const { gameId } = await params;
  const [game, releases, platforms, capabilities] = await Promise.all([
    getAdminGameContext(gameId),
    listGameReleases(gameId),
    listAdminPlatforms(),
    getCurrentCatalogCapabilities(),
  ]);
  if (!game) notFound();

  return (
    <ReleaseList
      game={game}
      releases={releases}
      platforms={platforms}
      capabilities={capabilities}
    />
  );
}

