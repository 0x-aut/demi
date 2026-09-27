import { auth } from "@@/lib/auth";
import { useDb } from "@@/db/index";
import { workspaceAgent, workspace } from "@@/db/schema/index";
import { eq, and } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers });
  if (!session) throw createError({ statusCode: 401, message: "Unauthorized" });

  const workspaceId = getRouterParam(event, "id");
  const agentId     = getRouterParam(event, "agentId");

  const db = useDb();

  // Verify workspace ownership
  const [ws] = await db
    .select({ id: workspace.id })
    .from(workspace)
    .where(and(eq(workspace.id, workspaceId!), eq(workspace.userId, session.user.id)));

  if (!ws) throw createError({ statusCode: 404, message: "Workspace not found" });

  const [deleted] = await db
    .delete(workspaceAgent)
    .where(and(eq(workspaceAgent.id, agentId!), eq(workspaceAgent.workspaceId, workspaceId!)))
    .returning();

  if (!deleted) throw createError({ statusCode: 404, message: "Workspace agent not found" });

  return { success: true };
});
