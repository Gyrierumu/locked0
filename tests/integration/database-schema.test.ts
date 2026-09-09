import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationsDirectory = join(process.cwd(), "drizzle");
const migrationFiles = readdirSync(migrationsDirectory).filter((file) => file.endsWith(".sql"));
const migrationSql = migrationFiles
  .map((file) => readFileSync(join(migrationsDirectory, file), "utf8"))
  .join("\n")
  .replace(/\s+/g, " ");

const expectedTables = [
  "achievement_groups",
  "achievement_sets",
  "achievements",
  "checklist_item_achievements",
  "checklist_items",
  "content_packs",
  "game_releases",
  "games",
  "guide_content_node_achievements",
  "guide_content_node_targets",
  "guide_content_nodes",
  "guide_sections",
  "guide_steps",
  "guide_targets",
  "guide_versions",
  "guides",
  "media_assets",
  "platforms",
  "profiles",
  "release_achievement_sets",
  "user_achievement_progress",
  "user_checklist_progress",
  "user_completions",
  "user_guide_progress",
  "user_roles",
].sort();

function expectConstraints(names: string[]): void {
  for (const name of names) {
    expect(migrationSql, `missing constraint ${name}`).toContain(`CONSTRAINT "${name}"`);
  }
}

describe("database baseline", () => {
  it("contains one baseline migration with the 25 owned tables", () => {
    expect(migrationFiles).toEqual(["0000_baseline.sql"]);

    const actualTables = Array.from(migrationSql.matchAll(/CREATE TABLE "([^"]+)"/g), (match) =>
      match[1],
    ).sort();

    expect(actualTables).toEqual(expectedTables);
  });

  it("references Supabase auth.users without managing it", () => {
    expect(migrationSql).toContain('REFERENCES "auth"."users"("id")');
    expect(migrationSql).not.toContain('CREATE TABLE "auth"."users"');
    expect(migrationSql).not.toContain('CREATE SCHEMA "auth"');
  });

  it("reserves one base group and only active editorial positions", () => {
    expect(migrationSql).toContain(
      'CREATE UNIQUE INDEX "achievement_groups_one_base_per_set_unique" ON "achievement_groups" USING btree ("achievement_set_id") WHERE "achievement_groups"."type" = \'base\'',
    );
    expect(migrationSql).toContain(
      'CREATE UNIQUE INDEX "guide_steps_active_position_unique" ON "guide_steps" USING btree ("guide_id","position") WHERE "guide_steps"."retired_at" is null',
    );
    expect(migrationSql).toContain(
      'CREATE UNIQUE INDEX "guide_sections_active_position_unique" ON "guide_sections" USING btree ("guide_step_id","position") WHERE "guide_sections"."retired_at" is null',
    );
    expect(migrationSql).toContain(
      'CREATE UNIQUE INDEX "guide_content_nodes_active_position_unique" ON "guide_content_nodes" USING btree ("guide_section_id","position") WHERE "guide_content_nodes"."retired_at" is null',
    );
  });

  it("keeps general and release-specific target identities reserved", () => {
    expect(migrationSql).toContain(
      'CREATE UNIQUE INDEX "guide_targets_general_identity_unique" ON "guide_targets" USING btree ("guide_id","achievement_set_id") WHERE "guide_targets"."game_release_id" is null',
    );
    expect(migrationSql).toContain(
      'CREATE UNIQUE INDEX "guide_targets_specific_identity_unique" ON "guide_targets" USING btree ("guide_id","achievement_set_id","game_release_id") WHERE "guide_targets"."game_release_id" is not null',
    );
  });

  it("enforces version source XOR and guide publication consistency", () => {
    expect(migrationSql).toContain(
      'CONSTRAINT "guide_versions_source_xor_check" CHECK (("guide_versions"."source_draft_revision" is null) <> ("guide_versions"."source_version_id" is null))',
    );
    expectConstraints(["guides_publication_consistency_check"]);
    expect(migrationSql).toContain(
      '("guides"."published_version_id" is null and "guides"."first_published_at" is null)',
    );
    expect(migrationSql).toContain(
      '("guides"."published_version_id" is not null and "guides"."first_published_at" is not null)',
    );
  });

  it("enforces username normalization and all frozen status/type domains", () => {
    expect(migrationSql).toContain(
      'CONSTRAINT "profiles_username_lowercase_check" CHECK ("profiles"."username" = lower("profiles"."username"))',
    );
    expect(migrationSql).toContain(
      'CONSTRAINT "profiles_username_format_check" CHECK ("profiles"."username" ~ \'^[a-z0-9_]{3,30}$\')',
    );
    expectConstraints([
      "achievement_groups_type_check",
      "achievement_sets_status_check",
      "achievements_status_check",
      "achievements_type_check",
      "checklist_items_kind_check",
      "content_packs_status_check",
      "content_packs_type_check",
      "games_status_check",
      "guide_content_nodes_target_scope_check",
      "guide_content_nodes_type_check",
      "guides_workflow_status_check",
      "user_achievement_progress_source_check",
      "user_completions_goal_check",
      "user_roles_role_check",
    ]);
  });

  it("enforces revision, difficulty, time, and media value ranges", () => {
    expect(migrationSql.match(/"edit_revision" bigint DEFAULT 0 NOT NULL/g)).toHaveLength(6);
    expect(migrationSql).toContain('"draft_revision" bigint DEFAULT 0 NOT NULL');
    expect(migrationSql).toContain('"structure_revision" bigint DEFAULT 0 NOT NULL');
    expectConstraints([
      "checklist_items_edit_revision_check",
      "guide_content_nodes_edit_revision_check",
      "guide_sections_edit_revision_check",
      "guide_steps_edit_revision_check",
      "guide_targets_difficulty_rating_check",
      "guide_targets_edit_revision_check",
      "guide_targets_estimated_minutes_max_check",
      "guide_targets_estimated_minutes_min_check",
      "guide_targets_estimated_minutes_range_check",
      "guide_targets_minimum_playthroughs_check",
      "guide_versions_source_draft_revision_check",
      "guides_draft_revision_check",
      "guides_edit_revision_check",
      "guides_structure_revision_check",
      "media_assets_byte_size_check",
      "media_assets_height_check",
      "media_assets_width_check",
    ]);
  });

  it("preserves history and human progress through delete actions", () => {
    expect(migrationSql).toContain(
      'FOREIGN KEY ("published_version_id") REFERENCES "public"."guide_versions"("id") ON DELETE restrict',
    );
    expect(migrationSql).toContain(
      'FOREIGN KEY ("published_by") REFERENCES "auth"."users"("id") ON DELETE set null',
    );
    expect(migrationSql).toContain(
      'FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade',
    );
    expect(migrationSql).toContain(
      'FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE restrict',
    );
    expect(migrationSql).toContain(
      'FOREIGN KEY ("last_content_node_id") REFERENCES "public"."guide_content_nodes"("id") ON DELETE set null',
    );
  });
});
