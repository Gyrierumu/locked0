import { Pencil, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

import type { AdminPlatform, CatalogCapabilities } from "../../contracts";
import { setPlatformActiveAction } from "../actions/catalog-actions";
import { LifecycleAction } from "./lifecycle-action.client";
import { PlatformForm } from "./platform-form.client";

export function PlatformList({
  capabilities,
  platforms,
}: Readonly<{
  capabilities: CatalogCapabilities;
  platforms: readonly AdminPlatform[];
}>) {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="border-b border-border pb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Plataformas
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Ambientes do catálogo</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Ambientes suportados pelo catálogo do LOCKED:0.
        </p>
      </div>

      {capabilities.canManagePlatforms ? (
        <details className="mt-6 rounded-xl border border-border bg-card p-5">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <Plus className="size-4" aria-hidden="true" />
            Nova plataforma
          </summary>
          <div className="mt-6 border-t border-border pt-6">
            <PlatformForm />
          </div>
        </details>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">
          Plataformas são somente leitura para o seu perfil.
        </p>
      )}

      {platforms.length === 0 ? (
        <Card className="mt-6 px-6 py-12 text-center">
          <h2 className="font-semibold">Nenhuma plataforma cadastrada.</h2>
        </Card>
      ) : (
        <div className="mt-6 space-y-3">
          {platforms.map((platform) => (
            <article key={platform.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold">{platform.name}</h2>
                    <Badge tone={platform.isActive ? "success" : "warning"}>
                      {platform.isActive ? "Ativa" : "Inativa"}
                    </Badge>
                  </div>
                  <dl className="mt-4 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-xs text-muted-foreground">Nome curto</dt>
                      <dd className="mt-1">{platform.shortName}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Slug</dt>
                      <dd className="mt-1 font-mono">{platform.slug}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Ordem</dt>
                      <dd className="mt-1">{platform.sortOrder}</dd>
                    </div>
                  </dl>
                </div>
                {capabilities.canManagePlatforms ? (
                  <details className="sm:max-w-3xl">
                    <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                      <Pencil className="size-4" aria-hidden="true" />
                      Editar
                    </summary>
                    <div className="mt-5 space-y-6 border-t border-border pt-5">
                      <PlatformForm platform={platform} />
                      <div className="border-t border-border pt-5">
                        <LifecycleAction
                          action={setPlatformActiveAction.bind(
                            null,
                            platform.id,
                            !platform.isActive,
                          )}
                          confirmMessage={
                            platform.isActive
                              ? `Desativar ${platform.name}? Releases existentes serão preservadas.`
                              : `Reativar ${platform.name}?`
                          }
                          label={platform.isActive ? "Desativar plataforma" : "Reativar plataforma"}
                          pendingLabel={platform.isActive ? "Desativando…" : "Reativando…"}
                          tone={platform.isActive ? "destructive" : "outline"}
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

