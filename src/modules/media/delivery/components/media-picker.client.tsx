"use client";

import { Check, ImageIcon, Search, X } from "lucide-react";
import Image from "next/image";
import { useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import type {
  MediaScopeGame,
  PaginatedMediaAssets,
} from "../../contracts";
import type { MediaActionState } from "../action-state";
import { MediaUploadForm } from "./media-upload.client";

type AssignmentAction = (assetId: string) => Promise<MediaActionState>;
type ClearAction = () => Promise<MediaActionState>;

export function MediaPicker({
  label,
  contextGame = null,
  games,
  currentPreviewUrl = null,
  onSelect,
  onClear,
}: Readonly<{
  label: string;
  contextGame?: MediaScopeGame | null;
  games: readonly MediaScopeGame[];
  currentPreviewUrl?: string | null;
  onSelect: AssignmentAction;
  onClear?: ClearAction;
}>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const id = useId();
  const titleId = `${id}-title`;
  const searchId = `${id}-search`;
  const router = useRouter();
  const [result, setResult] = useState<PaginatedMediaAssets | null>(null);
  const [query, setQuery] = useState("");
  const [scopeOnly, setScopeOnly] = useState(Boolean(contextGame));
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function load(page = 1, nextQuery = query, scoped = scopeOnly) {
    setLoading(true);
    setMessage(null);
    const params = new URLSearchParams({ status: "active", page: String(page) });
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    if (scoped && contextGame) params.set("game", contextGame.id);
    try {
      const response = await fetch(`/api/admin/media?${params}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Nao foi possivel carregar a biblioteca.");
      setResult(await response.json() as PaginatedMediaAssets);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao carregar assets.");
    } finally {
      setLoading(false);
    }
  }

  function open() {
    dialogRef.current?.showModal();
    void load(1);
  }

  function select(assetId: string) {
    setSelectedId(assetId);
    startTransition(async () => {
      const state = await onSelect(assetId);
      setMessage(state.message);
      if (state.status === "success") {
        dialogRef.current?.close();
        router.refresh();
      }
    });
  }

  function clear() {
    if (!onClear) return;
    startTransition(async () => {
      const state = await onClear();
      setMessage(state.message);
      if (state.status === "success") router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="relative flex aspect-[16/9] max-w-sm items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
        {currentPreviewUrl ? (
          <Image src={currentPreviewUrl} alt={`${label} atual`} fill sizes="384px" className="object-contain" />
        ) : (
          <div className="text-center text-muted-foreground"><ImageIcon className="mx-auto size-8" aria-hidden="true" /><p className="mt-2 text-xs">Nenhuma imagem</p></div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={open}>Selecionar / Upload</Button>
        {currentPreviewUrl && onClear ? <Button type="button" variant="ghost" onClick={clear} disabled={pending}>Limpar</Button> : null}
      </div>
      <p aria-live="polite" className="whitespace-pre-line text-sm text-muted-foreground">{message}</p>

      <dialog ref={dialogRef} aria-labelledby={titleId} className="m-auto h-[min(52rem,calc(100%-2rem))] w-[min(70rem,calc(100%-2rem))] rounded-xl border border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-black/70">
        <div className="flex items-start justify-between border-b border-border p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Midia</p>
            <h2 id={titleId} className="mt-1 text-xl font-semibold">Selecionar {label}</h2>
            {contextGame ? <p className="mt-1 text-sm text-muted-foreground">{contextGame.name}</p> : null}
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={() => dialogRef.current?.close()} aria-label="Fechar seletor"><X aria-hidden="true" /></Button>
        </div>
        <div className="max-h-[calc(100%-5rem)] overflow-y-auto p-5">
          <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); void load(1); }}>
            <label htmlFor={searchId} className="sr-only">Buscar assets</label>
            <Input id={searchId} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por arquivo ou credito" />
            <Button type="submit" variant="outline" disabled={loading}><Search aria-hidden="true" /> Buscar</Button>
          </form>
          {contextGame ? (
            <Button
              type="button"
              variant="ghost"
              className="mt-2"
              onClick={() => { const next = !scopeOnly; setScopeOnly(next); void load(1, query, next); }}
            >
              {scopeOnly ? "Ver todos os assets" : `Priorizar ${contextGame.name}`}
            </Button>
          ) : null}

          <details className="mt-4 rounded-lg border border-border p-4">
            <summary className="cursor-pointer font-medium focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">Enviar nova imagem</summary>
            <div className="mt-4 border-t border-border pt-4">
              <MediaUploadForm games={games} defaultGameId={contextGame?.id ?? null} onUploaded={select} />
            </div>
          </details>

          {message ? <p role="alert" className="mt-4 whitespace-pre-line text-sm text-destructive">{message}</p> : null}
          {loading ? <p className="mt-6 text-sm text-muted-foreground">Carregando assets...</p> : null}
          {!loading && result?.items.length === 0 ? <p className="mt-6 text-sm text-muted-foreground">Nenhum asset ativo encontrado.</p> : null}
          {!loading && result?.items.length ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {result.items.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => select(asset.id)}
                  aria-pressed={selectedId === asset.id}
                  aria-label={`Selecionar ${asset.originalFilename}`}
                  disabled={pending}
                  className="group rounded-lg border border-border bg-background p-2 text-left transition hover:border-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-primary aria-pressed:ring-2 aria-pressed:ring-primary"
                >
                  <span className="relative block aspect-video overflow-hidden rounded-md bg-muted">
                    <Image src={asset.previewUrl} alt="" fill sizes="(max-width: 640px) 50vw, 240px" className="object-cover" />
                    {selectedId === asset.id ? <span className="absolute right-2 top-2 rounded-full bg-primary p-1 text-primary-foreground"><Check className="size-4" aria-hidden="true" /></span> : null}
                  </span>
                  <span className="mt-2 block truncate text-sm font-medium">{asset.originalFilename}</span>
                  <span className="block text-xs text-muted-foreground">{asset.width} x {asset.height}{asset.scopeGame ? ` - ${asset.scopeGame.name}` : " - Global"}</span>
                </button>
              ))}
            </div>
          ) : null}
          {result && result.totalPages > 1 ? (
            <div className="mt-5 flex items-center justify-between">
              <Button type="button" variant="outline" disabled={loading || result.page === 1} onClick={() => void load(result.page - 1)}>Anterior</Button>
              <span className="text-sm text-muted-foreground">Pagina {result.page} de {result.totalPages}</span>
              <Button type="button" variant="outline" disabled={loading || result.page === result.totalPages} onClick={() => void load(result.page + 1)}>Proxima</Button>
            </div>
          ) : null}
        </div>
      </dialog>
    </div>
  );
}
