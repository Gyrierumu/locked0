import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { routes } from "@/config/routes";
import { getCurrentCatalogCapabilities } from "@/modules/catalog/server";
import { GameForm } from "@/modules/catalog/ui";
import { AccessDenied } from "@/modules/identity/ui";

export const metadata: Metadata = {
  title: "Novo jogo",
};

export default async function NewGamePage() {
  const capabilities = await getCurrentCatalogCapabilities();
  if (!capabilities.canManageGames) return <AccessDenied />;

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href={routes.adminGames}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Jogos
      </Link>
      <div className="mt-5 border-b border-border pb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Catálogo
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Novo jogo</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Cadastre a identidade editorial do jogo. Releases e conteúdos podem ser adicionados
          depois.
        </p>
      </div>
      <div className="mt-7">
        <GameForm />
      </div>
    </div>
  );
}

