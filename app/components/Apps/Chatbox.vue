<script setup lang="ts">
import { Markdown } from "@comark/vue";

import { SmoothCorners } from "@lisse/vue"
import {
  ArrowUp,
  Plus,
  SlidersHorizontal
} from "@lucide/vue"

type ChatMessage = {
  id: number
  role: "user" | "assistant"
  content: string
}

const message = ref("")
const messages = ref<ChatMessage[]>([])
const isLoading = ref(false)
const requestError = ref("")
const isFocused = ref(false)

const textareaRef = ref<HTMLTextAreaElement | null>(null)
const messageListRef = ref<HTMLElement | null>(null)

const hasMessages = computed(() => messages.value.length > 0)

const MAX_TEXTAREA_HEIGHT = 200

function adjustHeight() {
  const textarea = textareaRef.value
  if (!textarea) return

  textarea.style.height = "auto"
  textarea.style.height = `${Math.min(
    textarea.scrollHeight,
    MAX_TEXTAREA_HEIGHT
  )}px`
}

function getResponseText(response: unknown) {
  if (typeof response === "string") return response

  if (response && typeof response === "object" && "message" in response) {
    const text = (response as { message?: unknown }).message

    if (typeof text === "string") return text
  }

  return "Pointer returned an empty response. Please try again."
}

async function scrollToBottom() {
  await nextTick()

  const messageList = messageListRef.value
  if (!messageList) return

  messageList.scrollTo({
    top: messageList.scrollHeight,
    behavior: "smooth"
  })
}

async function sendMessage() {
  const userMessage = message.value.trim()

  if (!userMessage || isLoading.value) return

  requestError.value = ""

  messages.value.push({
    id: Date.now(),
    role: "user",
    content: userMessage
  })

  message.value = ""
  isLoading.value = true

  await nextTick(adjustHeight)
  await scrollToBottom()

  try {
    const response = await $fetch<unknown>("/api/apps/chat", {
      method: "POST",
      body: { userMessage }
    })

    messages.value.push({
      id: Date.now() + 1,
      role: "assistant",
      content: getResponseText(response)
    })
  } catch {
    requestError.value = "Pointer could not respond right now. Please try again."
  } finally {
    isLoading.value = false
    await scrollToBottom()
  }
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault()
    sendMessage()
  }
}

onMounted(() => {
  textareaRef.value?.focus()
})
</script>

<template>
  <div
    :class="[
      'flex h-[calc(100dvh-2.75rem)] w-full flex-col px-2 py-8',
      hasMessages ? 'justify-between gap-y-5' : 'justify-center'
    ]"
  >
    <div
      v-if="hasMessages"
      ref="messageListRef"
      class="flex min-h-0 noscrollbar flex-1 flex-col gap-y-4 overflow-y-auto px-2 py-2"
      aria-live="polite"
    >
      <div
        v-for="chatMessage in messages"
        :key="chatMessage.id"
        :class="chatMessage.role === 'user' ? 'flex justify-end' : 'flex justify-start'"
      >
        <SmoothCorners 
          v-if="chatMessage.role === 'user'" 
          as-child 
          :corners="{ topLeft: 18, topRight: 18, bottomLeft: 18, bottomRight: 18, smoothing: 0.6 }"
        >
          <span
            class="flex max-w-[40vw] whitespace-pre-wrap justify-start font-sans px-2 py-1.5 text-md leading-6 bg-[#0A84FF] text-white"
          >
            {{ chatMessage.content }}
          </span>
        </SmoothCorners>

        <Suspense v-else>
          <Markdown
            class="font-sans text-md text-black"
          >
             {{ chatMessage.content }} 
          </Markdown>
        </Suspense>
        
      </div>

      <div v-if="isLoading" class="flex justify-start">
        <div
          class="rounded-[18px] font-sans rounded-bl-md border border-[#E5E5E5] bg-white px-4 py-2.5 text-sm text-[#696969]"
        >
          Pointer is thinking<span class="animate-pulse">...</span>
        </div>
      </div>

      <div v-if="requestError" class="flex justify-start">
        <div
          class="rounded-[18px] font-sans rounded-bl-md bg-[#FFF1F1] px-4 py-2.5 text-sm text-[#B42318]"
        >
          {{ requestError }}
        </div>
      </div>
    </div>

    <div :class="hasMessages ? 'shrink-0' : 'mx-auto w-full max-w-3xl'">
      <SmoothCorners
        as-child
        :corners="{ radius: 20, smoothing: 0.6 }"
        :middle-border="isFocused
          ? { width: 1.5, color: { type: 'solid', color: '#E3E3E3' }, opacity: 1 }
          : {
              width: 1,
              color: {
                type: 'linear',
                angle: 180,
                stops: [
                  { offset: 0, color: '#E5E5E5' },
                  { offset: 1, color: '#F4F4F4' },
                ],
              },
              opacity: 0.4
            }"
      >
        <div class="flex flex-col font-sans text-md gap-y-0.5 bg-[#FFFFFF] p-1.5">
          <textarea
            ref="textareaRef"
            v-model="message"
            rows="1"
            placeholder="Ask Pointer anything about your company"
            aria-label="Message Pointer"
            class="max-h-[200px] resize-none overflow-y-auto bg-transparent p-1 text-sm font-medium outline-none"
            @input="adjustHeight"
            @keydown="handleKeyDown"
            @focus="isFocused = true"
            @blur="isFocused = false"
          />

          <div class="flex w-full items-center justify-between">
            <button
              type="button"
              aria-label="Add context"
              class="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-[#D9D9D9]"
            >
              <Plus :size="20" color="#121212" />
            </button>

            <div class="flex items-center gap-x-1.5">
              <button
                type="button"
                aria-label="Chat settings"
                class="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-[#D9D9D9]"
              >
                <SlidersHorizontal :size="20" color="#121212" />
              </button>

              <UIElementsModelCard />

              <button
                type="button"
                aria-label="Send message"
                :disabled="!message.trim() || isLoading"
                class="flex h-8 w-8 items-center justify-center rounded-full bg-[#121212] transition-opacity disabled:cursor-not-allowed disabled:opacity-35"
                @click="sendMessage"
              >
                <ArrowUp :size="16" color="#fff" class="-ml-px" />
              </button>
            </div>
          </div>
        </div>
      </SmoothCorners>

    </div>
  </div>
</template>