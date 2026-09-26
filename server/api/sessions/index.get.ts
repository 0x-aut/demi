// GET /api/sessions
// Returns a list of past chat sessions for the authenticated user.
// TODO: persist sessions to the database and query them here.

export default defineEventHandler(async (_event) => {
  // Scaffold — replace with real DB query
  return {
    sessions: [] as Array<{
      id: string;
      title: string;
      createdAt: string;
      updatedAt: string;
    }>,
  };
});
