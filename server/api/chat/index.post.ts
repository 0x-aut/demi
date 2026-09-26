import { useOpenAI } from "@@/lib/openai";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { prompt, model = "gpt-4o", sessionId } = body as {
    prompt: string;
    model?: string;
    sessionId?: string;
  };

  if (!prompt) {
    throw createError({ statusCode: 400, message: "prompt is required" });
  }

  const openai = useOpenAI();

  const response = await openai.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
  });

  const reply = response.choices[0]?.message?.content ?? "";

  return {
    sessionId,
    reply,
    model,
    usage: response.usage,
  };
});
