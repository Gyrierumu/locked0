import { CatalogError } from "../domain/errors";

type PersistenceOperation =
  | "game"
  | "platform"
  | "release"
  | "content_pack";

type ErrorDetails = Readonly<{
  code: string | null;
  constraint: string | null;
}>;

function readDetails(error: unknown): ErrorDetails {
  let current = error;

  for (let depth = 0; depth < 5 && current && typeof current === "object"; depth += 1) {
    const candidate = current as {
      code?: unknown;
      constraint?: unknown;
      constraint_name?: unknown;
      cause?: unknown;
    };
    const code = typeof candidate.code === "string" ? candidate.code : null;
    const constraintValue = candidate.constraint ?? candidate.constraint_name;
    const constraint = typeof constraintValue === "string" ? constraintValue : null;

    if (code) return { code, constraint };
    current = candidate.cause;
  }

  return { code: null, constraint: null };
}

export function mapCatalogPersistenceError(
  error: unknown,
  operation: PersistenceOperation,
): never {
  const { code, constraint } = readDetails(error);

  if (code === "23505") {
    if (constraint === "games_slug_unique" || operation === "game") {
      throw new CatalogError("duplicate_game_slug");
    }
    if (constraint === "platforms_slug_unique" || operation === "platform") {
      throw new CatalogError("duplicate_platform_slug");
    }
    if (constraint === "game_releases_game_id_key_unique" || operation === "release") {
      throw new CatalogError("duplicate_release_key");
    }
    if (
      constraint === "content_packs_game_id_slug_unique" ||
      operation === "content_pack"
    ) {
      throw new CatalogError("duplicate_content_pack_slug");
    }
  }

  if (code === "23503") throw new CatalogError("not_found");
  throw error;
}

