import { describe, expect, it } from "vitest";

import { isAdminNavLinkActive } from "./admin-nav-link.client";

describe("admin navigation active state", () => {
  it.each([
    ["/admin", "/admin", true, true],
    ["/admin/jogos", "/admin", true, false],
    ["/admin/plataformas", "/admin", true, false],
    ["/admin/jogos", "/admin/jogos", false, true],
    ["/admin/jogos/game-id", "/admin/jogos", false, true],
    ["/admin/jogos/game-id/releases", "/admin/jogos", false, true],
    ["/admin/plataformas", "/admin/plataformas", false, true],
  ])(
    "matches pathname %s against %s with exact=%s",
    (pathname, href, exact, expected) => {
      expect(isAdminNavLinkActive(pathname, href, exact)).toBe(expected);
    },
  );
});
