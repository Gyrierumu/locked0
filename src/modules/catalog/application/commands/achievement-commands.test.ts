import { describe, expect, it, vi } from "vitest";

import type {
  AdminAchievement,
  AdminAchievementGroup,
  AdminAchievementSetListItem,
  CreateAchievementInput,
} from "../../contracts";
import type { AchievementRepository } from "../ports/achievement-repository";
import {
  applyAchievementPaste,
  archiveAchievement,
  clearAchievementIcon,
  createAchievement,
  createAchievementGroup,
  createAchievementSet,
  moveAchievement,
  previewAchievementPaste,
  reorderAchievementGroups,
  restoreAchievement,
  setAchievementIcon,
  replaceAchievementSetReleases,
  updateAchievementSet,
  updateAchievement,
} from "./achievement-commands";

const gameId = "game-1";
const setId = "set-1";
const releaseId = "release-1";
const baseGroupId = "group-base";
const dlcGroupId = "group-dlc";

const baseSet: AdminAchievementSetListItem = {
  id: setId,
  gameId,
  name: "Elden Ring — PS5",
  key: "ps5-global",
  regionCode: null,
  status: "active",
  linkedReleases: [],
  achievementCount: 0,
  typeCounts: { bronze: 0, silver: 0, gold: 0, platinum: 0, standard: 0 },
};

const baseGroup: AdminAchievementGroup = {
  id: baseGroupId,
  achievementSetId: setId,
  name: "Base Game",
  type: "base",
  position: 0,
  contentPack: null,
  achievementCount: 0,
};

const dlcGroup: AdminAchievementGroup = {
  ...baseGroup,
  id: dlcGroupId,
  name: "Expansion",
  type: "expansion",
  position: 1,
};

function achievement(overrides: Partial<AdminAchievement> = {}): AdminAchievement {
  return {
    id: "achievement-1",
    achievementGroupId: baseGroupId,
    groupName: "Base Game",
    groupPosition: 0,
    name: "Elden Ring",
    slug: "elden-ring",
    description: null,
    achievementType: "platinum",
    points: null,
    isHidden: false,
    iconPath: null,
    position: 0,
    status: "active",
    ...overrides,
  };
}

function repository(overrides: Partial<AchievementRepository> = {}): AchievementRepository {
  const result: AchievementRepository = {
    transaction: vi.fn((operation) => operation(result)),
    findGameState: vi.fn().mockResolvedValue({ id: gameId, status: "active" }),
    countGameReleases: vi.fn().mockResolvedValue(1),
    findContentPackState: vi.fn().mockResolvedValue({ id: "pack-1", gameId, status: "active" }),
    listAchievementSets: vi.fn().mockResolvedValue([baseSet]),
    findAchievementSet: vi.fn().mockResolvedValue(baseSet),
    getAchievementSummary: vi.fn().mockResolvedValue({ hiddenCount: 0, pointsTotal: 0 }),
    createAchievementSet: vi.fn().mockResolvedValue({ id: setId }),
    updateAchievementSet: vi.fn(),
    replaceAchievementSetReleases: vi.fn(),
    listAchievementGroups: vi.fn().mockResolvedValue([baseGroup, dlcGroup]),
    findAchievementGroup: vi.fn(async (_setId, groupId) =>
      [baseGroup, dlcGroup].find((group) => group.id === groupId) ?? null,
    ),
    createAchievementGroup: vi.fn().mockResolvedValue({ id: "group-new" }),
    updateAchievementGroup: vi.fn(),
    setAchievementGroupPosition: vi.fn(),
    listAchievements: vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 100, total: 0, totalPages: 1 }),
    listGroupAchievements: vi.fn().mockResolvedValue([]),
    findAchievement: vi.fn().mockResolvedValue(achievement()),
    createAchievement: vi.fn().mockResolvedValue({ id: "achievement-new" }),
    createAchievements: vi.fn(),
    updateAchievement: vi.fn(),
    moveAchievementToGroup: vi.fn(),
    setAchievementPosition: vi.fn(),
    setAchievementStatus: vi.fn(),
    setAchievementIconPath: vi.fn(),
    listAchievementSlugs: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
  return result;
}

const setInput = {
  gameId,
  name: " Elden Ring — PS5 ",
  key: "ps5-global",
  regionCode: " ",
  status: "active" as const,
  releaseIds: [releaseId, releaseId],
};

const achievementInput: CreateAchievementInput = {
  achievementGroupId: baseGroupId,
  name: " Elden Ring ",
  slug: "elden-ring",
  description: " ",
  achievementType: "platinum",
  points: null,
  isHidden: false,
  status: "active",
};

describe("achievement commands", () => {
  it("creates a set, one Base Group and its deduplicated release links in one transaction", async () => {
    const repo = repository();
    await expect(createAchievementSet({ roles: ["editor"], repository: repo }, setInput)).resolves.toEqual({ id: setId });
    expect(repo.transaction).toHaveBeenCalledOnce();
    expect(repo.createAchievementSet).toHaveBeenCalledWith(gameId, expect.objectContaining({ name: "Elden Ring — PS5", regionCode: null }));
    expect(repo.createAchievementGroup).toHaveBeenCalledWith(
      setId,
      { name: "Base Game", type: "base", contentPackId: null },
      0,
    );
    expect(repo.replaceAchievementSetReleases).toHaveBeenCalledWith(setId, [releaseId]);
  });

  it("does not create a Base Group or links when set creation fails", async () => {
    const repo = repository({ createAchievementSet: vi.fn().mockRejectedValue(new Error("insert failed")) });
    await expect(createAchievementSet({ roles: ["editor"], repository: repo }, setInput)).rejects.toThrow("insert failed");
    expect(repo.createAchievementGroup).not.toHaveBeenCalled();
    expect(repo.replaceAchievementSetReleases).not.toHaveBeenCalled();
  });

  it("rejects releases outside the game before opening the transaction", async () => {
    const repo = repository({ countGameReleases: vi.fn().mockResolvedValue(0) });
    await expect(createAchievementSet({ roles: ["editor"], repository: repo }, setInput)).rejects.toMatchObject({ code: "cross_game_release" });
    expect(repo.transaction).toHaveBeenCalledOnce();
  });

  it("keeps authors read-only while editors and admins can mutate", async () => {
    const authorRepo = repository();
    await expect(createAchievementSet({ roles: ["author"], repository: authorRepo }, setInput)).rejects.toMatchObject({ code: "forbidden" });
    await expect(createAchievementSet({ roles: ["editor"], repository: repository() }, setInput)).resolves.toEqual({ id: setId });
    await expect(createAchievementSet({ roles: ["admin"], repository: repository() }, setInput)).resolves.toEqual({ id: setId });
  });

  it("updates Set metadata and replaces multiple linked releases without changing identity", async () => {
    const repo = repository({ countGameReleases: vi.fn().mockResolvedValue(2) });
    await updateAchievementSet(
      { roles: ["editor"], repository: repo }, gameId, setId,
      { name: " Updated ", key: "ps5-global", regionCode: " BR ", status: "archived" },
    );
    await replaceAchievementSetReleases(
      { roles: ["admin"], repository: repo }, gameId, setId, ["release-1", "release-2"],
    );
    expect(repo.updateAchievementSet).toHaveBeenCalledWith(gameId, setId, {
      name: "Updated", key: "ps5-global", regionCode: "BR", status: "archived",
    });
    expect(repo.replaceAchievementSetReleases).toHaveBeenCalledWith(setId, ["release-1", "release-2"]);
  });

  it("rejects a second Base Group and a cross-game Content Pack", async () => {
    const repo = repository();
    await expect(createAchievementGroup(
      { roles: ["editor"], repository: repo }, gameId, setId,
      { name: "Base 2", type: "base", contentPackId: null },
    )).rejects.toMatchObject({ code: "duplicate_base_group" });
    await expect(createAchievementGroup(
      { roles: ["editor"], repository: repo }, gameId, setId,
      { name: "Invalid Base", type: "base", contentPackId: "pack-1" },
    )).rejects.toMatchObject({ code: "base_group_content_pack" });

    const crossGame = repository({
      findContentPackState: vi.fn().mockResolvedValue({ id: "pack-2", gameId: "game-2", status: "active" }),
    });
    await expect(createAchievementGroup(
      { roles: ["editor"], repository: crossGame }, gameId, setId,
      { name: "DLC", type: "dlc", contentPackId: "pack-2" },
    )).rejects.toMatchObject({ code: "cross_game_content_pack" });
  });

  it("creates additional Groups at the end and reorders the complete set transactionally", async () => {
    const repo = repository();
    await createAchievementGroup(
      { roles: ["editor"], repository: repo }, gameId, setId,
      { name: "DLC", type: "dlc", contentPackId: null },
    );
    expect(repo.createAchievementGroup).toHaveBeenCalledWith(setId, expect.objectContaining({ type: "dlc" }), 2);

    await reorderAchievementGroups(
      { roles: ["editor"], repository: repo }, gameId, setId, [dlcGroupId, baseGroupId],
    );
    expect(repo.setAchievementGroupPosition).toHaveBeenNthCalledWith(3, dlcGroupId, 0);
    expect(repo.setAchievementGroupPosition).toHaveBeenNthCalledWith(4, baseGroupId, 1);
  });

  it("rejects missing or extra group IDs in reorder", async () => {
    const repo = repository();
    await expect(reorderAchievementGroups(
      { roles: ["editor"], repository: repo }, gameId, setId, [baseGroupId],
    )).rejects.toMatchObject({ code: "invalid_group_order" });
  });

  it("appends a new achievement inside its selected Group", async () => {
    const repo = repository({ listGroupAchievements: vi.fn().mockResolvedValue([achievement({ position: 4 })]) });
    await createAchievement({ roles: ["editor"], repository: repo }, gameId, setId, achievementInput);
    expect(repo.createAchievement).toHaveBeenCalledWith(expect.objectContaining({ name: "Elden Ring", description: null, position: 5 }));
  });

  it("edits metadata and moves Groups atomically while preserving the Achievement ID", async () => {
    const existing = achievement({ id: "stable-id" });
    const repo = repository({
      findAchievement: vi.fn().mockResolvedValue(existing),
      listGroupAchievements: vi.fn(async (groupId) => groupId === baseGroupId ? [existing] : []),
    });
    await updateAchievement(
      { roles: ["editor"], repository: repo }, gameId, setId, existing.id,
      { ...achievementInput, achievementGroupId: dlcGroupId, name: " Updated ", description: " Details " },
    );
    expect(repo.transaction).toHaveBeenCalledOnce();
    expect(repo.updateAchievement).toHaveBeenCalledWith(setId, existing.id, expect.objectContaining({ name: "Updated", description: "Details" }));
    expect(repo.moveAchievementToGroup).toHaveBeenCalledWith(existing.id, dlcGroupId, 0);
    expect(repo.createAchievement).not.toHaveBeenCalled();
  });

  it("moves an achievement without changing identity and compacts its source Group", async () => {
    const moved = achievement({ id: "move-me", position: 0 });
    const survivor = achievement({ id: "survivor", slug: "survivor", position: 1 });
    const repo = repository({
      findAchievement: vi.fn().mockResolvedValue(moved),
      listGroupAchievements: vi.fn(async (groupId) => groupId === baseGroupId ? [moved, survivor] : [achievement({ id: "dlc-one", achievementGroupId: dlcGroupId, position: 0 })]),
    });
    await moveAchievement({ roles: ["editor"], repository: repo }, gameId, setId, moved.id, dlcGroupId);
    expect(repo.moveAchievementToGroup).toHaveBeenCalledWith(moved.id, dlcGroupId, 1);
    expect(repo.setAchievementPosition).toHaveBeenCalledWith(survivor.id, 0);
    expect(repo.createAchievement).not.toHaveBeenCalled();
  });

  it("rejects moving an achievement to a Group outside the Set", async () => {
    const repo = repository({ findAchievementGroup: vi.fn().mockResolvedValue(null) });
    await expect(moveAchievement(
      { roles: ["editor"], repository: repo }, gameId, setId, "achievement-1", "foreign-group",
    )).rejects.toMatchObject({ code: "group_not_in_set" });
    expect(repo.moveAchievementToGroup).not.toHaveBeenCalled();
  });

  it("archives and restores the same achievement row", async () => {
    const repo = repository();
    const context = { roles: ["editor"] as const, repository: repo };
    await archiveAchievement(context, gameId, setId, "achievement-1");
    await restoreAchievement(context, gameId, setId, "achievement-1");
    expect(repo.setAchievementStatus).toHaveBeenNthCalledWith(1, setId, "achievement-1", "archived");
    expect(repo.setAchievementStatus).toHaveBeenNthCalledWith(2, setId, "achievement-1", "active");
  });

  it("assigns and clears Achievement icons for editor+", async () => {
    const repo = repository();
    const context = { roles: ["editor"] as const, repository: repo };
    await setAchievementIcon(context, gameId, setId, "achievement-1", "editorial/icon/asset.png");
    await clearAchievementIcon(context, gameId, setId, "achievement-1");
    expect(repo.setAchievementIconPath).toHaveBeenNthCalledWith(1, setId, "achievement-1", "editorial/icon/asset.png");
    expect(repo.setAchievementIconPath).toHaveBeenNthCalledWith(2, setId, "achievement-1", null);
  });
});

describe("structured achievement paste", () => {
  const input = {
    gameId,
    achievementSetId: setId,
    targetGroupId: baseGroupId,
    text: "name\ttype\thidden\tpoints\nElden Ring\tplatina\tnão\t\nElden Lord\touro\tyes\t50",
  };

  it("parses an optional TSV header, aliases, booleans and generated slugs without writing", async () => {
    const repo = repository();
    const preview = await previewAchievementPaste({ roles: ["editor"], repository: repo }, input);
    expect(preview).toMatchObject({ detectedCount: 2, validCount: 2, invalidCount: 0, canApply: true });
    expect(preview.rows[0]).toMatchObject({ slug: "elden-ring", achievementType: "platinum", isHidden: false, points: null });
    expect(preview.rows[1]).toMatchObject({ achievementType: "gold", isHidden: true, points: 50 });
    expect(repo.createAchievements).not.toHaveBeenCalled();
  });

  it("reports invalid types, invalid booleans, duplicate pasted slugs and existing conflicts", async () => {
    const repo = repository({ listAchievementSlugs: vi.fn().mockResolvedValue([{ groupId: baseGroupId, slug: "existing" }]) });
    const preview = await previewAchievementPaste(
      { roles: ["editor"], repository: repo },
      { ...input, text: "name\ttype\thidden\tslug\nOne\tdiamond\tmaybe\tsame\nTwo\tgold\tfalse\tsame\nExisting\tgold\tfalse\texisting" },
    );
    expect(preview.canApply).toBe(false);
    expect(preview.rows[0]?.errors).toEqual(expect.arrayContaining(["Tipo inválido.", "Valor de oculto inválido."]));
    expect(preview.rows[1]?.errors).toContain("Slug duplicado nesta colagem.");
    expect(preview.rows[2]?.errors).toContain("Slug já existe no grupo selecionado.");
  });

  it("rejects payloads over 500 rows", async () => {
    const text = Array.from({ length: 501 }, (_, index) => `Achievement ${index}\tstandard\tfalse`).join("\n");
    await expect(previewAchievementPaste(
      { roles: ["editor"], repository: repository() },
      { ...input, text },
    )).rejects.toMatchObject({ code: "paste_too_large" });
  });

  it.each(["editor", "admin"] as const)(
    "allows %s to revalidate and bulk apply valid rows atomically",
    async (role) => {
      const repo = repository({ listGroupAchievements: vi.fn().mockResolvedValue([achievement({ position: 3 })]) });
      await expect(applyAchievementPaste({ roles: [role], repository: repo }, input)).resolves.toEqual({ createdCount: 2 });
      expect(repo.transaction).toHaveBeenCalledOnce();
      expect(repo.createAchievements).toHaveBeenCalledWith([
        expect.objectContaining({ slug: "elden-ring", position: 4 }),
        expect.objectContaining({ slug: "elden-lord", position: 5 }),
      ]);
    },
  );

  it("rejects authors before opening the Apply transaction", async () => {
    const repo = repository();

    await expect(
      applyAchievementPaste({ roles: ["author"], repository: repo }, input),
    ).rejects.toMatchObject({ code: "forbidden" });
    expect(repo.transaction).not.toHaveBeenCalled();
    expect(repo.createAchievements).not.toHaveBeenCalled();
  });

  it("does not insert any row when revalidation finds an invalid row", async () => {
    const repo = repository();
    await expect(applyAchievementPaste(
      { roles: ["editor"], repository: repo },
      { ...input, text: "Broken\tdiamond\tfalse" },
    )).rejects.toMatchObject({ code: "paste_invalid" });
    expect(repo.createAchievements).not.toHaveBeenCalled();
  });
});
