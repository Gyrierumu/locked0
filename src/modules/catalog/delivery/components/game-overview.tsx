import { Card } from "@/components/ui/card";

import type { AdminGame, CatalogCapabilities } from "../../contracts";
import { archiveGameAction, restoreGameAction } from "../actions/catalog-actions";
import { GameForm } from "./game-form.client";
import { LifecycleAction } from "./lifecycle-action.client";

export function GameOverview({
  capabilities,
  game,
}: Readonly<{ capabilities: CatalogCapabilities; game: AdminGame }>) {
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

