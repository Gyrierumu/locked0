import { sql } from "drizzle-orm";

// Keep vulnerable list queries parameterized: postgres.js can pipeline parameterless
// queries against Supavisor transaction mode and leave later responses pending.
export function supavisorPipelineGuard() {
  return sql`${true}`;
}
