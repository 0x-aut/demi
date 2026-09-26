// GET /api/review
// Returns reviews fetched from the connected GitHub repository.
// TODO: accept repo owner/name from query or user config, authenticate via
//       the user's stored GitHub token, and return pull-request reviews or
//       issue comments from the GitHub REST API.

export default defineEventHandler(async (_event) => {
  // Scaffold — replace with real GitHub API call
  return {
    reviews: [] as Array<{
      id: number;
      author: string;
      body: string;
      state: string;
      submittedAt: string;
    }>,
  };
});
