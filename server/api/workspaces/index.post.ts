import { auth } from "@@/lib/auth";
import { useDb } from "@@/db/index";
import { workspace, type NewWorkspace } from "@@/db/schema/index";

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers });
  if (!session) throw createError({ statusCode: 401, message: "Unauthorized" });

  const body = await readBody(event);
  const { name, repoName, repoUrl, branch = "main", description, githubToken } = body;

  if (!name || !repoName || !repoUrl) {
    throw createError({ statusCode: 400, message: "name, repoName, and repoUrl are required" });
  }

  const db = useDb();
  const newWorkspace: NewWorkspace = {
    userId:      session.user.id,
    name,
    repoName,
    repoUrl,
    branch,
    description: description ?? null,
    githubToken: githubToken ?? null,
  };

  const [created] = await db.insert(workspace).values(newWorkspace).returning();
  return { workspace: created };
});
