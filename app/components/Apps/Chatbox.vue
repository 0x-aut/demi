<script setup lang="ts">
import { SmoothCorners } from "@lisse/vue"
import { ArrowUp, Plus, SlidersHorizontal } from "@lucide/vue"
import { useChat } from "~/composables/useChat"

const props = defineProps<{
  displayName?: string
  workspaceId?: string
  workspaceAgentId?: string
}>()

const route = useRoute()
const workspaceId = computed(() => String(props.workspaceId ?? route.params.workspace ?? route.params.workspaceId ?? route.path.split("/")[2] ?? ""))

// selectedModel is lifted here so we can pass it to sendMessage
const selectedModel = ref("gpt-4o")

const { messages, isLoading, requestError, hasMessages, loadSession, sendMessage, abort } = useChat({
  workspaceId:      workspaceId.value,
  workspaceAgentId: props.workspaceAgentId,
})

const message        = ref("")
const isFocused      = ref(false)
const textareaRef    = ref<HTMLTextAreaElement | null>(null)
const messageListRef = ref<HTMLElement | null>(null)

const MAX_TEXTAREA_HEIGHT = 200

const canSend = computed(() => message.value.trim().length >= 2 && !isLoading.value)

function adjustHeight() {
  const el = textareaRef.value
  if (!el) return
  el.style.height = "auto"
  el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`
}

async function scrollToBottom() {
  await nextTick()
  messageListRef.value?.scrollTo({ top: messageListRef.value.scrollHeight, behavior: "smooth" })
}

async function handleSend() {
  const text = message.value.trim()
  if (!canSend.value) return
  message.value = ""
  await nextTick(adjustHeight)
  await scrollToBottom()
  await sendMessage(text, selectedModel.value)
  await scrollToBottom()
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === "Enter" && !e.shiftKey && canSend.value) {
    e.preventDefault()
    handleSend()
  }
}


const proposalStates = ref<Record<number, { state: 'loading' | 'success'; pullRequest?: { number: number; url: string; title: string } }>>({})

async function approveProposal(proposal: ChangeProposal, messageId: number) {
  if (!workspaceId.value || proposalStates.value[messageId]?.state === 'loading') return

  proposalStates.value[messageId] = { state: 'loading' }

  try {
    const result = await $fetch("/api/change/approve", {
      method: "POST",
      body: {
        workspaceId: workspaceId.value,
        proposal,
      },
    })

    const msg = messages.value.find(m => m.id === messageId)

    if (msg) {
      proposalStates.value[messageId] = { state: 'success', pullRequest: result.pullRequest }
    }
  } catch (error) {
    requestError.value = error instanceof Error
      ? error.message
      : "Demi could not create the pull request."
  } finally {
    if (proposalStates.value[messageId]?.state === 'loading') delete proposalStates.value[messageId]
  }
}


watch(messages, scrollToBottom, { deep: true })

onMounted(async () => {
  const requestedSession = typeof route.query.session === "string" ? route.query.session : null

  if (requestedSession) {
    const session = await loadSession(requestedSession)
    if (session?.model) selectedModel.value = session.model
  }

  await nextTick()
  textareaRef.value?.focus()
})
onBeforeUnmount(() => abort())
</script>

<template>
  <div class="flex w-full justify-center">
    <div
      :class="[
        'flex w-full max-w-2xl flex-col px-2 py-8',
        hasMessages
          ? 'h-[calc(100dvh-2.75rem)] justify-between gap-y-5'
          : 'justify-center',
      ]"
    >
      <!-- Message list -->
      <div
        v-if="hasMessages"
        ref="messageListRef"
        class="flex min-h-0 noscrollbar flex-1 flex-col gap-y-5 overflow-y-auto px-1 py-2"
        aria-live="polite"
      >
        <div
          v-for="msg in messages"
          :key="msg.id"
          :class="msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'"
        >
          <!-- User bubble -->
          <SmoothCorners
            v-if="msg.role === 'user'"
            as-child
            :corners="{ topLeft: 18, topRight: 18, bottomLeft: 18, bottomRight: 4, smoothing: 0.6 }"
          >
            <span class="max-w-[75%] whitespace-pre-wrap font-sans px-3.5 py-2.5 text-sm leading-6 bg-[#0A84FF] text-white">
              {{ msg.content }}
            </span>
          </SmoothCorners>

          <!-- Assistant bubble — Markdown rendered, streams token-by-token -->
          <div v-else class="flex max-w-[85%] flex-col">
            <Markdown
              :key="msg.id"
              :value="msg.content"
              :streaming="isLoading"
              :caret="isLoading"
              class="font-sans text-sm text-[#1a1a1a] leading-6 prose prose-sm"
            />
            <AppsChangeProposalCard
              v-if="msg.proposal"
              :proposal="msg.proposal"
              :state="proposalStates[msg.id]?.state ?? 'idle'"
              :pull-request="proposalStates[msg.id]?.pullRequest"
              @approve="approveProposal(msg.proposal, msg.id)"
            />
          </div>
        </div>

        <!-- Typing indicator -->
        <div v-if="isLoading" class="flex justify-start">
          <div class="rounded-2xl rounded-bl-md border border-[#E5E5E5] bg-white px-4 py-2.5 text-sm font-sans text-[#696969]">
            {{ displayName ?? 'Demi' }} is thinking<span class="animate-pulse">…</span>
          </div>
        </div>

        <!-- Error -->
        <div v-if="requestError" class="flex justify-start">
          <div class="rounded-2xl rounded-bl-md bg-[#FFF1F1] px-4 py-2.5 text-sm font-sans text-[#B42318]">
            {{ requestError }}
          </div>
        </div>
      </div>

      <!-- Input bar -->
      <div class="shrink-0">
        <SmoothCorners
          as-child
          :corners="{ radius: 20, smoothing: 0.6 }"
          :middle-border="isFocused
            ? { width: 1.5, color: { type: 'solid', color: '#D0D0D0' }, opacity: 1 }
            : { width: 1, color: { type: 'linear', angle: 180, stops: [{ offset: 0, color: '#E5E5E5' }, { offset: 1, color: '#F4F4F4' }] }, opacity: 0.6 }"
        >
          <div
            class="flex flex-col font-sans gap-y-0.5 bg-[#FFFFFF] p-1.5"
            @focusin="isFocused = true"
            @focusout="isFocused = false"
          >
            <textarea
              ref="textareaRef"
              v-model="message"
              rows="1"
              :placeholder="`Ask ${displayName ?? 'Demi'} anything`"
              :aria-label="`Message ${displayName ?? 'Demi'}`"
              class="max-h-[200px] resize-none overflow-y-auto bg-transparent px-1.5 py-1 text-sm font-medium text-[#1a1a1a] outline-none placeholder:text-[#A0A0A0]"
              @input="adjustHeight"
              @keydown="handleKeyDown"
            />

            <div class="flex w-full items-center justify-between">
              <button
                type="button"
                aria-label="Add context"
                class="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-[#F0F0F0]"
              >
                <Plus :size="18" color="#5a5a5a" />
              </button>

              <div class="flex items-center gap-x-1.5">
                <button
                  type="button"
                  aria-label="Chat settings"
                  class="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-[#F0F0F0]"
                >
                  <SlidersHorizontal :size="18" color="#5a5a5a" />
                </button>

                <!-- ModelCard now emits its selection up -->
                <ElementsModelCard @select="selectedModel = $event" />

                <!-- Stop button while streaming -->
                <button
                  v-if="isLoading"
                  type="button"
                  aria-label="Stop generation"
                  class="flex h-8 w-8 items-center justify-center rounded-full bg-[#121212]"
                  @click="abort"
                >
                  <span class="h-3 w-3 rounded-sm bg-white" />
                </button>

                <!-- Send button -->
                <button
                  v-else
                  type="button"
                  aria-label="Send message"
                  :disabled="!canSend"
                  class="flex h-8 w-8 items-center justify-center rounded-full bg-[#121212] transition-opacity disabled:cursor-not-allowed disabled:opacity-30"
                  @mousedown.prevent="handleSend"
                >
                  <ArrowUp :size="16" color="#fff" class="-ml-px" />
                </button>
              </div>
            </div>
          </div>
        </SmoothCorners>
      </div>
    </div>
  </div>
</template>
