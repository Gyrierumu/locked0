import { beforeEach, describe, expect, it, vi } from "vitest";

import { routes } from "@/config/routes";

import { initialMediaActionState } from "../action-state";

const redirectSignal = new Error("NEXT_REDIRECT");
const mocks = vi.hoisted(() => ({
  createMediaUpload: vi.fn(),
  deleteUnusedMediaAsset: vi.fn(),
  finalizeMediaUpload: vi.fn(),
  redirect: vi.fn(() => {
    throw redirectSignal;
  }),
  restoreMediaAsset: vi.fn(),
  retireMediaAsset: vi.fn(),
  revalidatePath: vi.fn(),
  updateMediaAssetMetadata: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("../../server", () => ({
  createMediaUpload: mocks.createMediaUpload,
  deleteUnusedMediaAsset: mocks.deleteUnusedMediaAsset,
  finalizeMediaUpload: mocks.finalizeMediaUpload,
  restoreMediaAsset: mocks.restoreMediaAsset,
  retireMediaAsset: mocks.retireMediaAsset,
  updateMediaAssetMetadata: mocks.updateMediaAssetMetadata,
}));

import { MediaError } from "../../contracts";
import { deleteUnusedMediaAssetAction } from "./media-actions";

const assetId = "11111111-1111-4111-8111-111111111111";

describe("media hard-delete action", () => {
  beforeEach(() => vi.clearAllMocks());

  it("redirects successful deletion to the library feedback URL without invalidating the deleted detail", async () => {
    mocks.deleteUnusedMediaAsset.mockResolvedValue(undefined);

    await expect(
      deleteUnusedMediaAssetAction(assetId, initialMediaActionState),
    ).rejects.toBe(redirectSignal);

    expect(mocks.deleteUnusedMediaAsset).toHaveBeenCalledWith(assetId);
    expect(mocks.revalidatePath).toHaveBeenCalledOnce();
    expect(mocks.revalidatePath).toHaveBeenCalledWith(routes.adminMedia);
    expect(mocks.revalidatePath).not.toHaveBeenCalledWith(routes.adminMediaAsset(assetId));
    expect(mocks.redirect).toHaveBeenCalledWith(
      `${routes.adminMedia}?notice=asset-deleted`,
    );
  });

  it("keeps command failures on the detail page and does not redirect", async () => {
    mocks.deleteUnusedMediaAsset.mockRejectedValue(new MediaError("MEDIA_FORBIDDEN"));

    await expect(
      deleteUnusedMediaAssetAction(assetId, initialMediaActionState),
    ).resolves.toMatchObject({ status: "error" });

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
