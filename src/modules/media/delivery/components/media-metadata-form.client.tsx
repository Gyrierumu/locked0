"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

import type { AdminMediaAsset, MediaScopeGame } from "../../contracts";
import { initialMediaActionState } from "../action-state";
import { updateMediaAssetMetadataAction } from "../actions/media-actions";

export function MediaMetadataForm({ asset, games }: Readonly<{
  asset: AdminMediaAsset;
  games: readonly MediaScopeGame[];
}>) {
  const [state, action, pending] = useActionState(
    updateMediaAssetMetadataAction.bind(null, asset.id),
    initialMediaActionState,
  );
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="asset-scope-game" className="text-sm font-medium">Jogo relacionado</label>
        <Select id="asset-scope-game" name="scopeGameId" defaultValue={asset.scopeGame?.id ?? ""} disabled={pending} className="mt-2">
          <option value="">Asset global</option>
          {games.map((game) => <option key={game.id} value={game.id}>{game.name}</option>)}
        </Select>
      </div>
      <div>
        <label htmlFor="asset-source-url" className="text-sm font-medium">Source URL</label>
        <Input id="asset-source-url" name="sourceUrl" type="url" defaultValue={asset.sourceUrl ?? ""} disabled={pending} className="mt-2" />
      </div>
      <div>
        <label htmlFor="asset-credit" className="text-sm font-medium">Credito</label>
        <Input id="asset-credit" name="credit" maxLength={500} defaultValue={asset.credit ?? ""} disabled={pending} className="mt-2" />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Salvando..." : "Salvar metadata"}</Button>
        <p aria-live="polite" className="text-sm text-muted-foreground">{state.message}</p>
      </div>
    </form>
  );
}
