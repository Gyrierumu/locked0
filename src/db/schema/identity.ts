import { sql } from "drizzle-orm";
import { authUsers } from "drizzle-orm/supabase";
import { check, pgTable, primaryKey, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

export const profiles = pgTable(
  "profiles",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    username: text("username").notNull(),
    displayName: text("display_name"),
    avatarPath: text("avatar_path"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("profiles_username_unique").on(table.username),
    check("profiles_username_lowercase_check", sql`${table.username} = lower(${table.username})`),
    check("profiles_username_format_check", sql`${table.username} ~ '^[a-z0-9_]{3,30}$'`),
  ],
);

export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
  },
  (table) => [
    primaryKey({ name: "user_roles_pk", columns: [table.userId, table.role] }),
    check("user_roles_role_check", sql`${table.role} in ('author', 'editor', 'admin')`),
  ],
);
