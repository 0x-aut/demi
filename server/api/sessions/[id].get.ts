import { auth } from "@@/lib/auth";
import { useDb } from "@@/db/index";
import { chatSession } from "@@/db/schema/index";
import { eq, and } from "drizzle-orm";
import { connectMongo } from "@@/db/mongo";
import { ChatHistory } from "@@/db/models/chatHistory";

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers });
  if (!session) throw createError({ statusCode: 401, message: "Unauthorized" });

  const id = getRouterParam(event, "id");
  const workspaceId = String(getQuery(event).workspaceId ?? "");
  if (!workspaceId) throw createError({ statusCode: 400, message: "workspaceId is required" });
  const db = useDb();

  const [meta] = await db
    .select()
    .from(chatSession)
    .where(and(eq(chatSession.id, id!), eq(chatSession.userId, session.user.id), eq(chatSession.workspaceId, workspaceId)));

  if (!meta) throw createError({ statusCode: 404, message: "Session not found" });

  await connectMongo();
  const history = await ChatHistory.findOne({ sessionId: id });

  return {
    session: meta,
    messages: history?.messages ?? [],
  };
});
