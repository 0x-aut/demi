import { auth } from "@@/lib/auth";
import { useDb } from "@@/db/index";
import { workspace } from "@@/db/schema/index";
import { eq, and } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers });
  if (!session) throw createError({ statusCode: 401, message: "Unauthorized" });

  const id = getRouterParam(event, "id");
  const db = useDb();

  const [found] = await db
    .select()
    .from(workspace)
    .where(and(eq(workspace.id, id!), eq(workspace.userId, session.user.id)));

  if (!found) throw createError({ statusCode: 404, message: "Workspace not found" });

  return { workspace: found };
});
