import { ref, computed } from "vue"

export type ChangeAction = "create" | "modify" | "delete"

export interface ChangeFileEntry {
  path: string
  action: ChangeAction
  explanation: string
  symbols?: string[]
}

export interface ChangeProposal {
  summary: string
  reason: string
  files: ChangeFileEntry[]
  request?: string
}

export interface ChatMessage {
  id: number
  role: "user" | "assistant"
  content: string
  /** Present when the assistant produced a structured change proposal */
  proposal?: ChangeProposal
}

export interface UseChatOptions {
  workspaceId: string
  workspaceAgentId?: string
}

export function useChat(opts: UseChatOptions) {
  const messages    = ref<ChatMessage[]>([])
  const isLoading   = ref(false)
  const requestError = ref("")
  const sessionId   = ref<string | null>(null)

  const hasMessages = computed(() => messages.value.length > 0)

  // ── Internal helpers ────────────────────────────────────────────────────

  let abortController: AbortController | null = null

  /** Append a delta chunk to the last assistant message (or create it). */
  function appendDelta(assistantId: { value: number | null }, delta: string) {
    if (!delta) return
    if (assistantId.value === null) {
      assistantId.value = Date.now() + 1
      messages.value.push({ id: assistantId.value, role: "assistant", content: delta })
      return
    }
    const msg = messages.value.find((m) => m.id === assistantId.value)
    if (msg) msg.content += delta
  }

  /** Attach a parsed proposal to the last assistant message. */
  function attachProposal(assistantId: { value: number | null }, proposal: ChangeProposal) {
    if (assistantId.value === null) return
    const msg = messages.value.find((m) => m.id === assistantId.value)
    if (msg) msg.proposal = proposal
  }

  // ── Public API ──────────────────────────────────────────────────────────

  async function sendMessage(prompt: string, model?: string): Promise<void> {
    const clean = prompt.trim()
    if (!clean || isLoading.value) return

    requestError.value = ""
    isLoading.value    = true

    // Push user bubble immediately
    messages.value.push({ id: Date.now(), role: "user", content: clean })

    abortController = new AbortController()

    const assistantId: { value: number | null } = { value: null }
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt: clean,
          sessionId:        sessionId.value,
          workspaceId:      opts.workspaceId,
          workspaceAgentId: opts.workspaceAgentId,
          ...(model ? { model } : {}),
        }),
        signal: abortController.signal,
      })

      if (!response.ok || !response.body) {
        let detail = ""
        try {
          const err = (await response.json()) as { message?: string }
          if (err?.message) detail = err.message
        } catch { /* ignore */ }
        throw new Error(detail || `Request failed (HTTP ${response.status}).`)
      }

      reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      const handleEvent = (name: string, raw: string) => {
        let data: any = null
        try { data = raw ? JSON.parse(raw) : null } catch { data = raw }

        if (name === "session" && data?.sessionId) {
          sessionId.value = data.sessionId
        } else if (name === "delta" && typeof data?.content === "string") {
          appendDelta(assistantId, data.content)
        } else if (name === "proposal" && data?.proposal) {
          attachProposal(assistantId, data.proposal as ChangeProposal)
        } else if (name === "error") {
          const msg = (typeof data?.message === "string" && data.message)
            ? data.message
            : "Demi could not respond right now. Please try again."
          throw new Error(msg)
        }
        // "done" — no action needed, stream will end naturally
      }

      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        let boundary = buffer.indexOf("\n\n")
        while (boundary !== -1) {
          const chunk = buffer.slice(0, boundary)
          buffer = buffer.slice(boundary + 2)
          let eventName = ""
          const dataLines: string[] = []
          for (const line of chunk.split("\n")) {
            if (line.startsWith("event:")) eventName = line.slice(6).trim()
            else if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart())
          }
          if (eventName) handleEvent(eventName, dataLines.join("\n"))
          boundary = buffer.indexOf("\n\n")
        }
      }

      if (assistantId.value === null) {
        throw new Error("Demi returned an empty response. Please try again.")
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return

      // Remove the empty assistant placeholder if it was created
      if (assistantId.value !== null) {
        const idx = messages.value.findIndex((m) => m.id === assistantId.value)
        if (idx !== -1 && !messages.value[idx]!.content) messages.value.splice(idx, 1)
      }

      requestError.value =
        err instanceof Error ? err.message : "Demi could not respond right now. Please try again."
    } finally {
      try { await reader?.cancel() } catch { /* already closed */ }
      abortController = null
      isLoading.value = false
    }
  }

  async function loadSession(id: string): Promise<{ model: string } | null> {
    if (!id || isLoading.value) return null

    requestError.value = ""

    try {
      const data = await $fetch<{
        session: { model: string }
        messages: Array<{ role: "user" | "assistant"; content: string }>
      }>(`/api/sessions/${id}`)

      sessionId.value = id
      messages.value = data.messages.map((message, index) => ({
        id: index + 1,
        role: message.role,
        content: message.content,
      }))

      return data.session
    } catch (err) {
      requestError.value = err instanceof Error ? err.message : "Could not load this session."
      return null
    }
  }

  function abort() {
    abortController?.abort()
    isLoading.value = false
  }

  return {
    messages,
    isLoading,
    requestError,
    hasMessages,
    sessionId,
    loadSession,
    sendMessage,
    abort,
  }
}
