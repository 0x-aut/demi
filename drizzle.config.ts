import { defineConfig } from "drizzle-kit";
import { readFileSync } from "fs";
import { resolve } from "path";

// Manually load .env so CONNECTION_STRING is available when drizzle-kit runs from the CLI
// (drizzle-kit does not auto-load .env files)
function loadEnv() {
  try {
    const envPath = resolve(process.cwd(), ".env");
    const lines = readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env not found — rely on environment variables already set in shell
  }
}

loadEnv();

const connectionString = process.env.CONNECTION_STRING;
if (!connectionString) {
  throw new Error("CONNECTION_STRING environment variable is not set. Add it to .env or export it in your shell.");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema/index.ts",
  out: "./db/migrations",
  dbCredentials: {
    // Appends "demidb" to the base connection string (which ends in "/").
    // The "demidb" database must exist on the Postgres instance before running push/migrate.
    // Create it with: CREATE DATABASE demidb;
    url: `${connectionString}demidb`,
    ssl: { rejectUnauthorized: false },
  },
});
