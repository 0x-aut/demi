import { auth } from "@@/lib/auth";
import { useDb } from "@@/db/index";
import { workspace } from "@@/db/schema/index";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers });
  if (!session) throw createError({ statusCode: 401, message: "Unauthorized" });

  const db = useDb();
  const workspaces = await db
    .select()
    .from(workspace)
    .where(eq(workspace.userId, session.user.id));

  return { workspaces };
});
