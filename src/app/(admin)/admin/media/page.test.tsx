import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type {
  AdminMediaListQuery,
  MediaCapabilities,
  PaginatedMediaAssets,
} from "@/modules/media/contracts";

const mocks = vi.hoisted(() => ({
  getCurrentMediaCapabilities: vi.fn(),
  listAdminMediaAssets: vi.fn(),
  listMediaScopeGames: vi.fn(),
  parseAdminMediaListQuery: vi.fn(),
}));

vi.mock("@/modules/media/server", () => mocks);

vi.mock("@/modules/media/ui", () => ({
  MediaLibrary: ({ assets }: { assets: PaginatedMediaAssets }) => (
    <div>{assets.items.length === 0 ? "EMPTY_MEDIA_LIBRARY" : "MEDIA_LIBRARY"}</div>
  ),
}));

import MediaPage from "./page";

const emptyAssets: PaginatedMediaAssets = {
  items: [],
  page: 1,
  pageSize: 24,
  total: 0,
  totalPages: 1,
};

const query: AdminMediaListQuery = {
  q: "",
  gameId: null,
  status: "active",
  page: 1,
  pageSize: 24,
};

const capabilities: MediaCapabilities = {
  canRead: true,
  canUpload: true,
  canManageMetadata: true,
  canManageLifecycle: true,
  canHardDelete: true,
};

describe("MediaPage", () => {
  it("finishes the first render when the Media library is empty", async () => {
    const rawSearchParams = {};
    mocks.parseAdminMediaListQuery.mockReturnValue(query);
    mocks.listAdminMediaAssets.mockResolvedValue(emptyAssets);
    mocks.listMediaScopeGames.mockResolvedValue([]);
    mocks.getCurrentMediaCapabilities.mockResolvedValue(capabilities);

    const page = await MediaPage({ searchParams: Promise.resolve(rawSearchParams) });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("EMPTY_MEDIA_LIBRARY");
    expect(mocks.listAdminMediaAssets).toHaveBeenCalledWith(rawSearchParams);
    expect(mocks.listMediaScopeGames).toHaveBeenCalledOnce();
    expect(mocks.getCurrentMediaCapabilities).toHaveBeenCalledOnce();
  });

  it("shows hard-delete success feedback after the action redirects to the library", async () => {
    const rawSearchParams = { notice: "asset-deleted" };
    mocks.parseAdminMediaListQuery.mockReturnValue(query);
    mocks.listAdminMediaAssets.mockResolvedValue(emptyAssets);
    mocks.listMediaScopeGames.mockResolvedValue([]);
    mocks.getCurrentMediaCapabilities.mockResolvedValue(capabilities);

    const page = await MediaPage({ searchParams: Promise.resolve(rawSearchParams) });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Asset excluído permanentemente.");
    expect(html).toContain('role="status"');
  });
});
