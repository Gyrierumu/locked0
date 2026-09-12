import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getAdminGameContext,
  getCurrentCatalogCapabilities,
  listGameContentPacks,
} from "@/modules/catalog/server";
import { ContentPackList } from "@/modules/catalog/ui";

export const metadata: Metadata = {
  title: "Conteúdos adicionais",
};

type ContentPacksPageProps = Readonly<{
  params: Promise<{ gameId: string }>;
}>;

export default async function ContentPacksPage({ params }: ContentPacksPageProps) {
  const { gameId } = await params;
  const [game, contentPacks, capabilities] = await Promise.all([
    getAdminGameContext(gameId),
    listGameContentPacks(gameId),
    getCurrentCatalogCapabilities(),
  ]);
  if (!game) notFound();

  return (
    <ContentPackList
      game={game}
      contentPacks={contentPacks}
      capabilities={capabilities}
    />
  );
}

