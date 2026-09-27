import { Pool } from "pg";
import { useDb } from "../db/index";
import { workspace } from "../db/schema/index";
import { eq, and } from "drizzle-orm";

/**
 * Resolves the effective GitHub access token for a user + workspace.
 * Preference order:
 *  1. workspace.githubToken (manually stored on the workspace row)
 *  2. better-auth account table — the user's GitHub OAuth accessToken
 */
export async function resolveGithubAccess(
  userId: string,
  workspaceId: string | null,
): Promise<string | null> {
  const db = useDb();

  // 1. Check stored value on workspace row (only when a real workspaceId is given)
  if (workspaceId) {
    const [ws] = await db
      .select({ githubToken: workspace.githubToken })
      .from(workspace)
      .where(and(eq(workspace.id, workspaceId), eq(workspace.userId, userId)));

    if (ws?.githubToken) return ws.githubToken;
  }

  // 2. Fall back to better-auth account table (raw query — better-auth owns this table)
  // better-auth uses the defaultdb database on the same connection string
  const pool = new Pool({
    connectionString: `${process.env.CONNECTION_STRING}defaultdb`,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const result = await pool.query<{ accessToken: string }>(
      `SELECT "accessToken" FROM "account" WHERE "userId" = $1 AND "providerId" = 'github' LIMIT 1`,
      [userId],
    );
    return result.rows[0]?.accessToken ?? null;
  } finally {
    await pool.end();
  }
}
