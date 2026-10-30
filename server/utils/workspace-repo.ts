import { Octokit } from "@octokit/rest";
import { useDb } from "@@/db/index";
import { workspace, repository } from "@@/db/schema/index";
import { and, eq } from "drizzle-orm";
import { resolveGithubAccess } from "@@/lib/github-resolver";

export interface RepoContext {
  owner: string;
  repo: string;
  defaultBranch: string;
  octokit: Octokit;
}

export async function resolveWorkspaceRepo(
  userId: string,
  workspaceId: string,
  repositoryId: string,
): Promise<RepoContext> {
  const db = useDb();

  const [ws] = await db
    .select({
      repoUrl: repository.url,
      repoName: repository.name,
      branch: workspace.branch,
    })
    .from(workspace)
    .innerJoin(repository, eq(repository.id, repositoryId))
    .where(and(eq(workspace.id, workspaceId), eq(workspace.userId, userId), eq(repository.id, repositoryId)));

  if (!ws) {
    throw createError({ statusCode: 404, message: "Workspace or repository not found" });
  }

  const match = ws.repoUrl.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/.*)?$/);
  if (!match) {
    throw createError({
      statusCode: 400,
      message: `Cannot parse GitHub owner from repoUrl: ${ws.repoUrl}`,
    });
  }

  const owner = match[1];
  const repo = match[2] ?? ws.repoName;

  const token = await resolveGithubAccess(userId, repositoryId);
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
