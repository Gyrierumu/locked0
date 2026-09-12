import type { Metadata } from "next";

import {
  getCurrentCatalogCapabilities,
  listAdminPlatforms,
} from "@/modules/catalog/server";
import { PlatformList } from "@/modules/catalog/ui";

export const metadata: Metadata = {
  title: "Plataformas",
};

export default async function PlatformsPage() {
  const [platforms, capabilities] = await Promise.all([
    listAdminPlatforms(),
    getCurrentCatalogCapabilities(),
  ]);

  return <PlatformList platforms={platforms} capabilities={capabilities} />;
}

