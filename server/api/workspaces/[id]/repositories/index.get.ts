import { auth } from "@@/lib/auth";
import { useDb } from "@@/db/index";
import { repository } from "@@/db/schema/index";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers });
  if (!session) throw createError({ statusCode: 401, message: "Unauthorized" });

  const workspaceId = event.context.params.id;
  if (!workspaceId) throw createError({ statusCode: 400, message: "workspaceId is required" });

  const db = useDb();

  const repos = await db
    .select()
    .from(repository)
    .where(eq(repository.workspaceId, workspaceId));

  return { repositories: repos };
});
