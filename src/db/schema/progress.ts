import { sql } from "drizzle-orm";
import { authUsers } from "drizzle-orm/supabase";
import {
  check,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { achievementSets, achievements } from "./catalog";
import {
  checklistItems,
  guideContentNodes,
  guideSections,
  guideSteps,
  guideTargets,
} from "./editorial";

export const userCompletions = pgTable(
  "user_completions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    achievementSetId: uuid("achievement_set_id")
      .notNull()
      .references(() => achievementSets.id, { onDelete: "restrict" }),
    goal: text("goal").notNull().default("base"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    baseCompletedAt: timestamp("base_completed_at", { withTimezone: true }),
    fullCompletedAt: timestamp("full_completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("user_completions_user_set_unique").on(table.userId, table.achievementSetId),
    check("user_completions_goal_check", sql`${table.goal} in ('base', 'full')`),
    index("user_completions_user_id_idx").on(table.userId),
    index("user_completions_achievement_set_id_idx").on(table.achievementSetId),
  ],
);

export const userAchievementProgress = pgTable(
  "user_achievement_progress",
  {
    userCompletionId: uuid("user_completion_id")
      .notNull()
      .references(() => userCompletions.id, { onDelete: "cascade" }),
    achievementId: uuid("achievement_id")
      .notNull()
      .references(() => achievements.id, { onDelete: "restrict" }),
    earnedAt: timestamp("earned_at", { withTimezone: true }),
    source: text("source").notNull().default("manual"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({
      name: "user_achievement_progress_pk",
      columns: [table.userCompletionId, table.achievementId],
    }),
    check(
      "user_achievement_progress_source_check",
      sql`${table.source} in ('manual', 'playstation', 'xbox', 'steam', 'admin', 'other')`,
    ),
    index("user_achievement_progress_completion_id_idx").on(table.userCompletionId),
    index("user_achievement_progress_achievement_id_idx").on(table.achievementId),
  ],
);

export const userGuideProgress = pgTable(
  "user_guide_progress",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    guideTargetId: uuid("guide_target_id")
      .notNull()
      .references(() => guideTargets.id, { onDelete: "restrict" }),
    achievementSetId: uuid("achievement_set_id")
      .notNull()
      .references(() => achievementSets.id, { onDelete: "restrict" }),
    userCompletionId: uuid("user_completion_id")
      .notNull()
      .references(() => userCompletions.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).notNull(),
    lastStepId: uuid("last_step_id").references(() => guideSteps.id, { onDelete: "set null" }),
    lastSectionId: uuid("last_section_id").references(() => guideSections.id, {
      onDelete: "set null",
    }),
    lastContentNodeId: uuid("last_content_node_id").references(() => guideContentNodes.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("user_guide_progress_user_target_unique").on(table.userId, table.guideTargetId),
    index("user_guide_progress_user_id_idx").on(table.userId),
    index("user_guide_progress_guide_target_id_idx").on(table.guideTargetId),
    index("user_guide_progress_achievement_set_id_idx").on(table.achievementSetId),
    index("user_guide_progress_completion_id_idx").on(table.userCompletionId),
    index("user_guide_progress_last_activity_at_idx").on(table.lastActivityAt),
    index("user_guide_progress_user_activity_idx").on(
      table.userId,
      table.lastActivityAt.desc(),
    ),
  ],
);

export const userChecklistProgress = pgTable(
  "user_checklist_progress",
  {
    userGuideProgressId: uuid("user_guide_progress_id")
      .notNull()
      .references(() => userGuideProgress.id, { onDelete: "cascade" }),
    checklistItemId: uuid("checklist_item_id")
      .notNull()
      .references(() => checklistItems.id, { onDelete: "restrict" }),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({
      name: "user_checklist_progress_pk",
      columns: [table.userGuideProgressId, table.checklistItemId],
    }),
    index("user_checklist_progress_guide_progress_id_idx").on(table.userGuideProgressId),
    index("user_checklist_progress_checklist_item_id_idx").on(table.checklistItemId),
  ],
);
