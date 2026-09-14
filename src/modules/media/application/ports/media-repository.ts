import type {
  AdminMediaListQuery,
  MediaAssetMetadataInput,
  MediaMimeType,
  MediaScopeGame,
  MediaUsage,
} from "../../contracts";

export type MediaAssetRecord = Readonly<{
  id: string;
  scopeGame: MediaScopeGame | null;
  storagePath: string;
  originalFilename: string;
  mimeType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  checksumSha256: string | null;
  sourceUrl: string | null;
  credit: string | null;
  createdBy: string | null;
  firstPublishedAt: Date | null;
  retiredAt: Date | null;
  createdAt: Date;
}>;

export type InsertMediaAsset = Readonly<{
  id: string;
  scopeGameId: string | null;
  storagePath: string;
  originalFilename: string;
  mimeType: MediaMimeType;
  byteSize: number;
  width: number;
  height: number;
  checksumSha256: string;
  sourceUrl: string | null;
  credit: string | null;
  createdBy: string;
}>;

export interface MediaRepository {
  listAssets(query: AdminMediaListQuery): Promise<Readonly<{
    items: readonly MediaAssetRecord[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  }>>;
  findAsset(id: string): Promise<MediaAssetRecord | null>;
  findAssetByStoragePath(path: string): Promise<MediaAssetRecord | null>;
  insertAsset(input: InsertMediaAsset): Promise<void>;
  updateMetadata(id: string, input: MediaAssetMetadataInput): Promise<void>;
  setRetiredAt(id: string, value: Date | null): Promise<void>;
  deleteAsset(id: string): Promise<boolean>;
  markFirstPublished(assetIds: readonly string[], publishedAt: Date): Promise<void>;
  listUsage(assetId: string, storagePath: string): Promise<readonly MediaUsage[]>;
  listScopeGames(): Promise<readonly MediaScopeGame[]>;
  gameExists(gameId: string): Promise<boolean>;
}
