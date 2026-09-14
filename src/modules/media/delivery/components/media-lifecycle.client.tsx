"use client";

import { Trash2, X } from "lucide-react";
import { useActionState, useId, useRef } from "react";

import { Button } from "@/components/ui/button";

import { initialMediaActionState } from "../action-state";
import {
  deleteUnusedMediaAssetAction,
  restoreMediaAssetAction,
  retireMediaAssetAction,
} from "../actions/media-actions";

export function MediaLifecycle({
  assetId,
  retired,
  canManageLifecycle,
  canHardDelete,
  canDeleteNow,
  inUse,
}: Readonly<{
  assetId: string;
  retired: boolean;
  canManageLifecycle: boolean;
  canHardDelete: boolean;
  canDeleteNow: boolean;
  inUse: boolean;
}>) {
  const titleId = `${useId()}-hard-delete`;
  const deleteDialogRef = useRef<HTMLDialogElement>(null);
  const [lifecycleState, lifecycleAction, lifecyclePending] = useActionState(
    (retired ? restoreMediaAssetAction : retireMediaAssetAction).bind(null, assetId),
    initialMediaActionState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteUnusedMediaAssetAction.bind(null, assetId),
    initialMediaActionState,
  );

  return (
    <div className="space-y-5">
      {canManageLifecycle ? (
        <form action={lifecycleAction}>
          <Button type="submit" variant={retired ? "outline" : "destructive"} disabled={lifecyclePending || (!retired && inUse)}>
            {lifecyclePending ? "Processando..." : retired ? "Restaurar asset" : "Retirar asset"}
          </Button>
          {!retired && inUse ? <p className="mt-2 text-sm text-muted-foreground">Remova as referencias atuais antes de retirar.</p> : null}
          <p aria-live="polite" className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{lifecycleState.message}</p>
        </form>
      ) : null}

      {canHardDelete ? (
        <div className="border-t border-border pt-5">
          <Button type="button" variant="destructive" disabled={!canDeleteNow} onClick={() => deleteDialogRef.current?.showModal()}>
            <Trash2 aria-hidden="true" /> Excluir permanentemente
          </Button>
          {!canDeleteNow ? <p className="mt-2 text-sm text-muted-foreground">Hard delete exige asset nunca publicado e sem referencias atuais.</p> : null}
          <dialog ref={deleteDialogRef} aria-labelledby={titleId} className="m-auto w-[min(32rem,calc(100%-2rem))] rounded-xl border border-destructive/50 bg-card p-0 text-foreground shadow-2xl backdrop:bg-black/70">
            <div className="flex items-center justify-between border-b border-border p-5">
              <h2 id={titleId} className="font-semibold uppercase tracking-wide">Excluir asset permanentemente</h2>
              <Button type="button" size="icon" variant="ghost" onClick={() => deleteDialogRef.current?.close()} aria-label="Cancelar exclusao"><X aria-hidden="true" /></Button>
            </div>
            <div className="space-y-4 p-5 text-sm leading-6">
              <p>Este arquivo nunca foi publicado e nao possui referencias ativas.</p>
              <p className="text-muted-foreground">Essa operacao remove a entrada da biblioteca e o arquivo do Storage.</p>
              <form action={deleteAction} className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => deleteDialogRef.current?.close()}>Cancelar</Button>
                <Button type="submit" variant="destructive" disabled={deletePending}>{deletePending ? "Excluindo..." : "Excluir permanentemente"}</Button>
              </form>
              <p role="alert" className="whitespace-pre-line text-destructive">{deleteState.message}</p>
            </div>
          </dialog>
        </div>
      ) : null}
    </div>
  );
}
