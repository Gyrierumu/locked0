import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getCurrentMediaCapabilities,
  getMediaAsset,
  getMediaUsage,
  listMediaScopeGames,
} from "@/modules/media/server";
import { MediaAssetDetail } from "@/modules/media/ui";

export const metadata: Metadata = { title: "Detalhe do asset" };

export default async function MediaAssetPage({
  params,
}: Readonly<{ params: Promise<{ assetId: string }> }>) {
  const { assetId } = await params;
  const asset = await getMediaAsset(assetId);
  if (!asset) notFound();
  const [usages, games, capabilities] = await Promise.all([
    getMediaUsage(assetId),
    listMediaScopeGames(),
    getCurrentMediaCapabilities(),
  ]);
  return <MediaAssetDetail asset={asset} usages={usages} games={games} capabilities={capabilities} />;
}
