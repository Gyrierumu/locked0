import type {
  AdminContentPack,
  AdminGame,
  AdminGameContext,
  AdminGameListItem,
  AdminGameListQuery,
  AdminGameRelease,
  AdminPlatform,
  ContentPackInput,
  CreateGameInput,
  GameMetadataInput,
  GameReleaseInput,
  GameStatus,
  PaginatedResult,
  PlatformInput,
} from "../../contracts";

export interface CatalogRepository {
  listGames(query: AdminGameListQuery): Promise<PaginatedResult<AdminGameListItem>>;
  findGame(id: string): Promise<AdminGame | null>;
  findGameContext(id: string): Promise<AdminGameContext | null>;
  createGame(input: CreateGameInput): Promise<{ id: string }>;
  updateGame(id: string, input: GameMetadataInput): Promise<void>;
  setGameStatus(id: string, status: GameStatus): Promise<void>;

  listPlatforms(options?: Readonly<{ activeOnly?: boolean }>): Promise<readonly AdminPlatform[]>;
  findPlatform(id: string): Promise<AdminPlatform | null>;
  createPlatform(input: PlatformInput): Promise<{ id: string }>;
  updatePlatform(id: string, input: PlatformInput): Promise<void>;
  setPlatformActive(id: string, isActive: boolean): Promise<void>;

  listGameReleases(gameId: string): Promise<readonly AdminGameRelease[]>;
  findGameRelease(gameId: string, releaseId: string): Promise<AdminGameRelease | null>;
  createGameRelease(gameId: string, input: GameReleaseInput): Promise<{ id: string }>;
  updateGameRelease(
    gameId: string,
    releaseId: string,
    input: GameReleaseInput,
  ): Promise<void>;

  listGameContentPacks(gameId: string): Promise<readonly AdminContentPack[]>;
  findContentPack(gameId: string, contentPackId: string): Promise<AdminContentPack | null>;
  createContentPack(gameId: string, input: ContentPackInput): Promise<{ id: string }>;
  updateContentPack(
    gameId: string,
    contentPackId: string,
    input: ContentPackInput,
  ): Promise<void>;
  setContentPackStatus(
    gameId: string,
    contentPackId: string,
    status: GameStatus,
  ): Promise<void>;
}

