import { auth } from "@@/lib/auth";
import { useDb } from "@@/db/index";
import { chatSession, workspace, repository, type NewChatSession } from "@@/db/schema/index";
import { eq, and } from "drizzle-orm";
import { connectMongo } from "@@/db/mongo";
import { ChatHistory } from "@@/db/models/chatHistory";
import { useOpenAI } from "@@/lib/openai";
import { buildSystemPrompt, extractProposal, stripProposalBlock } from "@@/lib/change-planner/planner";
import { getOctokit } from "@@/server/utils/github";

function sseEvent(res: NodeJS.WritableStream, name: string, data: unknown) {
  const payload = typeof data === "string" ? data : JSON.stringify(data);
  res.write(`event: ${name}\ndata: ${payload}\n\n`);
}

type ChatMessage = { role: "user" | "assistant"; content: string };

async function handleSession(opts: {
  sessionId: string | undefined;
  prompt: string;
  userId: string;
  workspaceId: string;
  repositoryId: string | null;
  workspaceAgentId: string | null;
  model: string;
  db: ReturnType<typeof useDb>;
}): Promise<{ activeSessionId: string; mongoHistoryId: string }> {
  const { sessionId, prompt, userId, workspaceId, repositoryId, workspaceAgentId, model, db } = opts;

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
      repositoryId,
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

async function buildRepoSystemPrompt(
  event: Parameters<typeof getOctokit>[0],
  ws: { repoName: string; githubToken: string | null; branch: string },
): Promise<string | null> {
  try {
    const parts = ws.repoName.split("/");
    const owner = parts[0];
    const repo  = parts[1];
    if (!owner || !repo) return null;

    const { octokit } = await getOctokit(event);

    let branch = ws.branch ?? "main";
    let sha: string;

    try {
      const { data: refData } = await octokit.git.getRef({
        owner, repo, ref: `heads/${branch}`,
      });
      sha = refData.object.sha;
    } catch {
      const { data: repoData } = await octokit.repos.get({ owner, repo });
      branch = repoData.default_branch;
      const { data: refData } = await octokit.git.getRef({
        owner, repo, ref: `heads/${branch}`,
      });
      sha = refData.object.sha;
    }

    const { data: treeData } = await octokit.git.getTree({
      owner, repo, tree_sha: sha, recursive: "1",
    });

    const filePaths = treeData.tree
      .filter((n) => n.type === "blob" && n.path)
      .map((n) => n.path as string);

    return buildSystemPrompt({ owner, repoName: repo, branch, filePaths });
  } catch {
    return null;
  }
}

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers });
  if (!session) throw createError({ statusCode: 401, message: "Unauthorized" });

  const body = await readBody(event);
  const { prompt, sessionId, workspaceId, repositoryId, workspaceAgentId } = body;

  if (!prompt)      throw createError({ statusCode: 400, message: "prompt is required" });
  if (!workspaceId) throw createError({ statusCode: 400, message: "workspaceId is required" });

  const config = useRuntimeConfig();
  const model  = (body.model as string | undefined) ?? (config.openaiModel as string);

  await connectMongo();
  const db     = useDb();
  const openai = useOpenAI();

  const [ws] = await db
    .select({
      repoName:    repository.name,
      githubToken: workspace.githubToken,
      branch:      workspace.branch,
    })
    .from(workspace)
    .innerJoin(repository, eq(repository.id, repositoryId))
    .where(and(eq(workspace.id, workspaceId), eq(workspace.userId, session.user.id)));

  const { activeSessionId } = await handleSession({
    sessionId,
    prompt,
    userId: session.user.id,
    workspaceId,
    repositoryId,
    workspaceAgentId: workspaceAgentId ?? null,
    model,
    db,
  });

  await appendChatMessage(activeSessionId, "user", prompt);

  const doc = await ChatHistory.findOne({ sessionId: activeSessionId });
  const contextMessages: ChatMessage[] = (doc?.messages ?? [])
    .filter((m) => !m.archived && (m.role === "user" || m.role === "assistant"))
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  const systemPromptText = ws
    ? await buildRepoSystemPrompt(event, ws)
    : null;

  const openaiMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    ...(systemPromptText ? [{ role: "system" as const, content: systemPromptText }] : []),
    ...contextMessages,
  ];

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
      messages: openaiMessages,
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

  const proposal = extractProposal(reply);

  if (proposal) proposal.request = prompt;

  const visibleReply = proposal ? stripProposalBlock(reply) : reply;

  if (proposal) sseEvent(nodeRes, "proposal", { proposal });

  await appendChatMessage(activeSessionId, "assistant", visibleReply);

  await db
    .update(chatSession)
    .set({ lastMessagePreview: visibleReply.slice(0, 120), updatedAt: new Date() })
    .where(eq(chatSession.id, activeSessionId));

  sseEvent(nodeRes, "done", { sessionId: activeSessionId });
  nodeRes.end();
});
