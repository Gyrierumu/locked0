import { describe, expect, it } from "vitest";

import { slugify } from "./slugify";

describe("slugify", () => {
  it("normalizes accents, spaces and punctuation", () => {
    expect(slugify("  Guia: Coração de Aço!  ")).toBe("guia-coracao-de-aco");
  });
});
