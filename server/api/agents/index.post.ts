import { auth } from "@@/lib/auth";
import { useDb } from "@@/db/index";
import { agentCatalog, type NewAgentCatalog } from "@@/db/schema/index";

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers });
  if (!session) throw createError({ statusCode: 401, message: "Unauthorized" });

  const body = await readBody(event);
  const { name, description, systemPrompt, model = "gpt-4o", tools = [] } = body;

  if (!name) throw createError({ statusCode: 400, message: "name is required" });

  const db = useDb();
  const newAgent: NewAgentCatalog = { name, description, systemPrompt, model, tools };
  const [created] = await db.insert(agentCatalog).values(newAgent).returning();

  return { agent: created };
});
