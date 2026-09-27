import { Octokit } from "@octokit/rest";
import { useDb } from "@@/db/index";
import { workspace } from "@@/db/schema/index";
import { and, eq } from "drizzle-orm";
import { resolveGithubAccess } from "@@/lib/github-resolver";

export interface RepoContext {
  owner: string;
  repo: string;
  defaultBranch: string;
  octokit: Octokit;
}

/**
 * Given an authenticated userId and workspaceId, resolves the GitHub repository
 * context (owner, repo name, default branch) and returns an authenticated Octokit.
 *
 * Owner is parsed from workspace.repoUrl (e.g. "https://github.com/owner/repo").
 * Default branch comes from workspace.branch (set at creation time).
 *
 * Throws 404 if the workspace is not found, 403 if no GitHub token is available.
 */
export async function resolveWorkspaceRepo(
  userId: string,
  workspaceId: string,
): Promise<RepoContext> {
  const db = useDb();

  const [ws] = await db
    .select({
      repoUrl: workspace.repoUrl,
      repoName: workspace.repoName,
      branch: workspace.branch,
    })
    .from(workspace)
    .where(and(eq(workspace.id, workspaceId), eq(workspace.userId, userId)));

  if (!ws) {
    throw createError({ statusCode: 404, message: "Workspace not found" });
  }

  // Parse owner from URL: https://github.com/{owner}/{repo}
  const match = ws.repoUrl.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/.*)?$/);
  if (!match) {
    throw createError({
      statusCode: 400,
      message: `Cannot parse GitHub owner from repoUrl: ${ws.repoUrl}`,
    });
  }

  const owner = match[1];
  const repo = match[2] ?? ws.repoName;

  const token = await resolveGithubAccess(userId, workspaceId);
  if (!token) {
    throw createError({
      statusCode: 403,
      message: "No GitHub token found. Sign in with GitHub or add a token to your workspace.",
    });
  }

  return {
    owner,
    repo,
    defaultBranch: ws.branch,
    octokit: new Octokit({ auth: token }),
  };
}
