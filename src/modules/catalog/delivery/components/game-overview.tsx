import { Card } from "@/components/ui/card";
import Image from "next/image";
import { CatalogMediaField } from "@/modules/media/ui";
import type { MediaScopeGame } from "@/modules/media/contracts";

import type { AdminGame, CatalogCapabilities } from "../../contracts";
import {
  archiveGameAction,
  clearGameCoverAction,
  clearGameHeroAction,
  restoreGameAction,
  setGameCoverAction,
  setGameHeroAction,
} from "../actions/catalog-actions";
import { GameForm } from "./game-form.client";
import { LifecycleAction } from "./lifecycle-action.client";

export function GameOverview({
  capabilities,
  game,
  games,
  coverPreviewUrl,
  heroPreviewUrl,
}: Readonly<{
  capabilities: CatalogCapabilities;
  game: AdminGame;
  games: readonly MediaScopeGame[];
  coverPreviewUrl: string | null;
  heroPreviewUrl: string | null;
}>) {
  const contextGame = { id: game.id, name: game.name };
  return (
    <div className="space-y-8">
      <section aria-labelledby="game-data-heading">
        <div className="mb-4">
          <h2 id="game-data-heading" className="text-lg font-semibold">
            Dados do jogo
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Metadados editoriais usados para identificar este jogo no catálogo.
          </p>
        </div>
        <GameForm game={game} readOnly={!capabilities.canManageGames} />
      </section>

      <section aria-labelledby="game-media-heading">
        <div className="mb-4">
          <h2 id="game-media-heading" className="text-lg font-semibold">Midia do jogo</h2>
          <p className="mt-1 text-sm text-muted-foreground">Cover e hero usam assets validados da biblioteca do LOCKED:0.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <Card className="p-5 sm:p-6">
            <h3 className="mb-4 font-semibold">Cover</h3>
            {capabilities.canManageGames ? (
              <CatalogMediaField
                label="cover"
                contextGame={contextGame}
                games={games}
                currentPreviewUrl={coverPreviewUrl}
                selectAction={setGameCoverAction.bind(null, game.id)}
                clearAction={clearGameCoverAction.bind(null, game.id)}
              />
            ) : <ReadOnlyMedia label="Cover" previewUrl={coverPreviewUrl} />}
          </Card>
          <Card className="p-5 sm:p-6">
            <h3 className="mb-4 font-semibold">Hero</h3>
            {capabilities.canManageGames ? (
              <CatalogMediaField
                label="hero"
                contextGame={contextGame}
                games={games}
                currentPreviewUrl={heroPreviewUrl}
                selectAction={setGameHeroAction.bind(null, game.id)}
                clearAction={clearGameHeroAction.bind(null, game.id)}
              />
            ) : <ReadOnlyMedia label="Hero" previewUrl={heroPreviewUrl} />}
          </Card>
        </div>
      </section>

      {capabilities.canManageGameLifecycle ? (
        <Card className="border-destructive/40 p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-destructive">
            Danger zone
          </p>
          <h2 className="mt-3 text-lg font-semibold">
            {game.status === "active" ? "Arquivar jogo" : "Restaurar jogo"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {game.status === "active"
              ? "O jogo deixará de estar ativo no catálogo, mas seus dados permanecerão preservados."
              : "O jogo voltará à operação normal e poderá receber novas releases e conteúdos adicionais."}
          </p>
          <div className="mt-5">
            <LifecycleAction
              action={
                game.status === "active"
                  ? archiveGameAction.bind(null, game.id)
                  : restoreGameAction.bind(null, game.id)
              }
              confirmMessage={
                game.status === "active"
                  ? `Arquivar ${game.name}? Os dados serão preservados.`
                  : `Restaurar ${game.name}?`
              }
              label={game.status === "active" ? "Arquivar jogo" : "Restaurar jogo"}
              pendingLabel={game.status === "active" ? "Arquivando…" : "Restaurando…"}
              tone={game.status === "active" ? "destructive" : "outline"}
            />
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function ReadOnlyMedia({ label, previewUrl }: Readonly<{ label: string; previewUrl: string | null }>) {
  return previewUrl ? (
    <div className="relative aspect-video overflow-hidden rounded-lg border border-border bg-muted">
      <Image src={previewUrl} alt={`${label} atual`} fill sizes="384px" className="object-contain" />
    </div>
  ) : <p className="text-sm text-muted-foreground">Nenhum asset selecionado.</p>;
}
