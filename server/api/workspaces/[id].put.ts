import { auth } from "@@/lib/auth";
import { useDb } from "@@/db/index";
import { workspace } from "@@/db/schema/index";
import { eq, and } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers });
  if (!session) throw createError({ statusCode: 401, message: "Unauthorized" });

  const id = getRouterParam(event, "id");
  const body = await readBody(event);

  const allowedFields = ["name", "repoName", "repoUrl", "branch", "description", "githubToken", "lastSyncedAt"] as const;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const field of allowedFields) {
    if (body[field] !== undefined) updates[field] = body[field];
  }

  const db = useDb();
  const [updated] = await db
    .update(workspace)
    .set(updates)
    .where(and(eq(workspace.id, id!), eq(workspace.userId, session.user.id)))
    .returning();

  if (!updated) throw createError({ statusCode: 404, message: "Workspace not found" });

  return { workspace: updated };
});
