import { auth } from "@@/lib/auth";
import { resolveWorkspaceRepo } from "@@/server/utils/workspace-repo";

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers });
  if (!session) throw createError({ statusCode: 401, message: "Unauthorized" });

  const workspaceId = String(getQuery(event).workspaceId ?? "");
  if (!workspaceId) throw createError({ statusCode: 400, message: "workspaceId is required" });

  const { owner, repo, octokit } = await resolveWorkspaceRepo(session.user.id, workspaceId);

  const { data } = await octokit.pulls.list({
    owner,
    repo,
    state: "all",
    sort: "updated",
    direction: "desc",
    per_page: 30,
  });

  return {
    pullRequests: data.map((pr) => ({
      id: String(pr.id),
      number: pr.number,
      title: pr.title,
      author: pr.user?.login ?? "unknown",
      branch: pr.head.ref,
      targetBranch: pr.base.ref,
      status: pr.merged_at ? "merged" : pr.draft ? "draft" : pr.state,
      reviewRequested: (pr.requested_reviewers?.length ?? 0) > 0,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      commentsCount: pr.comments ?? 0,
      filesChanged: pr.changed_files ?? 0,
      url: pr.html_url,
    })),
  };
});