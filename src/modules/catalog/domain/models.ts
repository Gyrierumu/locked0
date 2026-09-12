export const GAME_STATUSES = ["active", "archived"] as const;
export type GameStatus = (typeof GAME_STATUSES)[number];

export const CONTENT_PACK_TYPES = ["expansion", "dlc", "update", "mode", "other"] as const;
export type ContentPackType = (typeof CONTENT_PACK_TYPES)[number];

export type CatalogRole = "author" | "editor" | "admin";

export type GameMetadataInput = Readonly<{
  name: string;
  slug: string;
  summary: string | null;
  developerName: string | null;
  publisherName: string | null;
  releaseDate: string | null;
}>;

export type CreateGameInput = GameMetadataInput &
  Readonly<{
    status: GameStatus;
  }>;

export type PlatformInput = Readonly<{
  name: string;
  shortName: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
}>;

export type GameReleaseInput = Readonly<{
  platformId: string;
  key: string;
  name: string | null;
  regionCode: string | null;
  releaseDate: string | null;
}>;

export type ContentPackInput = Readonly<{
  name: string;
  slug: string;
  type: ContentPackType;
  description: string | null;
  releaseDate: string | null;
  status: GameStatus;
}>;

