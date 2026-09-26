// POST /api/agents
// Adds an agent to the authenticated user's workspace.
// TODO: validate the agent payload and persist to the database.

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { name, description, capabilities = [] } = body as {
    name: string;
    description?: string;
    capabilities?: string[];
  };

  if (!name) {
    throw createError({ statusCode: 400, message: "name is required" });
  }

  // Scaffold — replace with real DB insert
  const agent = {
    id: crypto.randomUUID(),
    name,
    description: description ?? "",
    capabilities,
    addedAt: new Date().toISOString(),
  };

  return { agent };
});
