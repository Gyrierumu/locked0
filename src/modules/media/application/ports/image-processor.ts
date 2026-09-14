import type { MediaMimeType } from "../../contracts";

export type ProcessedMediaImage = Readonly<{
  bytes: Uint8Array;
  mimeType: MediaMimeType;
  extension: "jpg" | "png" | "webp" | "avif";
  width: number;
  height: number;
  checksumSha256: string;
}>;

export interface MediaImageProcessor {
  process(bytes: Uint8Array): Promise<ProcessedMediaImage>;
}
