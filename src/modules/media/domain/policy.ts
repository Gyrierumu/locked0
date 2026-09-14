export const MEDIA_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export type MediaMimeType = (typeof MEDIA_ALLOWED_MIME_TYPES)[number];

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGE_DIMENSION = 12_000;
export const MAX_IMAGE_PIXELS = 60_000_000;
export const MEDIA_PAGE_SIZE = 24;

export function isAllowedMediaMimeType(value: string): value is MediaMimeType {
  return MEDIA_ALLOWED_MIME_TYPES.some((mimeType) => mimeType === value);
}

export function stagingPathFor(userId: string, assetId: string): string {
  return `uploads/${userId}/${assetId}/source`;
}

export function finalPathFor(assetId: string, extension: string): string {
  return `editorial/${assetId}/asset.${extension}`;
}
