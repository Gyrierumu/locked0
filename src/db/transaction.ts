import "server-only";

import { getDb } from "@/db/client";

type Database = ReturnType<typeof getDb>;
export type DatabaseTransaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export function inTransaction<T>(
  operation: (transaction: DatabaseTransaction) => Promise<T>,
): Promise<T> {
  return getDb().transaction(operation);
}
