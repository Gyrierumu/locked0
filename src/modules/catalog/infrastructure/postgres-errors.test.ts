import { describe, expect, it } from "vitest";

import { CatalogError } from "../domain/errors";
import { mapCatalogPersistenceError } from "./postgres-errors";

describe("catalog persistence error mapping", () => {
  it.each([
    ["games_slug_unique", "game", "duplicate_game_slug"],
    ["platforms_slug_unique", "platform", "duplicate_platform_slug"],
    ["game_releases_game_id_key_unique", "release", "duplicate_release_key"],
    ["content_packs_game_id_slug_unique", "content_pack", "duplicate_content_pack_slug"],
  ] as const)("maps %s to a semantic error", (constraint, operation, code) => {
    let captured: unknown;
    try {
      mapCatalogPersistenceError({ cause: { code: "23505", constraint_name: constraint } }, operation);
    } catch (error) {
      captured = error;
    }
    expect(captured).toBeInstanceOf(CatalogError);
    expect(captured).toMatchObject({ code });
  });

  it("maps foreign-key failures without exposing PostgreSQL details", () => {
    expect(() => mapCatalogPersistenceError({ code: "23503" }, "release")).toThrow(
      "O recurso solicitado não foi encontrado.",
    );
  });
});

