import { Octokit } from "@octokit/rest";
import { auth } from "@@/lib/auth";
import { resolveGithubAccess } from "@@/lib/github-resolver";
import type { H3Event } from "h3";

/**
 * Returns an authenticated Octokit instance for the currently logged-in user.
 * Token resolution order (via resolveGithubAccess):
 *   1. workspace.githubToken (if workspaceId is provided)
 *   2. better-auth account table — token stored when the user signed in with GitHub
 *
 * Throws 401 if no session, 403 if no GitHub token is found.
 */
export async function getOctokit(
  event: H3Event,
  workspaceId?: string,
): Promise<{ octokit: Octokit; userId: string }> {
  const session = await auth.api.getSession({ headers: event.headers });
  if (!session) throw createError({ statusCode: 401, message: "Unauthorized" });

  const token = await resolveGithubAccess(session.user.id, workspaceId ?? null);
  if (!token) {
    throw createError({
      statusCode: 403,
      message:
        "No GitHub token found. Sign in with GitHub or add a token to your workspace.",
    });
  }

  return {
    octokit: new Octokit({ auth: token }),
    userId: session.user.id,
  };
}
