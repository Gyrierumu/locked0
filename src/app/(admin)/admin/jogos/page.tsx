import type { Metadata } from "next";

import {
  getCurrentCatalogCapabilities,
  listAdminGames,
  parseAdminGameListQuery,
} from "@/modules/catalog/server";
import { GameList } from "@/modules/catalog/ui";

export const metadata: Metadata = {
  title: "Jogos",
};

type GamesPageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

export default async function GamesPage({ searchParams }: GamesPageProps) {
  const query = parseAdminGameListQuery(await searchParams);
  const [data, capabilities] = await Promise.all([
    listAdminGames(query),
    getCurrentCatalogCapabilities(),
  ]);

  return <GameList data={data} query={query} capabilities={capabilities} />;
}

