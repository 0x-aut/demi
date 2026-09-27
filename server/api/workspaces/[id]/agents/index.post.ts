import { auth } from "@@/lib/auth";
import { useDb } from "@@/db/index";
import { workspaceAgent, workspace, type NewWorkspaceAgent } from "@@/db/schema/index";
import { eq, and } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers });
  if (!session) throw createError({ statusCode: 401, message: "Unauthorized" });

  const workspaceId = getRouterParam(event, "id");
  const body = await readBody(event);
  const { agentId, systemPromptOverride, modelOverride, toolsOverride } = body;

  if (!agentId) throw createError({ statusCode: 400, message: "agentId is required" });

  const db = useDb();

  // Verify workspace ownership
  const [ws] = await db
    .select({ id: workspace.id })
    .from(workspace)
    .where(and(eq(workspace.id, workspaceId!), eq(workspace.userId, session.user.id)));

  if (!ws) throw createError({ statusCode: 404, message: "Workspace not found" });

  const newEntry: NewWorkspaceAgent = {
    workspaceId: workspaceId!,
    agentId,
    systemPromptOverride: systemPromptOverride ?? null,
    modelOverride:        modelOverride ?? null,
    toolsOverride:        toolsOverride ?? null,
  };

  const [created] = await db.insert(workspaceAgent).values(newEntry).returning();
  return { workspaceAgent: created };
});
