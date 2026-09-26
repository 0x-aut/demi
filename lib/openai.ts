import OpenAI from "openai";

let _client: OpenAI | null = null;

/**
 * Returns a singleton OpenAI client.
 * Must be called inside a Nuxt server context (event handler / server util)
 * so that useRuntimeConfig() is available.
 */
export function useOpenAI(): OpenAI {
  if (!_client) {
    const config = useRuntimeConfig();
    _client = new OpenAI({
      apiKey: config.openaiApiKey as string,
    });
  }
  return _client;
}
