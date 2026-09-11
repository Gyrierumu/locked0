import { clientEnv } from "@/config/env.client";
import { brand } from "@/config/brand";

export const siteConfig = {
  name: brand.name,
  description: brand.tagline,
  url: clientEnv.siteUrl,
} as const;
