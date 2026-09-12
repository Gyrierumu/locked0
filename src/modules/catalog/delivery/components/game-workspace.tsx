import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { routes } from "@/config/routes";

import type { AdminGameContext } from "../../contracts";
import { GameWorkspaceNav } from "./game-workspace-nav.client";

type GameWorkspaceProps = Readonly<{
  children: ReactNode;
  game: AdminGameContext;
}>;

export function GameWorkspace({ children, game }: GameWorkspaceProps) {
  return (
    <div className="mx-auto max-w-5xl">
      <header>
        <Link
          href={routes.adminGames}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Jogos
        </Link>
        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight">{game.name}</h1>
              <Badge tone={game.status === "active" ? "success" : "warning"}>
                {game.status === "active" ? "Ativo" : "Arquivado"}
              </Badge>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {game.releaseCount} {game.releaseCount === 1 ? "release" : "releases"}
              <span aria-hidden="true"> · </span>
              {game.contentPackCount}{" "}
              {game.contentPackCount === 1 ? "conteúdo adicional" : "conteúdos adicionais"}
            </p>
          </div>
        </div>
        <Suspense fallback={<div className="mt-6 h-12 border-b border-border" />}>
          <GameWorkspaceNav gameId={game.id} />
        </Suspense>
      </header>
      <div className="py-7">{children}</div>
    </div>
  );
}

