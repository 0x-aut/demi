<script setup lang="ts">
import { SmoothCorners } from "@lisse/vue"

definePageMeta({
  layout: "use"
})

useSeoMeta({
  title: "Sessions"
})

const route = useRoute()
const workspaceId = route.params.workspace as string

type Session = {
  id: string
  title: string | null
  model: string
  createdAt: string
  updatedAt: string
  lastMessagePreview: string | null
}

const { data, pending, error } = await useFetch<{ sessions: Session[] }>("/api/sessions", {
  query: { workspaceId },
})

const sessions = computed(() => data.value?.sessions ?? [])

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const s  = Math.floor(diff / 1000)
  const m  = Math.floor(s / 60)
  const h  = Math.floor(m / 60)
  const d  = Math.floor(h / 24)
  const w  = Math.floor(d / 7)
  const mo = Math.floor(d / 30)
  const y  = Math.floor(d / 365)

  if (s < 60)  return "just now"
  if (m < 60)  return `${m} minute${m !== 1 ? "s" : ""} ago`
  if (h < 24)  return `${h} hour${h !== 1 ? "s" : ""} ago`
  if (d < 7)   return `${d} day${d !== 1 ? "s" : ""} ago`
  if (w < 5)   return `${w} week${w !== 1 ? "s" : ""} ago`
  if (mo < 12) return `${mo} month${mo !== 1 ? "s" : ""} ago`
  return `${y} year${y !== 1 ? "s" : ""} ago`
}

function modelLabel(id: string): string {
  const map: Record<string, string> = {
    "gpt-4o":       "GPT-4o",
    "gpt-6-luna":   "GPT-6 Luna",
    "gpt-6-sol":    "GPT-6 Sol",
    "gpt-6-astra":  "GPT-6 Astra",
  }
  return map[id] ?? id
}
</script>

<template>
  <div class="flex h-full w-full flex-col overflow-y-auto noscrollbar">
    <!-- Page header -->
    <div class="mx-auto w-full max-w-2xl px-6 pt-14 pb-2">
      <h1 class="font-sans text-xl font-semibold text-[#121212] leading-none tracking-tight">
        Sessions
      </h1>
      <p class="unmodified-font-sans mt-1.5 text-sm text-[#9A9A9A]">
        All chat sessions in this workspace
      </p>
    </div>

    <!-- Session list -->
    <div class="mx-auto w-full max-w-2xl px-6 pt-6 pb-16">

      <!-- Loading skeleton -->
      <template v-if="pending">
        <div class="flex flex-col gap-y-2.5">
          <div
            v-for="i in 4"
            :key="i"
            class="h-[72px] rounded-xl border border-[#E3E3E3] bg-white animate-pulse"
          />
        </div>
      </template>

      <!-- Error state -->
      <div
        v-else-if="error"
        class="unmodified-font-sans rounded-xl border border-[#E3E3E3] bg-white px-5 py-5 text-sm text-[#9A9A9A]"
      >
        Could not load sessions. Please try again.
      </div>

      <!-- Empty state -->
      <div
        v-else-if="sessions.length === 0"
        class="flex flex-col items-center gap-y-1.5 py-20 text-center"
      >
        <p class="font-sans text-sm font-medium text-[#6B6B6B]">No sessions yet</p>
        <p class="unmodified-font-sans text-xs text-[#BBBBBB]">
          Start a chat and it will appear here.
        </p>
      </div>

      <!-- Session cards -->
      <div v-else class="flex flex-col gap-y-2.5">
        <SmoothCorners
          v-for="session in sessions"
          :key="session.id"
          as-child
          :corners="{ radius: 12, smoothing: 0.6 }"
        >
          <div class="group border border-[#E3E3E3] bg-white px-5 py-4 transition-colors duration-100 hover:bg-[#FAFAFA] cursor-pointer">
            <div class="flex items-start justify-between gap-x-4">
              <!-- Title + preview -->
              <div class="min-w-0 flex-1">
                <p class="font-sans text-sm font-medium text-[#121212] truncate leading-snug">
                  {{ session.title ?? "Untitled session" }}
                </p>
                <p
                  v-if="session.lastMessagePreview"
                  class="unmodified-font-sans mt-0.5 truncate text-xs text-[#9A9A9A]"
                >
                  {{ session.lastMessagePreview }}
                </p>
              </div>

              <!-- Time -->
              <span class="unmodified-font-sans mt-px shrink-0 text-xs text-[#BBBBBB]">
                {{ timeAgo(session.updatedAt) }}
              </span>
            </div>

            <!-- Model tag -->
            <div class="mt-3">
              <SmoothCorners
                as-child
                :corners="{ radius: 6, smoothing: 0.8 }"
              >
                <span class="unmodified-font-sans inline-block bg-[#F4F4F4] px-2 py-0.5 text-xs font-medium text-[#6B6B6B]">
                  {{ modelLabel(session.model) }}
                </span>
              </SmoothCorners>
            </div>
          </div>
        </SmoothCorners>
      </div>

    </div>
  </div>
</template>
