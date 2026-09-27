import { auth } from "@@/lib/auth";
import { useDb } from "@@/db/index";
import { workspaceAgent, workspace } from "@@/db/schema/index";
import { eq, and } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers });
  if (!session) throw createError({ statusCode: 401, message: "Unauthorized" });

  const workspaceId = getRouterParam(event, "id");
  const agentId     = getRouterParam(event, "agentId");
  const body        = await readBody(event);

  const db = useDb();

  // Verify workspace ownership
  const [ws] = await db
    .select({ id: workspace.id })
    .from(workspace)
    .where(and(eq(workspace.id, workspaceId!), eq(workspace.userId, session.user.id)));

  if (!ws) throw createError({ statusCode: 404, message: "Workspace not found" });

  const updates: Record<string, unknown> = {};
  if (body.systemPromptOverride !== undefined) updates.systemPromptOverride = body.systemPromptOverride;
  if (body.modelOverride        !== undefined) updates.modelOverride        = body.modelOverride;
  if (body.toolsOverride        !== undefined) updates.toolsOverride        = body.toolsOverride;

  const [updated] = await db
    .update(workspaceAgent)
    .set(updates)
    .where(and(eq(workspaceAgent.id, agentId!), eq(workspaceAgent.workspaceId, workspaceId!)))
    .returning();

  if (!updated) throw createError({ statusCode: 404, message: "Workspace agent not found" });

  return { workspaceAgent: updated };
});
