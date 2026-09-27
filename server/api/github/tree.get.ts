import { getOctokit } from "@@/server/utils/github";

/**
 * GET /api/github/tree
 * Returns the full recursive file/folder tree for a repository.
 *
 * Required query params:
 *   owner  – GitHub owner (user or org)
 *   repo   – repository name
 *
 * Optional query params:
 *   branch – branch/tag/SHA to read from (defaults to repo's default branch)
 */
export default defineEventHandler(async (event) => {
  const { octokit } = await getOctokit(event);

  const query = getQuery(event);
  const owner = String(query.owner ?? "");
  const repo = String(query.repo ?? "");

  if (!owner || !repo) {
    throw createError({ statusCode: 400, message: "`owner` and `repo` are required" });
  }

  // Resolve the branch to a SHA so the tree call is unambiguous
  let branch = String(query.branch ?? "");
  if (!branch) {
    const { data: repoData } = await octokit.repos.get({ owner, repo });
    branch = repoData.default_branch;
  }

  const { data: refData } = await octokit.git.getRef({
    owner,
    repo,
    ref: `heads/${branch}`,
  });
  const sha = refData.object.sha;

  const { data: treeData } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: sha,
    recursive: "1",
  });

  if (treeData.truncated) {
    // For very large repos the API truncates; surface this so the UI can warn
    setResponseHeader(event, "X-Tree-Truncated", "true");
  }

  return {
    branch,
    sha,
    tree: treeData.tree.map((node) => ({
      path: node.path,
      type: node.type, // "blob" | "tree"
      size: node.size ?? null,
      sha: node.sha,
    })),
  };
});
