import { sql } from "drizzle-orm";
import { authUsers } from "drizzle-orm/supabase";
import { bigint, check, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { games } from "./catalog";

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    scopeGameId: uuid("scope_game_id").references(() => games.id, { onDelete: "restrict" }),
    storagePath: text("storage_path").notNull().unique(),
    originalFilename: text("original_filename").notNull(),
    mimeType: text("mime_type").notNull(),
    byteSize: bigint("byte_size", { mode: "number" }).notNull(),
    width: integer("width"),
    height: integer("height"),
    checksumSha256: text("checksum_sha256"),
    sourceUrl: text("source_url"),
    credit: text("credit"),
    createdBy: uuid("created_by").references(() => authUsers.id, { onDelete: "set null" }),
    firstPublishedAt: timestamp("first_published_at", { withTimezone: true }),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check("media_assets_byte_size_check", sql`${table.byteSize} > 0`),
    check("media_assets_width_check", sql`${table.width} is null or ${table.width} > 0`),
    check("media_assets_height_check", sql`${table.height} is null or ${table.height} > 0`),
    index("media_assets_scope_game_id_idx").on(table.scopeGameId),
  ],
);
