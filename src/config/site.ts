import { clientEnv } from "@/config/env.client";

export const siteConfig = {
  name: "Platify",
  description: "Guias e progresso para quem leva jogos a sério.",
  url: clientEnv.siteUrl,
} as const;
