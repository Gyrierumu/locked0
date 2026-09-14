import type { MediaMimeType } from "../../contracts";

export type MediaStorageFailureKind = "missing" | "conflict" | "provider";

export class MediaStoragePortError extends Error {
  readonly kind: MediaStorageFailureKind;

  constructor(kind: MediaStorageFailureKind) {
    super(`Media storage failure: ${kind}`);
    this.name = "MediaStoragePortError";
    this.kind = kind;
  }
}

export interface MediaStoragePort {
  createSignedStagingUpload(path: string): Promise<Readonly<{ bucket: string; path: string; token: string }>>;
  getStagingObjectMetadata(path: string): Promise<Readonly<{ byteSize: number; contentType: string | null }>>;
  downloadStagingObject(path: string): Promise<Uint8Array>;
  writeFinalObject(path: string, bytes: Uint8Array, mimeType: MediaMimeType): Promise<void>;
  deleteStagingObject(path: string): Promise<void>;
  deleteFinalObject(path: string): Promise<void>;
  resolvePublicUrl(path: string): string;
}
