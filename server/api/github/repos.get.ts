import { getOctokit } from "@@/server/utils/github";

/**
 * GET /api/github/repos
 * Returns the authenticated user's GitHub repositories (owned + member of),
 * sorted by most recently pushed.
 *
 * Query params:
 *   page   – page number (default 1)
 *   per_page – results per page (default 30, max 100)
 */
export default defineEventHandler(async (event) => {
  const { octokit } = await getOctokit(event);

  const query = getQuery(event);
  const page = Number(query.page ?? 1);
  const perPage = Math.min(Number(query.per_page ?? 30), 100);

  try {
    const { data } = await octokit.repos.listForAuthenticatedUser({
      sort: "pushed",
      direction: "desc",
      per_page: perPage,
      page,
    });

    return {
      repos: data.map((r) => ({
        id: r.id,
        name: r.name,
        fullName: r.full_name,
        description: r.description ?? null,
        url: r.html_url,
        private: r.private,
        defaultBranch: r.default_branch,
        updatedAt: r.pushed_at ?? r.updated_at,
      })),
    };
  } catch (error: any) {
    if (error?.status === 401) {
      throw createError({
        statusCode: 401,
        message: "GitHub connection expired. Please reconnect GitHub.",
      });
    }

    throw error;
  }
});
