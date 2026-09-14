import type { Metadata } from "next";

import {
  getCurrentCatalogCapabilities,
  listAdminPlatforms,
} from "@/modules/catalog/server";
import { PlatformList } from "@/modules/catalog/ui";
import { listMediaScopeGames, resolvePublicMediaPaths } from "@/modules/media/server";

export const metadata: Metadata = {
  title: "Plataformas",
};

export default async function PlatformsPage() {
  const [platforms, capabilities, games] = await Promise.all([
    listAdminPlatforms(),
    getCurrentCatalogCapabilities(),
    listMediaScopeGames(),
  ]);
  const previewUrls = await resolvePublicMediaPaths(platforms.map((platform) => platform.iconPath));

  return <PlatformList platforms={platforms} capabilities={capabilities} games={games} previewUrls={previewUrls} />;
}
