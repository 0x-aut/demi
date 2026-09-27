import { getOctokit } from "@@/server/utils/github";

/**
 * GET /api/github/content
 * Fetches the decoded text content of a single file in a repository.
 * Called lazily when the user opens a specific file in the file explorer.
 *
 * Required query params:
 *   owner – GitHub owner (user or org)
 *   repo  – repository name
 *   path  – file path within the repo (e.g. "src/index.ts")
 *
 * Optional query params:
 *   branch – branch/tag/SHA (defaults to repo's default branch)
 */
export default defineEventHandler(async (event) => {
  const { octokit } = await getOctokit(event);

  const query = getQuery(event);
  const owner = String(query.owner ?? "");
  const repo = String(query.repo ?? "");
  const path = String(query.path ?? "");

  if (!owner || !repo || !path) {
    throw createError({
      statusCode: 400,
      message: "`owner`, `repo`, and `path` are required",
    });
  }

  const params: Parameters<typeof octokit.repos.getContent>[0] = {
    owner,
    repo,
    path,
  };
  if (query.branch) params.ref = String(query.branch);

  const { data } = await octokit.repos.getContent(params);

  // getContent can return an array (directory listing) — guard against that
  if (Array.isArray(data)) {
    throw createError({
      statusCode: 400,
      message: `"${path}" is a directory, not a file`,
    });
  }

  if (data.type !== "file") {
    throw createError({
      statusCode: 400,
      message: `"${path}" is not a regular file (type: ${data.type})`,
    });
  }

  // Content is base64-encoded by the GitHub API
  const content = Buffer.from(data.content, "base64").toString("utf-8");

  return {
    path: data.path,
    sha: data.sha,
    size: data.size,
    encoding: "utf-8",
    content,
  };
});
