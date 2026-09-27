import { auth } from "@@/lib/auth";
import { useDb } from "@@/db/index";
import { chatSession, type NewChatSession } from "@@/db/schema/index";
import { eq } from "drizzle-orm";
import { connectMongo } from "@@/db/mongo";
import { ChatHistory } from "@@/db/models/chatHistory";
import { useOpenAI } from "@@/lib/openai";

/** Write a single SSE event to the raw Node response. */
function sseEvent(res: NodeJS.WritableStream, name: string, data: unknown) {
  const payload = typeof data === "string" ? data : JSON.stringify(data);
  res.write(`event: ${name}\ndata: ${payload}\n\n`);
}

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers });
  if (!session) throw createError({ statusCode: 401, message: "Unauthorized" });

  const body = await readBody(event);
  const { prompt, sessionId, workspaceId, workspaceAgentId } = body;

  if (!prompt)      throw createError({ statusCode: 400, message: "prompt is required" });
  if (!workspaceId) throw createError({ statusCode: 400, message: "workspaceId is required" });

  const config = useRuntimeConfig();
  const model  = (body.model as string | undefined) ?? (config.openaiModel as string);

  await connectMongo();
  const db     = useDb();
  const openai = useOpenAI();

  // ── Session bookkeeping ───────────────────────────────────────────────────
  let activeSessionId: string = sessionId;
  let mongoHistoryId: string;

  if (!activeSessionId) {
    const historyDoc = await ChatHistory.create({
      sessionId: "pending",
      messages:  [],
      totalTokens: 0,
    });

    const title = (prompt as string).slice(0, 60);
    const newSession: NewChatSession = {
      userId:           session.user.id,
      workspaceId,
      workspaceAgentId: workspaceAgentId ?? null,
      mongoHistoryId:   historyDoc._id.toString(),
      title,
      model,
      totalTokens:      0,
      status:           "active",
    };

    const [created] = await db.insert(chatSession).values(newSession).returning();
    activeSessionId = created.id;
    mongoHistoryId  = historyDoc._id.toString();

    await ChatHistory.updateOne({ _id: historyDoc._id }, { $set: { sessionId: activeSessionId } });
  } else {
    const [existing] = await db
      .select({ mongoHistoryId: chatSession.mongoHistoryId })
      .from(chatSession)
      .where(eq(chatSession.id, activeSessionId));

    if (!existing) throw createError({ statusCode: 404, message: "Session not found" });
    mongoHistoryId = existing.mongoHistoryId;
  }

  // ── Persist user message ──────────────────────────────────────────────────
  const userTokenEstimate = Math.ceil((prompt as string).length / 4);
  await ChatHistory.updateOne(
    { sessionId: activeSessionId },
    {
      $push: {
        messages: {
          role:      "user",
          content:   prompt,
          tokens:    userTokenEstimate,
          timestamp: new Date(),
          archived:  false,
        },
      },
      $inc: { totalTokens: userTokenEstimate },
    },
  );

  // ── Build context from history ────────────────────────────────────────────
  const doc = await ChatHistory.findOne({ sessionId: activeSessionId });
  const contextMessages = (doc?.messages ?? [])
    .filter((m) => !m.archived && (m.role === "user" || m.role === "assistant"))
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  // ── Open SSE stream to client ─────────────────────────────────────────────
  const nodeRes = event.node.res;
  nodeRes.setHeader("Content-Type", "text/event-stream");
  nodeRes.setHeader("Cache-Control", "no-cache");
  nodeRes.setHeader("Connection", "keep-alive");
  nodeRes.flushHeaders();

  sseEvent(nodeRes, "session", { sessionId: activeSessionId });

  let reply = "";

  try {
    const stream = await openai.chat.completions.create({
      model,
      messages: contextMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? "";
      if (delta) {
        reply += delta;
        sseEvent(nodeRes, "delta", { content: delta });
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "OpenAI request failed.";
    sseEvent(nodeRes, "error", { message: msg });
    nodeRes.end();
    return;
  }

  // ── Persist assistant reply ───────────────────────────────────────────────
  const replyTokens = Math.ceil(reply.length / 4);
  await ChatHistory.updateOne(
    { sessionId: activeSessionId },
    {
      $push: {
        messages: {
          role:      "assistant",
          content:   reply,
          tokens:    replyTokens,
          timestamp: new Date(),
          archived:  false,
        },
      },
      $inc: { totalTokens: replyTokens },
    },
  );

  await db
    .update(chatSession)
    .set({ lastMessagePreview: reply.slice(0, 120), updatedAt: new Date() })
    .where(eq(chatSession.id, activeSessionId));

  sseEvent(nodeRes, "done", { sessionId: activeSessionId });
  nodeRes.end();
});
