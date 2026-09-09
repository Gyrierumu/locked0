import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { authUsers } from "drizzle-orm/supabase";

import { achievementSets, achievements, gameReleases, games } from "./catalog";

export const guides = pgTable(
  "guides",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "restrict" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    summary: text("summary"),
    workflowStatus: text("workflow_status").notNull().default("draft"),
    createdBy: uuid("created_by").references(() => authUsers.id, { onDelete: "set null" }),
    publishedVersionId: uuid("published_version_id").references(
      (): AnyPgColumn => guideVersions.id,
      { onDelete: "restrict" },
    ),
    draftRevision: bigint("draft_revision", { mode: "number" }).notNull().default(0),
    structureRevision: bigint("structure_revision", { mode: "number" }).notNull().default(0),
    editRevision: bigint("edit_revision", { mode: "number" }).notNull().default(0),
    firstPublishedAt: timestamp("first_published_at", { withTimezone: true }),
    outdatedAt: timestamp("outdated_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("guides_game_id_slug_unique").on(table.gameId, table.slug),
    check("guides_workflow_status_check", sql`${table.workflowStatus} in ('draft', 'review')`),
    check("guides_draft_revision_check", sql`${table.draftRevision} >= 0`),
    check("guides_structure_revision_check", sql`${table.structureRevision} >= 0`),
    check("guides_edit_revision_check", sql`${table.editRevision} >= 0`),
    check(
      "guides_publication_consistency_check",
      sql`(
        (${table.publishedVersionId} is null and ${table.firstPublishedAt} is null)
        or
        (${table.publishedVersionId} is not null and ${table.firstPublishedAt} is not null)
      )`,
    ),
    index("guides_game_id_idx").on(table.gameId),
    index("guides_published_version_id_idx").on(table.publishedVersionId),
    index("guides_public_game_id_idx")
      .on(table.gameId)
      .where(sql`${table.publishedVersionId} is not null and ${table.archivedAt} is null`),
  ],
);

export const guideTargets = pgTable(
  "guide_targets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    guideId: uuid("guide_id")
      .notNull()
      .references(() => guides.id, { onDelete: "cascade" }),
    achievementSetId: uuid("achievement_set_id")
      .notNull()
      .references(() => achievementSets.id, { onDelete: "restrict" }),
    gameReleaseId: uuid("game_release_id").references(() => gameReleases.id, {
      onDelete: "restrict",
    }),
    difficultyRating: smallint("difficulty_rating"),
    estimatedMinutesMin: integer("estimated_minutes_min"),
    estimatedMinutesMax: integer("estimated_minutes_max"),
    minimumPlaythroughs: smallint("minimum_playthroughs"),
    hasMissables: boolean("has_missables"),
    requiresOnline: boolean("requires_online"),
    difficultyRequirement: text("difficulty_requirement"),
    supportsBaseCompletion: boolean("supports_base_completion").notNull().default(true),
    supportsFullCompletion: boolean("supports_full_completion").notNull().default(true),
    editRevision: bigint("edit_revision", { mode: "number" }).notNull().default(0),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("guide_targets_general_identity_unique")
      .on(table.guideId, table.achievementSetId)
      .where(sql`${table.gameReleaseId} is null`),
    uniqueIndex("guide_targets_specific_identity_unique")
      .on(table.guideId, table.achievementSetId, table.gameReleaseId)
      .where(sql`${table.gameReleaseId} is not null`),
    check(
      "guide_targets_difficulty_rating_check",
      sql`${table.difficultyRating} is null or ${table.difficultyRating} between 1 and 10`,
    ),
    check(
      "guide_targets_estimated_minutes_min_check",
      sql`${table.estimatedMinutesMin} is null or ${table.estimatedMinutesMin} >= 0`,
    ),
    check(
      "guide_targets_estimated_minutes_max_check",
      sql`${table.estimatedMinutesMax} is null or ${table.estimatedMinutesMax} >= 0`,
    ),
    check(
      "guide_targets_estimated_minutes_range_check",
      sql`${table.estimatedMinutesMin} is null or ${table.estimatedMinutesMax} is null or ${table.estimatedMinutesMax} >= ${table.estimatedMinutesMin}`,
    ),
    check(
      "guide_targets_minimum_playthroughs_check",
      sql`${table.minimumPlaythroughs} is null or ${table.minimumPlaythroughs} >= 1`,
    ),
    check("guide_targets_edit_revision_check", sql`${table.editRevision} >= 0`),
    index("guide_targets_guide_id_idx").on(table.guideId),
    index("guide_targets_achievement_set_id_idx").on(table.achievementSetId),
    index("guide_targets_game_release_id_idx").on(table.gameReleaseId),
  ],
);

export const guideSteps = pgTable(
  "guide_steps",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    guideId: uuid("guide_id")
      .notNull()
      .references(() => guides.id, { onDelete: "cascade" }),
    anchor: text("anchor").notNull(),
    title: text("title").notNull(),
    summary: text("summary"),
    estimatedMinutesMin: integer("estimated_minutes_min"),
    estimatedMinutesMax: integer("estimated_minutes_max"),
    position: integer("position").notNull(),
    editRevision: bigint("edit_revision", { mode: "number" }).notNull().default(0),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("guide_steps_guide_id_anchor_unique").on(table.guideId, table.anchor),
    uniqueIndex("guide_steps_active_position_unique")
      .on(table.guideId, table.position)
      .where(sql`${table.retiredAt} is null`),
    check("guide_steps_position_check", sql`${table.position} >= 0`),
    check("guide_steps_edit_revision_check", sql`${table.editRevision} >= 0`),
    check(
      "guide_steps_estimated_minutes_min_check",
      sql`${table.estimatedMinutesMin} is null or ${table.estimatedMinutesMin} >= 0`,
    ),
    check(
      "guide_steps_estimated_minutes_max_check",
      sql`${table.estimatedMinutesMax} is null or ${table.estimatedMinutesMax} >= 0`,
    ),
    check(
      "guide_steps_estimated_minutes_range_check",
      sql`${table.estimatedMinutesMin} is null or ${table.estimatedMinutesMax} is null or ${table.estimatedMinutesMax} >= ${table.estimatedMinutesMin}`,
    ),
    index("guide_steps_guide_id_idx").on(table.guideId),
  ],
);

export const guideSections = pgTable(
  "guide_sections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    guideStepId: uuid("guide_step_id")
      .notNull()
      .references(() => guideSteps.id, { onDelete: "cascade" }),
    anchor: text("anchor").notNull(),
    title: text("title").notNull(),
    summary: text("summary"),
    position: integer("position").notNull(),
    editRevision: bigint("edit_revision", { mode: "number" }).notNull().default(0),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("guide_sections_step_anchor_unique").on(table.guideStepId, table.anchor),
    uniqueIndex("guide_sections_active_position_unique")
      .on(table.guideStepId, table.position)
      .where(sql`${table.retiredAt} is null`),
    check("guide_sections_position_check", sql`${table.position} >= 0`),
    check("guide_sections_edit_revision_check", sql`${table.editRevision} >= 0`),
    index("guide_sections_guide_step_id_idx").on(table.guideStepId),
  ],
);

export const guideContentNodes = pgTable(
  "guide_content_nodes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    guideSectionId: uuid("guide_section_id")
      .notNull()
      .references(() => guideSections.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    position: integer("position").notNull(),
    targetScope: text("target_scope").notNull().default("all"),
    data: jsonb("data").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    editRevision: bigint("edit_revision", { mode: "number" }).notNull().default(0),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("guide_content_nodes_active_position_unique")
      .on(table.guideSectionId, table.position)
      .where(sql`${table.retiredAt} is null`),
    check(
      "guide_content_nodes_type_check",
      sql`${table.type} in ('text', 'heading', 'alert', 'spoiler', 'image', 'video', 'list', 'table', 'link', 'checklist', 'achievement')`,
    ),
    check("guide_content_nodes_target_scope_check", sql`${table.targetScope} in ('all', 'selected')`),
    check("guide_content_nodes_position_check", sql`${table.position} >= 0`),
    check("guide_content_nodes_edit_revision_check", sql`${table.editRevision} >= 0`),
    index("guide_content_nodes_guide_section_id_idx").on(table.guideSectionId),
  ],
);

export const guideContentNodeTargets = pgTable(
  "guide_content_node_targets",
  {
    contentNodeId: uuid("content_node_id")
      .notNull()
      .references(() => guideContentNodes.id, { onDelete: "cascade" }),
    guideTargetId: uuid("guide_target_id")
      .notNull()
      .references(() => guideTargets.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({
      name: "guide_content_node_targets_pk",
      columns: [table.contentNodeId, table.guideTargetId],
    }),
    index("guide_content_node_targets_guide_target_id_idx").on(table.guideTargetId),
  ],
);

export const guideContentNodeAchievements = pgTable(
  "guide_content_node_achievements",
  {
    contentNodeId: uuid("content_node_id")
      .notNull()
      .references(() => guideContentNodes.id, { onDelete: "cascade" }),
    achievementId: uuid("achievement_id")
      .notNull()
      .references(() => achievements.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({
      name: "guide_content_node_achievements_pk",
      columns: [table.contentNodeId, table.achievementId],
    }),
    index("guide_content_node_achievements_achievement_id_idx").on(table.achievementId),
  ],
);

export const checklistItems = pgTable(
  "checklist_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contentNodeId: uuid("content_node_id")
      .notNull()
      .unique()
      .references(() => guideContentNodes.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    kind: text("kind").notNull().default("action"),
    isRequired: boolean("is_required").notNull().default(true),
    isMissable: boolean("is_missable").notNull().default(false),
    editRevision: bigint("edit_revision", { mode: "number" }).notNull().default(0),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check(
      "checklist_items_kind_check",
      sql`${table.kind} in ('action', 'collectible', 'quest', 'boss', 'choice', 'online', 'other')`,
    ),
    check("checklist_items_edit_revision_check", sql`${table.editRevision} >= 0`),
  ],
);

export const checklistItemAchievements = pgTable(
  "checklist_item_achievements",
  {
    checklistItemId: uuid("checklist_item_id")
      .notNull()
      .references(() => checklistItems.id, { onDelete: "cascade" }),
    achievementId: uuid("achievement_id")
      .notNull()
      .references(() => achievements.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({
      name: "checklist_item_achievements_pk",
      columns: [table.checklistItemId, table.achievementId],
    }),
    index("checklist_item_achievements_achievement_id_idx").on(table.achievementId),
  ],
);

export const guideVersions = pgTable(
  "guide_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    guideId: uuid("guide_id")
      .notNull()
      .references(() => guides.id, { onDelete: "restrict" }),
    versionNumber: integer("version_number").notNull(),
    snapshotSchemaVersion: smallint("snapshot_schema_version").notNull().default(1),
    changelog: text("changelog").notNull(),
    snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
    sourceDraftRevision: bigint("source_draft_revision", { mode: "number" }),
    sourceVersionId: uuid("source_version_id").references(
      (): AnyPgColumn => guideVersions.id,
      { onDelete: "restrict" },
    ),
    publishedBy: uuid("published_by").references(() => authUsers.id, { onDelete: "set null" }),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("guide_versions_guide_id_version_number_unique").on(
      table.guideId,
      table.versionNumber,
    ),
    check("guide_versions_version_number_check", sql`${table.versionNumber} >= 1`),
    check(
      "guide_versions_snapshot_schema_version_check",
      sql`${table.snapshotSchemaVersion} >= 1`,
    ),
    check(
      "guide_versions_source_draft_revision_check",
      sql`${table.sourceDraftRevision} is null or ${table.sourceDraftRevision} >= 0`,
    ),
    check("guide_versions_changelog_check", sql`length(trim(${table.changelog})) > 0`),
    check(
      "guide_versions_source_xor_check",
      sql`(${table.sourceDraftRevision} is null) <> (${table.sourceVersionId} is null)`,
    ),
    index("guide_versions_source_version_id_idx").on(table.sourceVersionId),
  ],
);
