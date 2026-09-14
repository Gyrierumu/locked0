export { MediaError, type MediaErrorCode } from "./domain/errors";
export {
  MAX_IMAGE_BYTES,
  MAX_IMAGE_DIMENSION,
  MAX_IMAGE_PIXELS,
  MEDIA_ALLOWED_MIME_TYPES,
  MEDIA_PAGE_SIZE,
  type MediaMimeType,
} from "./domain/policy";
export { getMediaCapabilities } from "./domain/permissions";
export type { MediaUsage, MediaUsageKind } from "./domain/usage";

export type MediaCapabilities = Readonly<{
  canRead: boolean;
  canUpload: boolean;
  canManageMetadata: boolean;
  canManageLifecycle: boolean;
  canHardDelete: boolean;
}>;

export type MediaScopeGame = Readonly<{ id: string; name: string }>;

export type AdminMediaAsset = Readonly<{
  id: string;
  originalFilename: string;
  mimeType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  scopeGame: MediaScopeGame | null;
  sourceUrl: string | null;
  credit: string | null;
  previewUrl: string;
  firstPublishedAt: string | null;
  retiredAt: string | null;
  createdAt: string;
}>;

export type AdminMediaListQuery = Readonly<{
  q: string;
  gameId: string | null;
  status: "active" | "retired" | "all";
  page: number;
  pageSize: 24;
}>;

export type PaginatedMediaAssets = Readonly<{
  items: readonly AdminMediaAsset[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}>;

export type MediaUploadMetadata = Readonly<{
  originalFilename: string;
  declaredMimeType: string;
  declaredByteSize: number;
  scopeGameId: string | null;
  sourceUrl: string | null;
  credit: string | null;
}>;

export type MediaUploadTicket = Readonly<{
  assetId: string;
  upload: Readonly<{ bucket: string; path: string; token: string }>;
}>;

export type MediaAssetMetadataInput = Readonly<{
  scopeGameId: string | null;
  sourceUrl: string | null;
  credit: string | null;
}>;
