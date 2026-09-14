import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { AdminAchievement, AdminAchievementGroup } from "../../contracts";

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <span>{alt}</span>,
}));
vi.mock("@/modules/media/ui", () => ({
  CatalogMediaField: () => <div>MEDIA_FIELD</div>,
}));
vi.mock("../actions/achievement-actions", () => ({
  archiveAchievementAction: vi.fn(),
  clearAchievementIconAction: vi.fn(),
  restoreAchievementAction: vi.fn(),
  setAchievementIconAction: vi.fn(),
  updateAchievementAction: vi.fn(),
}));
vi.mock("./lifecycle-action.client", () => ({
  LifecycleAction: () => <div>LIFECYCLE_ACTION</div>,
}));
vi.mock("./use-refresh-after-success.client", () => ({
  useRefreshAfterSuccess: vi.fn(),
}));

import { AchievementRow } from "./achievement-row.client";

const achievement: AdminAchievement = {
  id: "11111111-1111-4111-8111-111111111111",
  achievementGroupId: "22222222-2222-4222-8222-222222222222",
  groupName: "Base",
  groupPosition: 0,
  name: "Primeira conquista",
  slug: "primeira-conquista",
  description: null,
  achievementType: "bronze",
  points: 10,
  isHidden: false,
  iconPath: null,
  position: 0,
  status: "active",
};

const group: AdminAchievementGroup = {
  id: achievement.achievementGroupId,
  achievementSetId: "33333333-3333-4333-8333-333333333333",
  name: "Base",
  type: "base",
  position: 0,
  contentPack: null,
  achievementCount: 1,
};

describe("AchievementRow inspector copy", () => {
  it("keeps external metadata preserved without claiming that the icon is read-only", () => {
    const html = renderToStaticMarkup(
      <table>
        <tbody>
          <AchievementRow
            achievement={achievement}
            groups={[group]}
            gameId="44444444-4444-4444-8444-444444444444"
            gameName="Jogo"
            achievementSetId={group.achievementSetId}
            canManage
            displayPosition={1}
            iconPreviewUrl={null}
          />
        </tbody>
      </table>,
    );

    expect(html).toContain(
      "Metadados externos fora deste escopo permanecem preservados. O ícone pode ser editado acima.",
    );
    expect(html).not.toContain("ícone são preservados, mas não são editáveis");
  });
});
