import { ImageIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { routes } from "@/config/routes";

import type {
  AdminMediaListQuery,
  MediaCapabilities,
  MediaScopeGame,
  PaginatedMediaAssets,
} from "../../contracts";
import { MediaUploadDialog } from "./media-upload.client";

function bytes(value: number): string {
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(value / 1024))} KB`;
}

function pageHref(query: AdminMediaListQuery, page: number): string {
  const params = new URLSearchParams({ status: query.status, page: String(page) });
  if (query.q) params.set("q", query.q);
  if (query.gameId) params.set("game", query.gameId);
  return `${routes.adminMedia}?${params}`;
}

export function MediaLibrary({
  assets,
  query,
  games,
  capabilities,
}: Readonly<{
  assets: PaginatedMediaAssets;
  query: AdminMediaListQuery;
  games: readonly MediaScopeGame[];
  capabilities: MediaCapabilities;
}>) {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-5 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Midia</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Biblioteca de assets</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Imagens editoriais validadas do LOCKED:0.</p>
        </div>
        {capabilities.canUpload ? <MediaUploadDialog games={games} /> : null}
      </div>

      <form action={routes.adminMedia} className="mt-6 grid gap-4 rounded-xl border border-border bg-card p-4 md:grid-cols-[minmax(0,1fr)_16rem_12rem_auto] md:items-end">
        <div>
          <label htmlFor="media-search" className="text-sm font-medium">Buscar</label>
          <Input id="media-search" name="q" defaultValue={query.q} placeholder="Arquivo, credito ou source URL" className="mt-2" />
        </div>
        <div>
          <label htmlFor="media-game" className="text-sm font-medium">Jogo</label>
          <Select id="media-game" name="game" defaultValue={query.gameId ?? ""} className="mt-2">
            <option value="">Todos</option>
            {games.map((game) => <option key={game.id} value={game.id}>{game.name}</option>)}
          </Select>
        </div>
        <div>
          <label htmlFor="media-status" className="text-sm font-medium">Status</label>
          <Select id="media-status" name="status" defaultValue={query.status} className="mt-2">
            <option value="active">Ativos</option>
            <option value="retired">Retirados</option>
            <option value="all">Todos</option>
          </Select>
        </div>
        <Button type="submit">Aplicar filtros</Button>
      </form>

      <p className="mt-5 text-sm text-muted-foreground">{assets.total} asset{assets.total === 1 ? "" : "s"}</p>
      {assets.items.length === 0 ? (
        <Card className="mt-5 px-6 py-14 text-center">
          <ImageIcon className="mx-auto size-9 text-muted-foreground" aria-hidden="true" />
          <h2 className="mt-4 font-semibold">{query.status === "retired" ? "Nenhum asset retirado." : "Nenhum asset encontrado."}</h2>
          {query.status !== "retired" ? <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">Envie a primeira imagem para comecar a biblioteca de midia do LOCKED:0.</p> : null}
        </Card>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {assets.items.map((asset) => (
            <Link key={asset.id} href={routes.adminMediaAsset(asset.id)} aria-label={`Abrir ${asset.originalFilename}`} className="group overflow-hidden rounded-xl border border-border bg-card transition hover:border-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
              <div className="relative aspect-video bg-muted">
                <Image src={asset.previewUrl} alt="" fill sizes="(max-width: 640px) 100vw, (max-width: 1280px) 33vw, 25vw" className="object-cover transition group-hover:scale-[1.02]" />
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="truncate text-sm font-semibold">{asset.originalFilename}</h2>
                  {asset.retiredAt ? <Badge tone="warning">Retirado</Badge> : null}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{asset.width ?? "?"} x {asset.height ?? "?"} - {bytes(asset.byteSize)}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{asset.scopeGame?.name ?? "Asset global"}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {assets.totalPages > 1 ? (
        <nav aria-label="Paginacao de assets" className="mt-7 flex items-center justify-between">
          <Button render={<Link href={pageHref(query, Math.max(1, assets.page - 1))} />} variant="outline" aria-disabled={assets.page === 1}>Anterior</Button>
          <span className="text-sm text-muted-foreground">Pagina {assets.page} de {assets.totalPages}</span>
          <Button render={<Link href={pageHref(query, Math.min(assets.totalPages, assets.page + 1))} />} variant="outline" aria-disabled={assets.page === assets.totalPages}>Proxima</Button>
        </nav>
      ) : null}
    </div>
  );
}
