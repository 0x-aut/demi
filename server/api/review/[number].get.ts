import { auth } from "@@/lib/auth";
import { resolveWorkspaceRepo } from "@@/server/utils/workspace-repo";

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers });
  if (!session) throw createError({ statusCode: 401, message: "Unauthorized" });
  const workspaceId = String(getQuery(event).workspaceId ?? "");
  const number = Number(getRouterParam(event, "number"));
  if (!workspaceId || !Number.isInteger(number)) throw createError({ statusCode: 400, message: "workspaceId and valid PR number are required" });
  const { owner, repo, octokit } = await resolveWorkspaceRepo(session.user.id, workspaceId);
  try {
    const { data } = await octokit.pulls.get({ owner, repo, pull_number: number });
    return { pullRequest: {
      number: data.number, title: data.title, body: data.body ?? "", url: data.html_url, state: data.state,
      merged: Boolean(data.merged_at), draft: Boolean(data.draft), author: data.user?.login ?? "unknown",
      branch: data.head.ref, targetBranch: data.base.ref, createdAt: data.created_at, updatedAt: data.updated_at,
      mergedAt: data.merged_at, filesChanged: data.changed_files, additions: data.additions, deletions: data.deletions, commits: data.commits,
    }};
  } catch (error: any) {
    if (error?.status === 404) throw createError({ statusCode: 404, message: "Pull request not found" });
    throw error;
  }
});