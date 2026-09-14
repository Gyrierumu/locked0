import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type {
  AdminMediaListQuery,
  MediaCapabilities,
  PaginatedMediaAssets,
} from "../../contracts";
import { MediaLibrary } from "./media-library";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("../actions/media-actions", () => ({
  finalizeMediaUploadAction: vi.fn(),
  requestMediaUploadAction: vi.fn(),
}));

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

const adminCapabilities: MediaCapabilities = {
  canRead: true,
  canUpload: true,
  canManageMetadata: true,
  canManageLifecycle: true,
  canHardDelete: true,
};

describe("MediaLibrary", () => {
  it("renders the empty library for an administrator", () => {
    const html = renderToStaticMarkup(
      <MediaLibrary
        assets={emptyAssets}
        query={query}
        games={[]}
        capabilities={adminCapabilities}
      />,
    );

    expect(html).toContain("Nenhum asset encontrado.");
    expect(html).toContain("0 assets");
    expect(html).toContain("Upload");
  });
});
