"use client";

import type { MediaScopeGame } from "../../contracts";
import type { MediaActionState } from "../action-state";
import { MediaPicker } from "./media-picker.client";

export function CatalogMediaField(props: Readonly<{
  label: string;
  contextGame?: MediaScopeGame | null;
  games: readonly MediaScopeGame[];
  currentPreviewUrl?: string | null;
  selectAction: (assetId: string) => Promise<MediaActionState>;
  clearAction: () => Promise<MediaActionState>;
}>) {
  return (
    <MediaPicker
      label={props.label}
      contextGame={props.contextGame}
      games={props.games}
      currentPreviewUrl={props.currentPreviewUrl}
      onSelect={props.selectAction}
      onClear={props.clearAction}
    />
  );
}
