import "dotenv/config";

import { defineConfig } from "drizzle-kit";
import { z } from "zod";

const databaseUrl = z.string().min(1).parse(process.env.DATABASE_URL);

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url: databaseUrl,
  },
  strict: true,
  verbose: true,
});
