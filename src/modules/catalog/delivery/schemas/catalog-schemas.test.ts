import { describe, expect, it } from "vitest";

import {
  adminGameListSchema,
  createContentPackSchema,
  createGameSchema,
} from "./catalog-schemas";

const validGame = {
  name: "Elden Ring",
  slug: "elden-ring",
  summary: "",
  developerName: "FromSoftware",
  publisherName: "Bandai Namco",
  releaseDate: "2022-02-25",
  status: "active",
};

describe("catalog boundary schemas", () => {
  it("accepts a valid game and normalizes optional blanks", () => {
    const parsed = createGameSchema.parse(validGame);
    expect(parsed.summary).toBeNull();
    expect(parsed.slug).toBe("elden-ring");
  });

  it.each(["Elden Ring", "ELDEN-RING", "elden_ring", "-elden-ring"])(
    "rejects invalid game slug %s",
    (slug) => {
      expect(createGameSchema.safeParse({ ...validGame, slug }).success).toBe(false);
    },
  );

  it("accepts only frozen content pack types", () => {
    const base = {
      name: "Shadow of the Erdtree",
      slug: "shadow-of-the-erdtree",
      description: "",
      releaseDate: "2024-06-21",
      status: "active",
    };

    expect(createContentPackSchema.safeParse({ ...base, type: "expansion" }).success).toBe(true);
    expect(createContentPackSchema.safeParse({ ...base, type: "season-pass" }).success).toBe(false);
  });

  it("rejects a date that is syntactically ISO but does not exist", () => {
    expect(
      createGameSchema.safeParse({ ...validGame, releaseDate: "2022-02-31" }).success,
    ).toBe(false);
  });

  it("sanitizes list query strings", () => {
    expect(
      adminGameListSchema.parse({ q: ["elden"], status: "deleted", page: "0" }),
    ).toEqual({ q: "", status: "all", page: 1, pageSize: 25 });
    expect(adminGameListSchema.parse({ q: " elden ", status: "active", page: "2" })).toEqual({
      q: "elden",
      status: "active",
      page: 2,
      pageSize: 25,
    });
  });
});
