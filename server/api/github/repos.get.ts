import { getOctokit } from "@@/server/utils/github";
import { useDb } from "@@/db/index";
import { repository, type NewRepository } from "@@/db/schema/index";
import { eq, and } from "drizzle-orm";

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
  const session = await auth.api.getSession({ headers: event.headers });
  if (!session) throw createError({ statusCode: 401, message: "Unauthorized" });

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

    const db = useDb();

    // Synchronize repositories with database
    for (const repo of data) {
      const [existingRepo] = await db
        .select()
        .from(repository)
        .where(and(eq(repository.repoId, repo.id.toString()), eq(repository.provider, "github")));

      if (!existingRepo) {
        const newRepo: NewRepository = {
          userId: session.user.id,
          provider: "github",
          repoId: repo.id.toString(),
          name: repo.name,
          url: repo.html_url,
          branch: repo.default_branch,
        };
        await db.insert(repository).values(newRepo).returning();
      }
    }

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
