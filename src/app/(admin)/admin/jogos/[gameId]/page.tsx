import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getAdminGame, getCurrentCatalogCapabilities } from "@/modules/catalog/server";
import { GameOverview } from "@/modules/catalog/ui";

export const metadata: Metadata = {
  title: "Overview do jogo",
};

type GamePageProps = Readonly<{
  params: Promise<{ gameId: string }>;
}>;

export default async function GamePage({ params }: GamePageProps) {
  const { gameId } = await params;
  const [game, capabilities] = await Promise.all([
    getAdminGame(gameId),
    getCurrentCatalogCapabilities(),
  ]);
  if (!game) notFound();

  return <GameOverview game={game} capabilities={capabilities} />;
}

