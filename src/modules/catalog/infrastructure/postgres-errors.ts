import { CatalogError } from "../domain/errors";

type PersistenceOperation =
  | "game"
  | "platform"
  | "release"
  | "content_pack"
  | "achievement_set"
  | "achievement_group"
  | "achievement";

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
    if (constraint === "achievement_sets_game_id_key_unique" || operation === "achievement_set") {
      throw new CatalogError("duplicate_achievement_set_key");
    }
    if (constraint === "achievement_groups_one_base_per_set_unique") {
      throw new CatalogError("duplicate_base_group");
    }
    if (constraint === "achievement_groups_achievement_set_id_position_unique") {
      throw new CatalogError("duplicate_group_position");
    }
    if (constraint === "achievements_group_slug_unique") {
      throw new CatalogError("duplicate_achievement_slug");
    }
    if (constraint === "achievements_group_position_unique") {
      throw new CatalogError("duplicate_achievement_position");
    }
  }

  if (code === "23514" && operation === "achievement_group") {
    throw new CatalogError("base_group_content_pack");
  }

  if (code === "23503") throw new CatalogError("not_found");
  throw error;
}
