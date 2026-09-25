import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// Locally the database URL comes from .env; in CI it's set in the environment.
if (existsSync(".env")) process.loadEnvFile(".env");

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/index.ts",
  out: "./src/server/db/migrations",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
