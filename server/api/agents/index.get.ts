// GET /api/agents
// Returns agents that the authenticated user has added to their workspace.
// TODO: query agents from the database by user ID.

export default defineEventHandler(async (_event) => {
  // Scaffold — replace with real DB query
  return {
    agents: [] as Array<{
      id: string;
      name: string;
      description: string;
      capabilities: string[];
      addedAt: string;
    }>,
  };
});
