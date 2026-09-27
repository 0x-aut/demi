import { auth } from "@@/lib/auth";
import { useDb } from "@@/db/index";
import { workspace } from "@@/db/schema/index";
import { eq, and } from "drizzle-orm";
import { resolveGithubAccess } from "@@/lib/github-resolver";

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers });
  if (!session) throw createError({ statusCode: 401, message: "Unauthorized" });

  const query = getQuery(event);
  const workspaceId = query.workspaceId as string;

  if (!workspaceId) throw createError({ statusCode: 400, message: "workspaceId is required" });

  const db = useDb();
  const [ws] = await db
    .select({ repoName: workspace.repoName, repoUrl: workspace.repoUrl })
    .from(workspace)
    .where(and(eq(workspace.id, workspaceId), eq(workspace.userId, session.user.id)));

  if (!ws) throw createError({ statusCode: 404, message: "Workspace not found" });

  const ghToken = await resolveGithubAccess(session.user.id, workspaceId);
  if (!ghToken) throw createError({ statusCode: 422, message: "No GitHub token available for this workspace" });

  // Parse owner/repo from repoUrl or repoName (format: "owner/repo")
  const [owner, repo] = ws.repoName.includes("/")
    ? ws.repoName.split("/")
    : ws.repoUrl.replace("https://github.com/", "").split("/");

  const headers: HeadersInit = {
    Authorization: `Bearer ${ghToken}`,
    Accept:        "application/vnd.github+json",
    "X-GitHub-API-Version": "2022-11-28",
  };

  // Fetch open pull requests
  const prsRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls?state=open&per_page=20`,
    { headers },
  );
  if (!prsRes.ok) {
    throw createError({ statusCode: 502, message: `GitHub API error: ${prsRes.statusText}` });
  }
  const prs: Array<{ number: number }> = await prsRes.json();

  // Fetch reviews for each PR (cap at 5 PRs to avoid rate-limit issues)
  const reviews: Array<{
    id: number;
    author: string;
    body: string;
    state: string;
    submittedAt: string;
    prNumber: number;
  }> = [];

  for (const pr of prs.slice(0, 5)) {
    const revRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${pr.number}/reviews`,
      { headers },
    );
    if (!revRes.ok) continue;
    const prReviews: Array<{
      id: number;
      user: { login: string };
      body: string;
      state: string;
      submitted_at: string;
    }> = await revRes.json();

    for (const r of prReviews) {
      reviews.push({
        id:          r.id,
        author:      r.user?.login ?? "unknown",
        body:        r.body ?? "",
        state:       r.state,
        submittedAt: r.submitted_at,
        prNumber:    pr.number,
      });
    }
  }

  return { reviews };
});
