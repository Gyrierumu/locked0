import { ArrowLeft, ExternalLink } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { routes } from "@/config/routes";

import type {
  AdminMediaAsset,
  MediaCapabilities,
  MediaScopeGame,
  MediaUsage,
  MediaUsageKind,
} from "../../contracts";
import { MediaLifecycle } from "./media-lifecycle.client";
import { MediaMetadataForm } from "./media-metadata-form.client";

const usageLabel: Readonly<Record<MediaUsageKind, string>> = {
  game_cover: "Capa de jogo",
  game_hero: "Hero de jogo",
  platform_icon: "Icone de plataforma",
  achievement_icon: "Icone de achievement",
  guide_image: "Imagem em Guide",
};

function formatBytes(value: number): string {
  return value >= 1024 * 1024
    ? `${(value / (1024 * 1024)).toFixed(2)} MB`
    : `${Math.max(1, Math.round(value / 1024))} KB`;
}

function formatDate(value: string | null): string {
  return value
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
    : "Nunca";
}

export function MediaAssetDetail({
  asset,
  usages,
  games,
  capabilities,
}: Readonly<{
  asset: AdminMediaAsset;
  usages: readonly MediaUsage[];
  games: readonly MediaScopeGame[];
  capabilities: MediaCapabilities;
}>) {
  const canDeleteNow = asset.firstPublishedAt === null && usages.length === 0;
  return (
    <div className="mx-auto max-w-6xl">
      <Button render={<Link href={routes.adminMedia} />} variant="ghost">
        <ArrowLeft aria-hidden="true" /> Voltar para Midia
      </Button>
      <div className="mt-5 flex flex-col gap-3 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Asset</p>
          <h1 className="mt-2 truncate text-2xl font-semibold">{asset.originalFilename}</h1>
        </div>
        <Badge tone={asset.retiredAt ? "warning" : "success"}>{asset.retiredAt ? "Retirado" : "Ativo"}</Badge>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.75fr)]">
        <div className="space-y-6">
          <Card className="overflow-hidden p-0">
            <div className="relative aspect-video bg-muted">
              <Image src={asset.previewUrl} alt={asset.originalFilename} fill sizes="(max-width: 1024px) 100vw, 65vw" className="object-contain" priority />
            </div>
          </Card>
          <Card className="p-5 sm:p-6">
            <h2 className="text-lg font-semibold">Usado por</h2>
            {usages.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Nenhuma referencia atual.</p>
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {usages.map((usage) => (
                  <li key={`${usage.kind}-${usage.entityId}`} className="py-3 first:pt-0 last:pb-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{usageLabel[usage.kind]}</p>
                    <p className="mt-1 font-medium">{usage.label}</p>
                    {usage.context ? <p className="mt-1 text-sm text-muted-foreground">{usage.context}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <h2 className="text-lg font-semibold">Metadata tecnica</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div><dt className="text-xs text-muted-foreground">Dimensoes</dt><dd className="mt-1">{asset.width ?? "?"} x {asset.height ?? "?"} px</dd></div>
              <div><dt className="text-xs text-muted-foreground">MIME</dt><dd className="mt-1 font-mono text-xs">{asset.mimeType}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Tamanho</dt><dd className="mt-1">{formatBytes(asset.byteSize)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Jogo relacionado</dt><dd className="mt-1">{asset.scopeGame?.name ?? "Global"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Enviado em</dt><dd className="mt-1">{formatDate(asset.createdAt)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Primeira publicacao</dt><dd className="mt-1">{formatDate(asset.firstPublishedAt)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Retirado em</dt><dd className="mt-1">{formatDate(asset.retiredAt)}</dd></div>
              {asset.sourceUrl ? <div><dt className="text-xs text-muted-foreground">Source URL</dt><dd className="mt-1"><a href={asset.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 break-all text-primary hover:underline">Abrir fonte <ExternalLink className="size-3" aria-hidden="true" /></a></dd></div> : null}
              {asset.credit ? <div><dt className="text-xs text-muted-foreground">Credito</dt><dd className="mt-1">{asset.credit}</dd></div> : null}
            </dl>
          </Card>

          {capabilities.canManageMetadata ? (
            <Card className="p-5 sm:p-6">
              <h2 className="mb-4 text-lg font-semibold">Metadata administrativa</h2>
              <MediaMetadataForm asset={asset} games={games} />
            </Card>
          ) : null}

          {(capabilities.canManageLifecycle || capabilities.canHardDelete) ? (
            <Card className="border-destructive/30 p-5 sm:p-6">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-destructive">Lifecycle</p>
              <MediaLifecycle
                assetId={asset.id}
                retired={Boolean(asset.retiredAt)}
                canManageLifecycle={capabilities.canManageLifecycle}
                canHardDelete={capabilities.canHardDelete}
                canDeleteNow={canDeleteNow}
                inUse={usages.length > 0}
              />
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
