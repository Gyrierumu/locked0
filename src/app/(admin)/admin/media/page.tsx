import type { Metadata } from "next";

import {
  getCurrentMediaCapabilities,
  listAdminMediaAssets,
  listMediaScopeGames,
  parseAdminMediaListQuery,
} from "@/modules/media/server";
import { MediaLibrary } from "@/modules/media/ui";

export const metadata: Metadata = { title: "Midia" };

type MediaPageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

export default async function MediaPage({ searchParams }: MediaPageProps) {
  const rawSearchParams = await searchParams;
  const query = parseAdminMediaListQuery(rawSearchParams);
  const [assets, games, capabilities] = await Promise.all([
    listAdminMediaAssets(rawSearchParams),
    listMediaScopeGames(),
    getCurrentMediaCapabilities(),
  ]);
  const notice = Array.isArray(rawSearchParams.notice)
    ? rawSearchParams.notice[0]
    : rawSearchParams.notice;

  return (
    <div className="space-y-4">
      {notice === "asset-deleted" ? (
        <p role="status" className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          Asset excluído permanentemente.
        </p>
      ) : null}
      <MediaLibrary assets={assets} query={query} games={games} capabilities={capabilities} />
    </div>
  );
}
