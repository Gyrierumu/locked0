import { drizzle } from "drizzle-orm/postgres-js";
import { describe, expect, it, vi } from "vitest";

import * as schema from "@/db/schema";

vi.mock("server-only", () => ({}));

import { createDrizzleMediaRepository } from "./drizzle-media-repository";

describe("drizzle media repository Supavisor compatibility", () => {
  it("binds a parameter in every unfiltered list query to prevent pipelining", async () => {
    // WHY: postgres.js + Supavisor transaction-mode pipeline compatibility workaround.
    const calls: Array<Readonly<{ query: string; params: unknown[] }>> = [];
    const client = {
      options: { parsers: {}, serializers: {} },
      unsafe: vi.fn((query: string, params: unknown[]) => {
        calls.push({ query, params });
        return { values: async () => (query.includes("count(*)") ? [["0"]] : []) };
      }),
    };
    const database = drizzle(client as never, { schema });
    const repository = createDrizzleMediaRepository(database);

    await Promise.all([
      repository.listAssets({ q: "", gameId: null, status: "active", page: 1, pageSize: 24 }),
      repository.listScopeGames(),
    ]);

    expect(calls).toHaveLength(3);
    expect(calls.every(({ params }) => params.length > 0)).toBe(true);
    expect(calls.every(({ query }) => /where\s+\(?\$1/.test(query))).toBe(true);
  });
});
