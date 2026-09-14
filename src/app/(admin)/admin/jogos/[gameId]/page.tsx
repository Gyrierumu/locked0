import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getAdminGame, getCurrentCatalogCapabilities } from "@/modules/catalog/server";
import { GameOverview } from "@/modules/catalog/ui";
import { listMediaScopeGames, resolvePublicMediaPaths } from "@/modules/media/server";

export const metadata: Metadata = {
  title: "Overview do jogo",
};

type GamePageProps = Readonly<{
  params: Promise<{ gameId: string }>;
}>;

export default async function GamePage({ params }: GamePageProps) {
  const { gameId } = await params;
  const [game, capabilities, games] = await Promise.all([
    getAdminGame(gameId),
    getCurrentCatalogCapabilities(),
    listMediaScopeGames(),
  ]);
  if (!game) notFound();
  const previewUrls = await resolvePublicMediaPaths([game.coverPath, game.heroPath]);

  return (
    <GameOverview
      game={game}
      capabilities={capabilities}
      games={games}
      coverPreviewUrl={game.coverPath ? previewUrls[game.coverPath] ?? null : null}
      heroPreviewUrl={game.heroPath ? previewUrls[game.heroPath] ?? null : null}
    />
  );
}
