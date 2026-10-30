import { auth } from "@@/lib/auth";
import { useDb } from "@@/db/index";
import { workspace, repository, type NewWorkspace, type NewRepository } from "@@/db/schema/index";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers });
  if (!session) throw createError({ statusCode: 401, message: "Unauthorized" });

  const body = await readBody(event);
  const { name, repoName, repoUrl, repoProvider, repoId, branch = "main", description, githubToken } = body;

  if (!name || !repoName || !repoUrl || !repoProvider || !repoId) {
    throw createError({ statusCode: 400, message: "name, repoName, repoUrl, repoProvider, and repoId are required" });
  }

  const db = useDb();

  // Ensure repository exists or create a new one
  const [existingRepo] = await db
    .select()
    .from(repository)
    .where(and(eq(repository.repoId, repoId), eq(repository.provider, repoProvider)));

  let repositoryId = existingRepo?.id ?? null;

  if (!existingRepo) {
    const newRepo: NewRepository = {
      userId: session.user.id,
      provider: repoProvider,
      repoId: repoId,
      name: repoName,
      url: repoUrl,
      branch: branch,
    };
    const [createdRepo] = await db.insert(repository).values(newRepo).returning();
    repositoryId = createdRepo.id;
  }

  // Create a new workspace
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

  return { workspace: created, repositoryId };
});
