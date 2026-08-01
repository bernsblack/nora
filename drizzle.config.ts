import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local", quiet: true });

/**
 * Migrations are generated and committed even though no database exists yet, so
 * that the first Neon branch comes up with the schema rather than with drizzle
 * guessing at it. Generating needs no connection, only pushing does.
 */
export default defineConfig({
  schema: "./src/data/drizzle/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://unset",
  },
  strict: true,
  verbose: true,
});
