<script setup lang="ts">
import { SmoothCorners } from "@lisse/vue"
import {
  GitPullRequestArrow,
  GitPullRequestClosed,
  CircleDot,
  BookMarked,
} from "@lucide/vue"

definePageMeta({
  layout: "use",
})

useSeoMeta({
  title: "Review",
})

type PRStatus = "open" | "closed" | "merged" | "draft"

type PullRequest = {
  id: string
  number: number
  title: string
  author: string
  branch: string
  targetBranch: string
  status: PRStatus
  reviewRequested: boolean
  createdAt: string
  updatedAt: string
  commentsCount: number
  filesChanged: number
  url: string
}

type ReviewResponse = {
  pullRequests: PullRequest[]
}

const route = useRoute()
const workspaceId = route.params.workspace as string

const pullRequests = ref<PullRequest[]>([])
const isLoading = ref(true)
const error = ref("")
const activeFilter = ref<PRStatus | "all">("all")

async function loadPullRequests() {
  isLoading.value = true
  error.value = ""

  try {
    const response = await $fetch<ReviewResponse>("/api/review", {
      query: { workspaceId },
    })

    pullRequests.value = response.pullRequests
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Failed to load pull requests"
  } finally {
    isLoading.value = false
  }
}

await loadPullRequests()

const stats = computed(() => ({
  open: pullRequests.value.filter((pr) => pr.status === "open").length,
  closed: pullRequests.value.filter((pr) => pr.status === "closed").length,
  needsReview: pullRequests.value.filter(
    (pr) => pr.reviewRequested && pr.status === "open",
  ).length,
  draft: pullRequests.value.filter((pr) => pr.status === "draft").length,
}))

const filtered = computed(() =>
  activeFilter.value === "all"
    ? pullRequests.value
    : pullRequests.value.filter((pr) => pr.status === activeFilter.value),
)

function timeAgo(dateStr: string): string {
  const diff = Math.max(0, Date.now() - new Date(dateStr).getTime())

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)
  const years = Math.floor(days / 365)

  if (seconds < 60) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  if (weeks < 5) return `${weeks}w ago`
  if (months < 12) return `${months}mo ago`
  return `${years}y ago`
}

const statusConfig: Record<
  PRStatus,
  {
    label: string
    color: string
    textColor: string
    dotColor: string
  }
> = {
  open: {
    label: "Open",
    color: "#EBF5EB",
    textColor: "#2D7A2D",
    dotColor: "#3DAA3D",
  },
  closed: {
    label: "Closed",
    color: "#F5EBEB",
    textColor: "#7A2D2D",
    dotColor: "#AA3D3D",
  },
  merged: {
    label: "Merged",
    color: "#EDE9F5",
    textColor: "#5B3DA8",
    dotColor: "#7C5CD8",
  },
  draft: {
    label: "Draft",
    color: "#F4F4F4",
    textColor: "#6B6B6B",
    dotColor: "#9A9A9A",
  },
}
</script>

<template>
  <div class="flex h-full w-full flex-col overflow-y-auto noscrollbar">
    <!-- Page header -->
    <div class="mx-auto w-full max-w-2xl px-6 pb-2 pt-14">
      <h1
        class="font-sans text-xl font-semibold leading-none tracking-tight text-[#121212]"
      >
        Review
      </h1>

      <p class="unmodified-font-sans mt-1.5 text-sm text-[#9A9A9A]">
        Pull requests across this workspace
      </p>
    </div>

    <!-- Stats -->
    <div class="mx-auto w-full max-w-2xl px-6 pt-6">
      <div class="grid grid-cols-4 gap-3">
        <SmoothCorners
          as-child
          :corners="{ radius: 12, smoothing: 0.6 }"
        >
          <div class="flex flex-col gap-y-2 border border-[#E3E3E3] bg-white px-4 py-3.5">
            <div class="flex items-center gap-x-1.5">
              <CircleDot :size="13" :stroke-width="2" class="text-[#3DAA3D]" />
              <span class="unmodified-font-sans text-xs text-[#9A9A9A]">
                Open
              </span>
            </div>

            <span class="font-sans text-2xl font-semibold leading-none text-[#121212]">
              {{ stats.open }}
            </span>
          </div>
        </SmoothCorners>

        <SmoothCorners
          as-child
          :corners="{ radius: 12, smoothing: 0.6 }"
        >
          <div class="flex flex-col gap-y-2 border border-[#E3E3E3] bg-white px-4 py-3.5">
            <div class="flex items-center gap-x-1.5">
              <GitPullRequestClosed
                :size="13"
                :stroke-width="2"
                class="text-[#AA3D3D]"
              />
              <span class="unmodified-font-sans text-xs text-[#9A9A9A]">
                Closed
              </span>
            </div>

            <span class="font-sans text-2xl font-semibold leading-none text-[#121212]">
              {{ stats.closed }}
            </span>
          </div>
        </SmoothCorners>

        <SmoothCorners
          as-child
          :corners="{ radius: 12, smoothing: 0.6 }"
        >
          <div class="flex flex-col gap-y-2 border border-[#E3E3E3] bg-white px-4 py-3.5">
            <div class="flex items-center gap-x-1.5">
              <BookMarked :size="13" :stroke-width="2" class="text-[#C07A1A]" />
              <span class="unmodified-font-sans text-xs text-[#9A9A9A]">
                Need review
              </span>
            </div>

            <span class="font-sans text-2xl font-semibold leading-none text-[#121212]">
              {{ stats.needsReview }}
            </span>
          </div>
        </SmoothCorners>

        <SmoothCorners
          as-child
          :corners="{ radius: 12, smoothing: 0.6 }"
        >
          <div class="flex flex-col gap-y-2 border border-[#E3E3E3] bg-white px-4 py-3.5">
            <div class="flex items-center gap-x-1.5">
              <GitPullRequestArrow
                :size="13"
                :stroke-width="2"
                class="text-[#9A9A9A]"
              />
              <span class="unmodified-font-sans text-xs text-[#9A9A9A]">
                Drafts
              </span>
            </div>

            <span class="font-sans text-2xl font-semibold leading-none text-[#121212]">
              {{ stats.draft }}
            </span>
          </div>
        </SmoothCorners>
      </div>
    </div>

    <!-- Filters -->
    <div class="mx-auto w-full max-w-2xl px-6 pt-5">
      <div class="flex items-center gap-x-1">
        <SmoothCorners
          v-for="tab in [
            { key: 'all', label: 'All' },
            { key: 'open', label: 'Open' },
            { key: 'closed', label: 'Closed' },
            { key: 'merged', label: 'Merged' },
            { key: 'draft', label: 'Drafts' },
          ] as const"
          :key="tab.key"
          as-child
          :corners="{ radius: 8, smoothing: 0.6 }"
        >
          <button
            type="button"
            :class="[
              'unmodified-font-sans px-3 py-1 text-xs font-medium transition-colors duration-100',
              activeFilter === tab.key
                ? 'bg-[#E3E3E3] text-[#121212]'
                : 'text-[#9A9A9A] hover:bg-[#EBEBEB] hover:text-[#6B6B6B]',
            ]"
            @click="activeFilter = tab.key"
          >
            {{ tab.label }}
          </button>
        </SmoothCorners>
      </div>
    </div>

    <!-- PR list -->
    <div class="mx-auto w-full max-w-2xl px-6 pb-16 pt-3">
      <!-- Loading -->
      <div
        v-if="isLoading"
        class="flex flex-col items-center gap-y-2 py-20"
      >
        <div
          class="h-4 w-4 animate-spin rounded-full border-2 border-[#D0D0D0] border-t-[#121212]"
        />

        <p class="unmodified-font-sans text-xs text-[#9A9A9A]">
          Loading pull requests…
        </p>
      </div>

      <!-- Error -->
      <div
        v-else-if="error"
        class="flex flex-col items-center gap-y-1.5 py-20 text-center"
      >
        <p class="font-sans text-sm font-medium text-[#6B6B6B]">
          Couldn't load pull requests
        </p>

        <p class="unmodified-font-sans max-w-sm text-xs text-[#BBBBBB]">
          {{ error }}
        </p>

        <button
          type="button"
          class="mt-2 text-xs font-medium text-[#121212] underline underline-offset-2"
          @click="loadPullRequests"
        >
          Try again
        </button>
      </div>

      <!-- Empty -->
      <div
        v-else-if="filtered.length === 0"
        class="flex flex-col items-center gap-y-1.5 py-20 text-center"
      >
        <p class="font-sans text-sm font-medium text-[#6B6B6B]">
          No pull requests
        </p>

        <p class="unmodified-font-sans text-xs text-[#BBBBBB]">
          No PRs match the selected filter.
        </p>
      </div>

      <!-- PR cards -->
      <div v-else class="flex flex-col gap-y-2.5">
        <SmoothCorners
          v-for="pr in filtered"
          :key="pr.id"
          as-child
          :corners="{ radius: 12, smoothing: 0.6 }"
        >
          <NuxtLink
            :to="`/${route.params.username}/${workspaceId}/review/${pr.number}`"
            class="group block cursor-pointer border border-[#E3E3E3] bg-white px-5 py-4 transition-colors duration-100 hover:bg-[#FAFAFA]"
          >
            <div class="flex items-start justify-between gap-x-4">
              <!-- Title + meta -->
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-x-2">
                  <span class="unmodified-font-sans shrink-0 text-xs text-[#BBBBBB]">
                    #{{ pr.number }}
                  </span>

                  <p
                    class="font-sans truncate text-sm font-medium leading-snug text-[#121212]"
                  >
                    {{ pr.title }}
                  </p>
                </div>

                <p
                  class="unmodified-font-sans mt-0.5 truncate text-xs text-[#9A9A9A]"
                >
                  <span>{{ pr.branch }}</span>
                  <span class="mx-1 text-[#CCCCCC]">→</span>
                  <span>{{ pr.targetBranch }}</span>
                  <span class="mx-1.5 text-[#DDDDDD]">·</span>
                  <span>{{ pr.author }}</span>
                  <span class="mx-1.5 text-[#DDDDDD]">·</span>
                  <span>
                    {{ pr.filesChanged }}
                    file{{ pr.filesChanged !== 1 ? "s" : "" }} changed
                  </span>
                </p>
              </div>

              <!-- Time -->
              <span
                class="unmodified-font-sans mt-px shrink-0 text-xs text-[#BBBBBB]"
              >
                {{ timeAgo(pr.updatedAt) }}
              </span>
            </div>

            <!-- Bottom row -->
            <div class="mt-3 flex items-center gap-x-2">
              <!-- Status -->
              <SmoothCorners
                as-child
                :corners="{ radius: 6, smoothing: 0.8 }"
              >
                <span
                  class="unmodified-font-sans inline-flex items-center gap-x-1 px-2 py-0.5 text-xs font-medium"
                  :style="{
                    backgroundColor: statusConfig[pr.status].color,
                    color: statusConfig[pr.status].textColor,
                  }"
                >
                  <span
                    class="inline-block h-1.5 w-1.5 rounded-full"
                    :style="{
                      backgroundColor: statusConfig[pr.status].dotColor,
                    }"
                  />

                  {{ statusConfig[pr.status].label }}
                </span>
              </SmoothCorners>

              <!-- Review requested -->
              <SmoothCorners
                v-if="pr.reviewRequested"
                as-child
                :corners="{ radius: 6, smoothing: 0.8 }"
              >
                <span
                  class="unmodified-font-sans inline-flex items-center gap-x-1 bg-[#FEF3E2] px-2 py-0.5 text-xs font-medium text-[#C07A1A]"
                >
                  <BookMarked :size="10" :stroke-width="2" />
                  Review requested
                </span>
              </SmoothCorners>

              <!-- Comments -->
              <span
                v-if="pr.commentsCount > 0"
                class="unmodified-font-sans ml-auto text-xs text-[#BBBBBB]"
              >
                {{ pr.commentsCount }}
                comment{{ pr.commentsCount !== 1 ? "s" : "" }}
              </span>
            </div>
          </NuxtLink>
        </SmoothCorners>
      </div>
    </div>
  </div>
</template>
