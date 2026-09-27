/**
 * Direct schema push — bypasses drizzle-kit entirely.
 * Creates all application tables in `demidb` if they don't exist.
 * Safe to run multiple times (all statements use IF NOT EXISTS).
 *
 * Usage:  node scripts/push-schema.mjs
 */
import { Pool } from "pg";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env manually
try {
  const lines = readFileSync(resolve(__dirname, "../.env"), "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
} catch { /* env already in shell */ }

const base = process.env.CONNECTION_STRING;
if (!base) { console.error("CONNECTION_STRING not set"); process.exit(1); }

const pool = new Pool({
  connectionString: `${base}demidb`,
  ssl: { rejectUnauthorized: false },
});

const statements = [
  // 1. workspace
  `CREATE TABLE IF NOT EXISTS "workspace" (
    "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id"        TEXT NOT NULL,
    "name"           TEXT NOT NULL,
    "repo_name"      TEXT NOT NULL,
    "repo_url"       TEXT NOT NULL,
    "github_token"   TEXT,
    "branch"         TEXT NOT NULL DEFAULT 'main',
    "description"    TEXT,
    "last_synced_at" TIMESTAMPTZ,
    "created_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  // 2. agent_catalog
  `CREATE TABLE IF NOT EXISTS "agent_catalog" (
    "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name"          TEXT NOT NULL UNIQUE,
    "description"   TEXT DEFAULT '',
    "system_prompt" TEXT DEFAULT '',
    "model"         TEXT NOT NULL DEFAULT 'gpt-4o',
    "tools"         JSONB NOT NULL DEFAULT '[]',
    "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  // 3. workspace_agent
  `CREATE TABLE IF NOT EXISTS "workspace_agent" (
    "id"                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "workspace_id"           UUID NOT NULL REFERENCES "workspace"("id") ON DELETE CASCADE,
    "agent_id"               UUID NOT NULL REFERENCES "agent_catalog"("id") ON DELETE CASCADE,
    "system_prompt_override" TEXT,
    "model_override"         TEXT,
    "tools_override"         JSONB,
    "added_at"               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE ("workspace_id", "agent_id")
  )`,

  // 4. chat_session
  `CREATE TABLE IF NOT EXISTS "chat_session" (
    "id"                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id"              TEXT NOT NULL,
    "workspace_id"         UUID NOT NULL REFERENCES "workspace"("id") ON DELETE CASCADE,
    "workspace_agent_id"   UUID REFERENCES "workspace_agent"("id") ON DELETE SET NULL,
    "mongo_history_id"     TEXT NOT NULL,
    "title"                TEXT,
    "model"                TEXT NOT NULL DEFAULT 'gpt-4o',
    "total_tokens"         INTEGER NOT NULL DEFAULT 0,
    "last_message_preview" TEXT,
    "status"               TEXT NOT NULL DEFAULT 'active',
    "created_at"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at"           TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
];

try {
  for (const sql of statements) {
    const tableName = sql.match(/"([^"]+)"/)?.[1] ?? "?";
    await pool.query(sql);
    console.log(`✓ ${tableName}`);
  }
  console.log("\nAll tables are ready in demidb.");
} catch (err) {
  console.error("Migration failed:", err.message);
  process.exit(1);
} finally {
  await pool.end();
}
