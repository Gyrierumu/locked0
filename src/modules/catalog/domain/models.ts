export const GAME_STATUSES = ["active", "archived"] as const;
export type GameStatus = (typeof GAME_STATUSES)[number];

export const CONTENT_PACK_TYPES = ["expansion", "dlc", "update", "mode", "other"] as const;
export type ContentPackType = (typeof CONTENT_PACK_TYPES)[number];

export const ACHIEVEMENT_SET_STATUSES = ["active", "archived"] as const;
export type AchievementSetStatus = (typeof ACHIEVEMENT_SET_STATUSES)[number];

export const ACHIEVEMENT_GROUP_TYPES = [
  "base",
  "dlc",
  "expansion",
  "update",
  "mode",
  "other",
] as const;
export type AchievementGroupType = (typeof ACHIEVEMENT_GROUP_TYPES)[number];
export const ADDITIONAL_ACHIEVEMENT_GROUP_TYPES = [
  "dlc",
  "expansion",
  "update",
  "mode",
  "other",
] as const;

export const ACHIEVEMENT_TYPES = [
  "bronze",
  "silver",
  "gold",
  "platinum",
  "standard",
] as const;
export type AchievementType = (typeof ACHIEVEMENT_TYPES)[number];

export const ACHIEVEMENT_STATUSES = ["active", "archived"] as const;
export type AchievementStatus = (typeof ACHIEVEMENT_STATUSES)[number];

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

export type AchievementSetMetadataInput = Readonly<{
  name: string;
  key: string;
  regionCode: string | null;
  status: AchievementSetStatus;
}>;

export type CreateAchievementSetInput = AchievementSetMetadataInput &
  Readonly<{
    gameId: string;
    releaseIds: readonly string[];
  }>;

export type AchievementGroupInput = Readonly<{
  name: string;
  type: AchievementGroupType;
  contentPackId: string | null;
}>;

export type AchievementMetadataInput = Readonly<{
  name: string;
  slug: string;
  description: string | null;
  achievementType: AchievementType;
  points: number | null;
  isHidden: boolean;
  status: AchievementStatus;
}>;

export type CreateAchievementInput = AchievementMetadataInput &
  Readonly<{
    achievementGroupId: string;
  }>;
