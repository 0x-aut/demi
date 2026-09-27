import { auth } from "@@/lib/auth";
import { useDb } from "@@/db/index";
import { chatSession } from "@@/db/schema/index";
import { eq, and, desc } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers });
  if (!session) throw createError({ statusCode: 401, message: "Unauthorized" });

  const query  = getQuery(event);
  const db     = useDb();

  const conditions = [eq(chatSession.userId, session.user.id)];
  if (query.workspaceId) {
    conditions.push(eq(chatSession.workspaceId, query.workspaceId as string));
  }

  const sessions = await db
    .select()
    .from(chatSession)
    .where(and(...conditions))
    .orderBy(desc(chatSession.updatedAt));

  return { sessions };
});
