import type {
  AdminAchievement,
  AdminAchievementGroup,
  AdminAchievementListQuery,
  AdminAchievementSetListItem,
  AchievementGroupInput,
  AchievementMetadataInput,
  AchievementSetMetadataInput,
  GameStatus,
  PaginatedResult,
} from "../../contracts";

export type AchievementInsert = AchievementMetadataInput &
  Readonly<{
    achievementGroupId: string;
    position: number;
  }>;

export interface AchievementRepository {
  transaction<T>(operation: (repository: AchievementRepository) => Promise<T>): Promise<T>;

  findGameState(gameId: string): Promise<Readonly<{ id: string; status: GameStatus }> | null>;
  countGameReleases(gameId: string, releaseIds: readonly string[]): Promise<number>;
  findContentPackState(
    contentPackId: string,
  ): Promise<Readonly<{ id: string; gameId: string; status: GameStatus }> | null>;

  listAchievementSets(gameId: string): Promise<readonly AdminAchievementSetListItem[]>;
  findAchievementSet(
    gameId: string,
    achievementSetId: string,
  ): Promise<AdminAchievementSetListItem | null>;
  getAchievementSummary(
    achievementSetId: string,
  ): Promise<Readonly<{ hiddenCount: number; pointsTotal: number }>>;
  createAchievementSet(
    gameId: string,
    input: AchievementSetMetadataInput,
  ): Promise<Readonly<{ id: string }>>;
  updateAchievementSet(
    gameId: string,
    achievementSetId: string,
    input: AchievementSetMetadataInput,
  ): Promise<void>;
  replaceAchievementSetReleases(
    achievementSetId: string,
    releaseIds: readonly string[],
  ): Promise<void>;

  listAchievementGroups(achievementSetId: string): Promise<readonly AdminAchievementGroup[]>;
  findAchievementGroup(
    achievementSetId: string,
    groupId: string,
  ): Promise<AdminAchievementGroup | null>;
  createAchievementGroup(
    achievementSetId: string,
    input: AchievementGroupInput,
    position: number,
  ): Promise<Readonly<{ id: string }>>;
  updateAchievementGroup(
    achievementSetId: string,
    groupId: string,
    input: AchievementGroupInput,
  ): Promise<void>;
  setAchievementGroupPosition(groupId: string, position: number): Promise<void>;

  listAchievements(
    achievementSetId: string,
    query: AdminAchievementListQuery,
  ): Promise<PaginatedResult<AdminAchievement>>;
  listGroupAchievements(groupId: string): Promise<readonly AdminAchievement[]>;
  findAchievement(
    achievementSetId: string,
    achievementId: string,
  ): Promise<AdminAchievement | null>;
  createAchievement(input: AchievementInsert): Promise<Readonly<{ id: string }>>;
  createAchievements(inputs: readonly AchievementInsert[]): Promise<void>;
  updateAchievement(
    achievementSetId: string,
    achievementId: string,
    input: AchievementMetadataInput,
  ): Promise<void>;
  moveAchievementToGroup(
    achievementId: string,
    achievementGroupId: string,
    position: number,
  ): Promise<void>;
  setAchievementPosition(achievementId: string, position: number): Promise<void>;
  setAchievementStatus(
    achievementSetId: string,
    achievementId: string,
    status: "active" | "archived",
  ): Promise<void>;
  setAchievementIconPath(
    achievementSetId: string,
    achievementId: string,
    storagePath: string | null,
  ): Promise<void>;
  listAchievementSlugs(
    groupIds: readonly string[],
  ): Promise<readonly Readonly<{ groupId: string; slug: string }>[] >;
}
