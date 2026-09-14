import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  clearAchievementIcon: vi.fn(),
  getSelectableMediaAsset: vi.fn(),
  refresh: vi.fn(),
  revalidatePath: vi.fn(),
  setAchievementIcon: vi.fn(),
}));

vi.mock("next/cache", () => ({ refresh: mocks.refresh, revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/modules/media/server", () => ({ getSelectableMediaAsset: mocks.getSelectableMediaAsset }));
vi.mock("../../server", () => ({
  clearAchievementIcon: mocks.clearAchievementIcon,
  setAchievementIcon: mocks.setAchievementIcon,
}));

import {
  clearAchievementIconAction,
  setAchievementIconAction,
} from "./achievement-actions";

const gameId = "11111111-1111-4111-8111-111111111111";
const setId = "22222222-2222-4222-8222-222222222222";
const achievementId = "33333333-3333-4333-8333-333333333333";
const assetId = "44444444-4444-4444-8444-444444444444";

describe("achievement media actions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("resolves the trusted path on the server and supports clear without deleting the asset", async () => {
    mocks.getSelectableMediaAsset.mockResolvedValue({ id: assetId, storagePath: "editorial/trusted/asset.webp" });
    await expect(setAchievementIconAction(gameId, setId, achievementId, assetId)).resolves.toMatchObject({ status: "success" });
    expect(mocks.setAchievementIcon).toHaveBeenCalledWith(gameId, setId, achievementId, "editorial/trusted/asset.webp");
    await expect(clearAchievementIconAction(gameId, setId, achievementId)).resolves.toMatchObject({ status: "success" });
    expect(mocks.clearAchievementIcon).toHaveBeenCalledWith(gameId, setId, achievementId);
  });
});
