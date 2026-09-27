import { useOpenAI } from "./openai";
import { connectMongo } from "../db/mongo";
import { ChatHistory } from "../db/models/chatHistory";

/** Token count below which the full history is returned as-is. */
const TOKEN_THRESHOLD = 6000;

/** Number of most-recent messages to keep in the active window after summarisation. */
const WINDOW_SIZE = 20;

export interface ContextMessage {
  role:    "user" | "assistant" | "system";
  content: string;
}

/**
 * Builds the message array to send to OpenAI for a given session.
 *
 * Hybrid context strategy:
 *  - Below TOKEN_THRESHOLD: returns all non-archived messages in order.
 *  - At or above TOKEN_THRESHOLD: generates a rolling summary via OpenAI,
 *    stores it as a `summary`-role message in MongoDB, marks older messages
 *    as `archived: true`, then returns [summary-as-system, ...last WINDOW_SIZE messages].
 *
 * The `summary` role is stored in MongoDB but mapped to `system` when sent to OpenAI.
 */
export async function buildContextMessages(
  sessionId: string,
  tokenThreshold = TOKEN_THRESHOLD,
): Promise<ContextMessage[]> {
  await connectMongo();

  const doc = await ChatHistory.findOne({ sessionId });
  if (!doc || doc.messages.length === 0) return [];

  const active = doc.messages.filter((m) => !m.archived);
  const totalTokens = active.reduce((sum, m) => sum + (m.tokens ?? 0), 0);

  if (totalTokens < tokenThreshold) {
    // Full history path — map summary role → system for OpenAI
    return active.map((m) => ({
      role:    m.role === "summary" ? "system" : (m.role as ContextMessage["role"]),
      content: m.content,
    }));
  }

  // Rolling window path
  // Find the last existing summary so we only summarise messages after it
  const lastSummaryIdx = [...doc.messages]
    .reverse()
    .findIndex((m) => m.role === "summary" && !m.archived);

  const messagesForSummary =
    lastSummaryIdx === -1
      ? active.filter((m) => m.role !== "summary")
      : active.slice(0, active.length - lastSummaryIdx - 1).filter((m) => m.role !== "summary");

  const recentWindow = active.slice(-WINDOW_SIZE);

  // Generate summary via OpenAI
  const openai = useOpenAI();
  const summaryResponse = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role:    "system",
        content: "Summarise the following conversation concisely, preserving all important context, decisions, and facts.",
      },
      ...messagesForSummary
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    ],
  });

  const summaryText = summaryResponse.choices[0]?.message?.content ?? "";

  // Persist summary + archive old messages
  // Mark all messages before the recent window as archived
  const windowStartIdx = doc.messages.length - WINDOW_SIZE;
  for (let i = 0; i < doc.messages.length; i++) {
    if (i < windowStartIdx) {
      doc.messages[i].archived = true;
    }
  }

  // Push summary message at the front of the active window
  doc.messages.push({
    role:      "summary",
    content:   summaryText,
    tokens:    summaryResponse.usage?.total_tokens ?? 0,
    timestamp: new Date(),
    archived:  false,
  });

  await doc.save();

  return [
    { role: "system", content: summaryText },
    ...recentWindow
      .filter((m) => m.role !== "summary")
      .map((m) => ({
        role:    m.role as ContextMessage["role"],
        content: m.content,
      })),
  ];
}
