import { auth } from "@@/lib/auth";
import { resolveWorkspaceRepo } from "@@/server/utils/workspace-repo";

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers });
  if (!session) throw createError({ statusCode: 401, message: "Unauthorized" });
  const query = getQuery(event);
  const workspaceId = String(query.workspaceId ?? "");
  const path = String(query.path ?? "");
  if (!workspaceId || !path) throw createError({ statusCode: 400, message: "workspaceId and path are required" });
  const { owner, repo, defaultBranch, octokit } = await resolveWorkspaceRepo(session.user.id, workspaceId);
  const params: Parameters<typeof octokit.repos.getContent>[0] = { owner, repo, path, ref: String(query.branch ?? defaultBranch) };
  const { data } = await octokit.repos.getContent(params);
  if (Array.isArray(data) || data.type !== "file") throw createError({ statusCode: 400, message: "Path is not a file" });
  return { path: data.path, size: data.size, sha: data.sha, content: Buffer.from(data.content, "base64").toString("utf-8") };
});