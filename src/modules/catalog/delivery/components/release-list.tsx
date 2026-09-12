import { Pencil, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

import type {
  AdminGameContext,
  AdminGameRelease,
  AdminPlatform,
  CatalogCapabilities,
} from "../../contracts";
import { ReleaseForm } from "./release-form.client";

function formatDate(date: string | null): string {
  if (!date) return "Não informada";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );
}

type ReleaseListProps = Readonly<{
  capabilities: CatalogCapabilities;
  game: AdminGameContext;
  platforms: readonly AdminPlatform[];
  releases: readonly AdminGameRelease[];
}>;

export function ReleaseList({ capabilities, game, platforms, releases }: ReleaseListProps) {
  const canCreate = capabilities.canManageReleases && game.status === "active";

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Releases</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Versões jogáveis relevantes deste jogo.
          </p>
        </div>
        {capabilities.canManageReleases && game.status === "archived" ? (
          <p className="max-w-sm text-sm text-amber-200">
            Restaure o jogo para adicionar novas releases.
          </p>
        ) : null}
      </div>

      {canCreate ? (
        <details className="mt-6 rounded-xl border border-border bg-card p-5">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <Plus className="size-4" aria-hidden="true" />
            Adicionar release
          </summary>
          <div className="mt-6 border-t border-border pt-6">
            {platforms.some((platform) => platform.isActive) ? (
              <ReleaseForm gameId={game.id} platforms={platforms} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Ative ou cadastre uma plataforma antes de criar a release.
              </p>
            )}
          </div>
        </details>
      ) : null}

      {releases.length === 0 ? (
        <Card className="mt-6 px-6 py-12 text-center">
          <h3 className="font-semibold">Este jogo ainda não possui releases.</h3>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
            Adicione as versões jogáveis relevantes, como PS5, Xbox ou Steam.
          </p>
        </Card>
      ) : (
        <div className="mt-6 space-y-3">
          {releases.map((release) => (
            <article key={release.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold">{release.platform.name}</h3>
                    {!release.platform.isActive ? <Badge tone="warning">Inativa</Badge> : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {release.name ?? release.platform.shortName}
                  </p>
                </div>
                {capabilities.canManageReleases ? (
                  <details className="sm:max-w-3xl">
                    <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                      <Pencil className="size-4" aria-hidden="true" />
                      Editar
                    </summary>
                    <div className="mt-5 border-t border-border pt-5">
                      <ReleaseForm gameId={game.id} platforms={platforms} release={release} />
                    </div>
                  </details>
                ) : null}
              </div>
              <dl className="mt-5 grid gap-4 border-t border-border pt-4 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-muted-foreground">Chave</dt>
                  <dd className="mt-1 font-mono">{release.key}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Região</dt>
                  <dd className="mt-1">{release.regionCode ?? "Global / não especificada"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Lançamento</dt>
                  <dd className="mt-1">{formatDate(release.releaseDate)}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}

      <p className="mt-6 text-xs text-muted-foreground">
        Releases podem ser editadas, mas não são removidas pelo Admin nesta etapa.
      </p>
    </div>
  );
}

