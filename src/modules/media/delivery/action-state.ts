import type { MediaUploadTicket } from "../contracts";

export type MediaActionState = Readonly<{
  status: "idle" | "success" | "error";
  message: string | null;
  fieldErrors?: Readonly<Record<string, readonly string[]>>;
}>;

export const initialMediaActionState: MediaActionState = { status: "idle", message: null };

export type MediaUploadActionResult =
  | Readonly<{ ok: true; ticket: MediaUploadTicket }>
  | Readonly<{ ok: false; message: string }>;

export type MediaFinalizeActionResult =
  | Readonly<{ ok: true; assetId: string }>
  | Readonly<{ ok: false; message: string }>;
