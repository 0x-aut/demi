import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema/index";

let _db: ReturnType<typeof drizzle> | null = null;

export function useDb() {
  if (!_db) {
    const pool = new Pool({
      connectionString: `${process.env.CONNECTION_STRING}demidb`,
      ssl: { rejectUnauthorized: false },
    });
    _db = drizzle(pool, { schema });
  }
  return _db;
}
