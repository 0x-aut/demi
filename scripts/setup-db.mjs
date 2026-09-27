/**
 * Run once to create the `demidb` database and push all Drizzle schema tables.
 * Usage:  node scripts/setup-db.mjs
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
if (!base) {
  console.error("ERROR: CONNECTION_STRING not set");
  process.exit(1);
}

// Connect to the default `defaultdb` to create `demidb`
const adminPool = new Pool({
  connectionString: `${base}defaultdb`,
  ssl: { rejectUnauthorized: false },
});

try {
  const { rows } = await adminPool.query(
    `SELECT 1 FROM pg_database WHERE datname = 'demidb'`
  );
  if (rows.length === 0) {
    await adminPool.query(`CREATE DATABASE demidb`);
    console.log("✓ Created database: demidb");
  } else {
    console.log("✓ Database demidb already exists");
  }
} finally {
  await adminPool.end();
}

console.log("\nNow run:  pnpm db:push\n");
