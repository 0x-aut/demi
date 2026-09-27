import { auth } from "@@/lib/auth";
import { useDb } from "@@/db/index";
import { workspaceAgent, agentCatalog, workspace } from "@@/db/schema/index";
import { eq, and } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers });
  if (!session) throw createError({ statusCode: 401, message: "Unauthorized" });

  const workspaceId = getRouterParam(event, "id");
  const db = useDb();

  // Verify the workspace belongs to this user
  const [ws] = await db
    .select({ id: workspace.id })
    .from(workspace)
    .where(and(eq(workspace.id, workspaceId!), eq(workspace.userId, session.user.id)));

  if (!ws) throw createError({ statusCode: 404, message: "Workspace not found" });

  // Join workspace_agent with agent_catalog
  const agents = await db
    .select({
      id:                   workspaceAgent.id,
      agentId:              workspaceAgent.agentId,
      addedAt:              workspaceAgent.addedAt,
      systemPromptOverride: workspaceAgent.systemPromptOverride,
      modelOverride:        workspaceAgent.modelOverride,
      toolsOverride:        workspaceAgent.toolsOverride,
      name:                 agentCatalog.name,
      description:          agentCatalog.description,
      systemPrompt:         agentCatalog.systemPrompt,
      model:                agentCatalog.model,
      tools:                agentCatalog.tools,
    })
    .from(workspaceAgent)
    .innerJoin(agentCatalog, eq(workspaceAgent.agentId, agentCatalog.id))
    .where(eq(workspaceAgent.workspaceId, workspaceId!));

  return { agents };
});
