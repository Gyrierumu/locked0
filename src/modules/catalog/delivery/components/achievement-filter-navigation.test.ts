import { describe, expect, it } from "vitest";

import { buildAchievementFilterHref } from "./achievement-filter-navigation";

describe("Achievement filter navigation", () => {
  it("preserves active filters in shareable query params and resets pagination", () => {
    const formData = new FormData();
    formData.set("q", "  elden lord  ");
    formData.set("groupId", "group-1");
    formData.set("type", "gold");
    formData.set("status", "archived");
    formData.set("hidden", "hidden");

    const href = buildAchievementFilterHref("/admin/sets/set-1", formData);

    expect(href).toBe(
      "/admin/sets/set-1?view=achievements&q=elden+lord&groupId=group-1&type=gold&status=archived&hidden=hidden",
    );
    expect(href).not.toContain("page=");
  });

  it("omits empty and all-valued filters without losing the achievements view", () => {
    const formData = new FormData();
    formData.set("q", " ");
    formData.set("groupId", "");
    formData.set("type", "all");
    formData.set("status", "all");
    formData.set("hidden", "all");

    expect(buildAchievementFilterHref("/admin/sets/set-1", formData)).toBe(
      "/admin/sets/set-1?view=achievements",
    );
  });
});
