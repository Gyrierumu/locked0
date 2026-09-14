"use client";

import { ImagePlus, Upload, X } from "lucide-react";
import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

import { uploadMediaFile } from "../../browser";
import {
  MAX_IMAGE_BYTES,
  MEDIA_ALLOWED_MIME_TYPES,
  type MediaScopeGame,
} from "../../contracts";
import {
  finalizeMediaUploadAction,
  requestMediaUploadAction,
} from "../actions/media-actions";

type UploadStage = "idle" | "preparing" | "uploading" | "processing" | "complete";

const stageLabel: Readonly<Record<UploadStage, string>> = {
  idle: "",
  preparing: "Preparando...",
  uploading: "Enviando...",
  processing: "Processando...",
  complete: "Concluido",
};

export function MediaUploadForm({
  games,
  defaultGameId = null,
  onUploaded,
}: Readonly<{
  games: readonly MediaScopeGame[];
  defaultGameId?: string | null;
  onUploaded?: (assetId: string) => void;
}>) {
  const router = useRouter();
  const id = useId();
  const fileId = `${id}-file`;
  const gameId = `${id}-game`;
  const sourceId = `${id}-source`;
  const creditId = `${id}-credit`;
  const [stage, setStage] = useState<UploadStage>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const pending = stage === "preparing" || stage === "uploading" || stage === "processing";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const formData = new FormData(event.currentTarget);
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setMessage("Selecione uma imagem.");
      return;
    }
    if (!MEDIA_ALLOWED_MIME_TYPES.some((mimeType) => mimeType === file.type)) {
      setMessage("Envie uma imagem JPEG, PNG, WebP ou AVIF.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setMessage("A imagem deve ter no maximo 10 MB.");
      return;
    }

    const metadata = {
      originalFilename: file.name,
      declaredMimeType: file.type,
      declaredByteSize: file.size,
      scopeGameId: String(formData.get("scopeGameId") ?? "") || null,
      sourceUrl: String(formData.get("sourceUrl") ?? "") || null,
      credit: String(formData.get("credit") ?? "") || null,
    };

    try {
      setStage("preparing");
      const authorization = await requestMediaUploadAction(metadata);
      if (!authorization.ok) throw new Error(authorization.message);
      setStage("uploading");
      await uploadMediaFile(authorization.ticket, file);
      setStage("processing");
      const finalized = await finalizeMediaUploadAction(authorization.ticket.assetId, metadata);
      if (!finalized.ok) throw new Error(finalized.message);
      setStage("complete");
      setMessage("Asset adicionado a biblioteca.");
      formRef.current?.reset();
      router.refresh();
      onUploaded?.(finalized.assetId);
    } catch (error) {
      setStage("idle");
      setMessage(error instanceof Error ? error.message : "Nao foi possivel enviar a imagem.");
    }
  }

  return (
    <form ref={formRef} onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor={fileId} className="text-sm font-medium">Imagem</label>
        <Input
          id={fileId}
          name="file"
          type="file"
          accept={MEDIA_ALLOWED_MIME_TYPES.join(",")}
          disabled={pending}
          required
          className="mt-2 file:mr-3 file:font-medium"
        />
        <p className="mt-1 text-xs text-muted-foreground">JPEG, PNG, WebP ou AVIF, ate 10 MB.</p>
      </div>
      <div>
        <label htmlFor={gameId} className="text-sm font-medium">Jogo relacionado</label>
        <Select id={gameId} name="scopeGameId" defaultValue={defaultGameId ?? ""} disabled={pending} className="mt-2">
          <option value="">Asset global</option>
          {games.map((game) => <option key={game.id} value={game.id}>{game.name}</option>)}
        </Select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={sourceId} className="text-sm font-medium">Source URL</label>
          <Input id={sourceId} name="sourceUrl" type="url" placeholder="https://" disabled={pending} className="mt-2" />
        </div>
        <div>
          <label htmlFor={creditId} className="text-sm font-medium">Credito</label>
          <Input id={creditId} name="credit" maxLength={500} disabled={pending} className="mt-2" />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          <Upload aria-hidden="true" />
          {pending ? stageLabel[stage] : "Enviar imagem"}
        </Button>
        <p aria-live="polite" className="whitespace-pre-line text-sm text-muted-foreground">
          {message ?? stageLabel[stage]}
        </p>
      </div>
    </form>
  );
}

export function MediaUploadDialog({ games }: Readonly<{ games: readonly MediaScopeGame[] }>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = `${useId()}-upload-title`;
  return (
    <>
      <Button type="button" onClick={() => dialogRef.current?.showModal()}>
        <ImagePlus aria-hidden="true" /> Upload
      </Button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="m-auto w-[min(44rem,calc(100%-2rem))] rounded-xl border border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-black/70"
      >
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">LOCKED:0 Media</p>
            <h2 id={titleId} className="mt-1 text-xl font-semibold">Enviar imagem</h2>
          </div>
          <Button type="button" size="icon" variant="ghost" onClick={() => dialogRef.current?.close()} aria-label="Fechar upload">
            <X aria-hidden="true" />
          </Button>
        </div>
        <div className="p-5 sm:p-6">
          <MediaUploadForm games={games} onUploaded={() => dialogRef.current?.close()} />
        </div>
      </dialog>
    </>
  );
}
