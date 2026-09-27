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

type ChatMessage = { role: "user" | "assistant"; content: string };

/** Create a new session (+ its Mongo history doc) or resolve an existing one. */
async function handleSession(opts: {
  sessionId: string | undefined;
  prompt: string;
  userId: string;
  workspaceId: string;
  workspaceAgentId: string | null;
  model: string;
  db: ReturnType<typeof useDb>;
}): Promise<{ activeSessionId: string; mongoHistoryId: string }> {
  const { sessionId, prompt, userId, workspaceId, workspaceAgentId, model, db } = opts;

  if (!sessionId) {
    const historyDoc = await ChatHistory.create({
      sessionId: "pending",
      messages: [],
      totalTokens: 0,
    });

    const title = prompt.slice(0, 60);
    const newSession: NewChatSession = {
      userId,
      workspaceId,
      workspaceAgentId: workspaceAgentId ?? null,
      mongoHistoryId: historyDoc._id.toString(),
      title,
      model,
      totalTokens: 0,
      status: "active",
    };

    const [created] = await db.insert(chatSession).values(newSession).returning();
    const activeSessionId = created.id;
    const mongoHistoryId = historyDoc._id.toString();

    await ChatHistory.updateOne({ _id: historyDoc._id }, { $set: { sessionId: activeSessionId } });
    return { activeSessionId, mongoHistoryId };
  }

  const [existing] = await db
    .select({ mongoHistoryId: chatSession.mongoHistoryId })
    .from(chatSession)
    .where(eq(chatSession.id, sessionId));

  if (!existing) throw createError({ statusCode: 404, message: "Session not found" });
  return { activeSessionId: sessionId, mongoHistoryId: existing.mongoHistoryId };
}

/** Append a message to the chat history and increment the token counter. */
async function appendChatMessage(
  sessionId: string,
  role: "user" | "assistant",
  content: string,
): Promise<void> {
  const tokens = Math.ceil(content.length / 4);
  await ChatHistory.updateOne(
    { sessionId },
    {
      $push: {
        messages: { role, content, tokens, timestamp: new Date(), archived: false },
      },
      $inc: { totalTokens: tokens },
    },
  );
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
  const { activeSessionId } = await handleSession({
    sessionId,
    prompt,
    userId: session.user.id,
    workspaceId,
    workspaceAgentId: workspaceAgentId ?? null,
    model,
    db,
  });

  // ── Persist user message ──────────────────────────────────────────────────
  await appendChatMessage(activeSessionId, "user", prompt);

  // ── Build context from history ────────────────────────────────────────────
  const doc = await ChatHistory.findOne({ sessionId: activeSessionId });
  const contextMessages: ChatMessage[] = (doc?.messages ?? [])
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
  await appendChatMessage(activeSessionId, "assistant", reply);

  await db
    .update(chatSession)
    .set({ lastMessagePreview: reply.slice(0, 120), updatedAt: new Date() })
    .where(eq(chatSession.id, activeSessionId));

  sseEvent(nodeRes, "done", { sessionId: activeSessionId });
  nodeRes.end();
});
