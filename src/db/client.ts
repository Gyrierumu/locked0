import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getDatabaseEnv } from "@/config/env.server";
import * as schema from "@/db/schema";

function createConnection() {
  const { databaseUrl } = getDatabaseEnv();
  const sql = postgres(databaseUrl, { prepare: false });
  const db = drizzle(sql, { schema });

  return { db, sql };
}

type Connection = ReturnType<typeof createConnection>;

const globalForDatabase = globalThis as typeof globalThis & {
  platifyDatabaseConnection?: Connection;
};

export function getDb(): Connection["db"] {
  globalForDatabase.platifyDatabaseConnection ??= createConnection();
  return globalForDatabase.platifyDatabaseConnection.db;
}
