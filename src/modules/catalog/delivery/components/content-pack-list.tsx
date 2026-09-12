import { Pencil, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

import type {
  AdminContentPack,
  AdminGameContext,
  CatalogCapabilities,
  ContentPackType,
} from "../../contracts";
import {
  archiveContentPackAction,
  restoreContentPackAction,
} from "../actions/catalog-actions";
import { ContentPackForm } from "./content-pack-form.client";
import { LifecycleAction } from "./lifecycle-action.client";

const typeLabel: Readonly<Record<ContentPackType, string>> = {
  expansion: "Expansão",
  dlc: "DLC",
  update: "Atualização",
  mode: "Modo",
  other: "Outro",
};

function formatDate(date: string | null): string {
  if (!date) return "Data não informada";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );
}

type ContentPackListProps = Readonly<{
  capabilities: CatalogCapabilities;
  contentPacks: readonly AdminContentPack[];
  game: AdminGameContext;
}>;

export function ContentPackList({ capabilities, contentPacks, game }: ContentPackListProps) {
  const canCreate = capabilities.canManageContentPacks && game.status === "active";

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Conteúdos adicionais</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            DLCs, expansões, atualizações e modos relevantes para completionistas.
          </p>
        </div>
        {capabilities.canManageContentPacks && game.status === "archived" ? (
          <p className="max-w-sm text-sm text-amber-200">
            Restaure o jogo para adicionar novos conteúdos.
          </p>
        ) : null}
      </div>

      {canCreate ? (
        <details className="mt-6 rounded-xl border border-border bg-card p-5">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <Plus className="size-4" aria-hidden="true" />
            Adicionar conteúdo
          </summary>
          <div className="mt-6 border-t border-border pt-6">
            <ContentPackForm gameId={game.id} />
          </div>
        </details>
      ) : null}

      {contentPacks.length === 0 ? (
        <Card className="mt-6 px-6 py-12 text-center">
          <h3 className="font-semibold">Nenhum conteúdo adicional cadastrado.</h3>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
            Isso é normal para jogos sem DLC, expansões ou atualizações relevantes.
          </p>
        </Card>
      ) : (
        <div className="mt-6 space-y-3">
          {contentPacks.map((contentPack) => (
            <article key={contentPack.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold">{contentPack.name}</h3>
                    <Badge tone={contentPack.status === "active" ? "success" : "warning"}>
                      {contentPack.status === "active" ? "Ativo" : "Arquivado"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {typeLabel[contentPack.type]} · {formatDate(contentPack.releaseDate)}
                  </p>
                  {contentPack.description ? (
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                      {contentPack.description}
                    </p>
                  ) : null}
                </div>
                {capabilities.canManageContentPacks ? (
                  <details className="sm:max-w-3xl">
                    <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                      <Pencil className="size-4" aria-hidden="true" />
                      Editar
                    </summary>
                    <div className="mt-5 space-y-6 border-t border-border pt-5">
                      <ContentPackForm gameId={game.id} contentPack={contentPack} />
                      <div className="border-t border-border pt-5">
                        <LifecycleAction
                          action={
                            contentPack.status === "active"
                              ? archiveContentPackAction.bind(null, game.id, contentPack.id)
                              : restoreContentPackAction.bind(null, game.id, contentPack.id)
                          }
                          confirmMessage={
                            contentPack.status === "active"
                              ? `Arquivar ${contentPack.name}?`
                              : `Restaurar ${contentPack.name}?`
                          }
                          label={contentPack.status === "active" ? "Arquivar conteúdo" : "Restaurar conteúdo"}
                          pendingLabel={contentPack.status === "active" ? "Arquivando…" : "Restaurando…"}
                          tone={contentPack.status === "active" ? "destructive" : "outline"}
                        />
                      </div>
                    </div>
                  </details>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

