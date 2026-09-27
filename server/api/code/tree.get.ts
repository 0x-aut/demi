import { auth } from "@@/lib/auth";
import { resolveWorkspaceRepo } from "@@/server/utils/workspace-repo";

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers });
  if (!session) throw createError({ statusCode: 401, message: "Unauthorized" });
  const workspaceId = String(getQuery(event).workspaceId ?? "");
  if (!workspaceId) throw createError({ statusCode: 400, message: "workspaceId is required" });
  const { owner, repo, defaultBranch, octokit } = await resolveWorkspaceRepo(session.user.id, workspaceId);
  const branch = String(getQuery(event).branch ?? defaultBranch);
  const { data: ref } = await octokit.git.getRef({ owner, repo, ref: `heads/${branch}` });
  const { data } = await octokit.git.getTree({ owner, repo, tree_sha: ref.object.sha, recursive: "1" });
  return { branch, sha: ref.object.sha, truncated: data.truncated, tree: data.tree.map(node => ({ path: node.path, type: node.type, size: node.size ?? null, sha: node.sha })) };
});