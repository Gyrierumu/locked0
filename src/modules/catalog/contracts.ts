export { CatalogError, type CatalogErrorCode } from "./domain/errors";
export {
  ACHIEVEMENT_GROUP_TYPES,
  ACHIEVEMENT_SET_STATUSES,
  ACHIEVEMENT_STATUSES,
  ACHIEVEMENT_TYPES,
  ADDITIONAL_ACHIEVEMENT_GROUP_TYPES,
  CONTENT_PACK_TYPES,
  GAME_STATUSES,
  type AchievementGroupInput,
  type AchievementGroupType,
  type AchievementMetadataInput,
  type AchievementSetMetadataInput,
  type AchievementSetStatus,
  type AchievementStatus,
  type AchievementType,
  type CatalogRole,
  type ContentPackInput,
  type ContentPackType,
  type CreateAchievementInput,
  type CreateAchievementSetInput,
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

export type AdminLinkedRelease = Readonly<{
  id: string;
  name: string | null;
  key: string;
  regionCode: string | null;
  platform: Readonly<{
    id: string;
    name: string;
    shortName: string;
  }>;
}>;

export type AchievementTypeCounts = Readonly<{
  bronze: number;
  silver: number;
  gold: number;
  platinum: number;
  standard: number;
}>;

export type AdminAchievementSetListItem = Readonly<{
  id: string;
  gameId: string;
  name: string;
  key: string;
  regionCode: string | null;
  status: import("./domain/models").AchievementSetStatus;
  linkedReleases: readonly AdminLinkedRelease[];
  achievementCount: number;
  typeCounts: AchievementTypeCounts;
}>;

export type AdminAchievementGroup = Readonly<{
  id: string;
  achievementSetId: string;
  name: string;
  type: import("./domain/models").AchievementGroupType;
  position: number;
  contentPack: Readonly<{
    id: string;
    name: string;
    status: import("./domain/models").GameStatus;
  }> | null;
  achievementCount: number;
}>;

export type AdminAchievementSetWorkspace = AdminAchievementSetListItem &
  Readonly<{
    groups: readonly AdminAchievementGroup[];
    hiddenCount: number;
    pointsTotal: number;
  }>;

export type AdminAchievement = Readonly<{
  id: string;
  achievementGroupId: string;
  groupName: string;
  groupPosition: number;
  name: string;
  slug: string;
  description: string | null;
  achievementType: import("./domain/models").AchievementType;
  points: number | null;
  isHidden: boolean;
  iconPath: string | null;
  position: number;
  status: import("./domain/models").AchievementStatus;
}>;

export type AdminAchievementListQuery = Readonly<{
  q: string;
  groupId: string | null;
  type: "all" | import("./domain/models").AchievementType;
  status: "all" | import("./domain/models").AchievementStatus;
  hidden: "all" | "hidden" | "visible";
  page: number;
  pageSize: 100;
}>;

export type AchievementPasteRow = Readonly<{
  rowNumber: number;
  name: string;
  slug: string;
  achievementType: import("./domain/models").AchievementType | null;
  isHidden: boolean | null;
  points: number | null;
  groupId: string | null;
  groupName: string | null;
  errors: readonly string[];
}>;

export type AchievementPastePreview = Readonly<{
  detectedCount: number;
  validCount: number;
  invalidCount: number;
  rows: readonly AchievementPasteRow[];
  canApply: boolean;
}>;
