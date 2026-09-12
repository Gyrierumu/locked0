export { CatalogError, type CatalogErrorCode } from "./domain/errors";
export {
  CONTENT_PACK_TYPES,
  GAME_STATUSES,
  type CatalogRole,
  type ContentPackInput,
  type ContentPackType,
  type CreateGameInput,
  type GameMetadataInput,
  type GameReleaseInput,
  type GameStatus,
  type PlatformInput,
} from "./domain/models";
export { getCatalogCapabilities, type CatalogCapabilities } from "./domain/permissions";

export type AdminGameListItem = Readonly<{
  id: string;
  name: string;
  slug: string;
  developerName: string | null;
  publisherName: string | null;
  releaseDate: string | null;
  coverPath: string | null;
  status: import("./domain/models").GameStatus;
  releaseCount: number;
  contentPackCount: number;
}>;

export type AdminGame = AdminGameListItem &
  Readonly<{
    summary: string | null;
    heroPath: string | null;
  }>;

export type AdminGameContext = Readonly<{
  id: string;
  name: string;
  status: import("./domain/models").GameStatus;
  releaseCount: number;
  contentPackCount: number;
}>;

export type AdminPlatform = Readonly<{
  id: string;
  name: string;
  shortName: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
}>;

export type AdminGameRelease = Readonly<{
  id: string;
  gameId: string;
  platform: Readonly<{
    id: string;
    name: string;
    shortName: string;
    isActive: boolean;
  }>;
  key: string;
  name: string | null;
  regionCode: string | null;
  releaseDate: string | null;
}>;

export type AdminContentPack = Readonly<{
  id: string;
  gameId: string;
  name: string;
  slug: string;
  type: import("./domain/models").ContentPackType;
  description: string | null;
  releaseDate: string | null;
  status: import("./domain/models").GameStatus;
}>;

export type AdminGameListQuery = Readonly<{
  q: string;
  status: "all" | import("./domain/models").GameStatus;
  page: number;
  pageSize: number;
}>;

export type PaginatedResult<T> = Readonly<{
  items: readonly T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}>;

