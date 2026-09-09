import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const games = pgTable(
  "games",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    summary: text("summary"),
    coverPath: text("cover_path"),
    heroPath: text("hero_path"),
    developerName: text("developer_name"),
    publisherName: text("publisher_name"),
    releaseDate: date("release_date", { mode: "string" }),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check("games_slug_format_check", sql`${table.slug} ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`),
    check("games_status_check", sql`${table.status} in ('active', 'archived')`),
  ],
);

export const platforms = pgTable("platforms", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  iconPath: text("icon_path"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const gameReleases = pgTable(
  "game_releases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "restrict" }),
    platformId: uuid("platform_id")
      .notNull()
      .references(() => platforms.id, { onDelete: "restrict" }),
    key: text("key").notNull(),
    name: text("name"),
    regionCode: text("region_code"),
    releaseDate: date("release_date", { mode: "string" }),
    externalMetadata: jsonb("external_metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("game_releases_game_id_key_unique").on(table.gameId, table.key),
    index("game_releases_game_id_idx").on(table.gameId),
    index("game_releases_platform_id_idx").on(table.platformId),
  ],
);

export const achievementSets = pgTable(
  "achievement_sets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "restrict" }),
    key: text("key").notNull(),
    name: text("name").notNull(),
    regionCode: text("region_code"),
    externalMetadata: jsonb("external_metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("achievement_sets_game_id_key_unique").on(table.gameId, table.key),
    check("achievement_sets_status_check", sql`${table.status} in ('active', 'archived')`),
    index("achievement_sets_game_id_idx").on(table.gameId),
  ],
);

export const releaseAchievementSets = pgTable(
  "release_achievement_sets",
  {
    gameReleaseId: uuid("game_release_id")
      .notNull()
      .references(() => gameReleases.id, { onDelete: "cascade" }),
    achievementSetId: uuid("achievement_set_id")
      .notNull()
      .references(() => achievementSets.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({
      name: "release_achievement_sets_pk",
      columns: [table.gameReleaseId, table.achievementSetId],
    }),
    index("release_achievement_sets_achievement_set_id_idx").on(table.achievementSetId),
  ],
);

export const contentPacks = pgTable(
  "content_packs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "restrict" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    type: text("type").notNull(),
    description: text("description"),
    releaseDate: date("release_date", { mode: "string" }),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("content_packs_game_id_slug_unique").on(table.gameId, table.slug),
    check(
      "content_packs_type_check",
      sql`${table.type} in ('expansion', 'dlc', 'update', 'mode', 'other')`,
    ),
    check("content_packs_status_check", sql`${table.status} in ('active', 'archived')`),
    index("content_packs_game_id_idx").on(table.gameId),
  ],
);

export const achievementGroups = pgTable(
  "achievement_groups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    achievementSetId: uuid("achievement_set_id")
      .notNull()
      .references(() => achievementSets.id, { onDelete: "restrict" }),
    contentPackId: uuid("content_pack_id").references(() => contentPacks.id, {
      onDelete: "restrict",
    }),
    name: text("name").notNull(),
    type: text("type").notNull(),
    position: integer("position").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("achievement_groups_achievement_set_id_position_unique").on(
      table.achievementSetId,
      table.position,
    ),
    uniqueIndex("achievement_groups_one_base_per_set_unique")
      .on(table.achievementSetId)
      .where(sql`${table.type} = 'base'`),
    check(
      "achievement_groups_type_check",
      sql`${table.type} in ('base', 'dlc', 'expansion', 'update', 'mode', 'other')`,
    ),
    check("achievement_groups_position_check", sql`${table.position} >= 0`),
    check(
      "achievement_groups_base_pack_check",
      sql`${table.type} <> 'base' or ${table.contentPackId} is null`,
    ),
    index("achievement_groups_achievement_set_id_idx").on(table.achievementSetId),
    index("achievement_groups_content_pack_id_idx").on(table.contentPackId),
  ],
);

export const achievements = pgTable(
  "achievements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    achievementGroupId: uuid("achievement_group_id")
      .notNull()
      .references(() => achievementGroups.id, { onDelete: "restrict" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    achievementType: text("achievement_type").notNull(),
    points: integer("points"),
    isHidden: boolean("is_hidden").notNull().default(false),
    iconPath: text("icon_path"),
    position: integer("position").notNull(),
    externalMetadata: jsonb("external_metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("achievements_group_position_unique").on(table.achievementGroupId, table.position),
    unique("achievements_group_slug_unique").on(table.achievementGroupId, table.slug),
    check(
      "achievements_type_check",
      sql`${table.achievementType} in ('bronze', 'silver', 'gold', 'platinum', 'standard')`,
    ),
    check("achievements_points_check", sql`${table.points} is null or ${table.points} >= 0`),
    check("achievements_position_check", sql`${table.position} >= 0`),
    check("achievements_status_check", sql`${table.status} in ('active', 'archived')`),
    index("achievements_achievement_group_id_idx").on(table.achievementGroupId),
  ],
);
