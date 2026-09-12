import { describe, expect, it, vi } from "vitest";

import type { AchievementRepository } from "../ports/achievement-repository";
import {
  getAchievementSetWorkspace,
  listAchievements,
  listGameAchievementSets,
} from "./achievement-queries";

const set = {
  id: "set-1",
  gameId: "game-1",
  name: "PS5",
  key: "ps5",
  regionCode: null,
  status: "active" as const,
  linkedReleases: [],
  achievementCount: 2,
  typeCounts: { bronze: 1, silver: 0, gold: 0, platinum: 1, standard: 0 },
};

function repository(): AchievementRepository {
  return {
    transaction: vi.fn(),
    findGameState: vi.fn(),
    countGameReleases: vi.fn(),
    findContentPackState: vi.fn(),
    listAchievementSets: vi.fn().mockResolvedValue([set]),
    findAchievementSet: vi.fn().mockResolvedValue(set),
    getAchievementSummary: vi.fn().mockResolvedValue({ hiddenCount: 1, pointsTotal: 50 }),
    createAchievementSet: vi.fn(),
    updateAchievementSet: vi.fn(),
    replaceAchievementSetReleases: vi.fn(),
    listAchievementGroups: vi.fn().mockResolvedValue([]),
    findAchievementGroup: vi.fn(),
    createAchievementGroup: vi.fn(),
    updateAchievementGroup: vi.fn(),
    setAchievementGroupPosition: vi.fn(),
    listAchievements: vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 100, total: 0, totalPages: 1 }),
    listGroupAchievements: vi.fn(),
    findAchievement: vi.fn(),
    createAchievement: vi.fn(),
    createAchievements: vi.fn(),
    updateAchievement: vi.fn(),
    moveAchievementToGroup: vi.fn(),
    setAchievementPosition: vi.fn(),
    setAchievementStatus: vi.fn(),
    listAchievementSlugs: vi.fn(),
  };
}

describe("achievement queries", () => {
  it("allows author reads and rejects users below author", async () => {
    const repo = repository();
    await expect(listGameAchievementSets({ roles: ["author"], repository: repo }, "game-1")).resolves.toEqual([set]);
    expect(() => listGameAchievementSets({ roles: [], repository: repo }, "game-1")).toThrowError(expect.objectContaining({ code: "forbidden" }));
  });

  it("builds workspace counts from derived queries", async () => {
    const repo = repository();
    await expect(getAchievementSetWorkspace({ roles: ["author"], repository: repo }, "game-1", "set-1")).resolves.toMatchObject({
      achievementCount: 2,
      hiddenCount: 1,
      pointsTotal: 50,
      groups: [],
    });
  });

  it("scopes the set by game before forwarding search and filters", async () => {
    const repo = repository();
    const query = { q: "elden", groupId: "group-1", type: "gold" as const, status: "active" as const, hidden: "hidden" as const, page: 2, pageSize: 100 as const };
    await listAchievements({ roles: ["author"], repository: repo }, "game-1", "set-1", query);
    expect(repo.findAchievementSet).toHaveBeenCalledWith("game-1", "set-1");
    expect(repo.listAchievements).toHaveBeenCalledWith("set-1", query);
  });

  it("returns null instead of opening a set through a cross-game URL", async () => {
    const repo = repository();
    vi.mocked(repo.findAchievementSet).mockResolvedValue(null);
    await expect(getAchievementSetWorkspace({ roles: ["author"], repository: repo }, "game-a", "set-b")).resolves.toBeNull();
  });
});
