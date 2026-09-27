<script setup lang="ts">
import { SmoothCorners } from "@lisse/vue"
import {
  GitPullRequestArrow,
  GitPullRequestClosed,
  GitMerge,
  CircleDot,
  BookMarked,
  CheckCircle,
} from "@lucide/vue"

definePageMeta({
  layout: "use"
})

useSeoMeta({
  title: "Review"
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
}

// Placeholder data — replace with real API fetch
const pullRequests = ref<PullRequest[]>([
  {
    id: "1",
    number: 42,
    title: "feat: add session history persistence to workspace",
    author: "marvellous",
    branch: "feat/session-history",
    targetBranch: "main",
    status: "open",
    reviewRequested: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    commentsCount: 4,
    filesChanged: 7,
  },
  {
    id: "2",
    number: 41,
    title: "fix: resolve model card display on smaller viewports",
    author: "marvellous",
    branch: "fix/model-card-mobile",
    targetBranch: "main",
    status: "merged",
    reviewRequested: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    commentsCount: 2,
    filesChanged: 3,
  },
  {
    id: "3",
    number: 40,
    title: "chore: update dependencies and audit peer packages",
    author: "marvellous",
    branch: "chore/deps-update",
    targetBranch: "main",
    status: "closed",
    reviewRequested: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 60).toISOString(),
    commentsCount: 1,
    filesChanged: 12,
  },
  {
    id: "4",
    number: 39,
    title: "feat: workspace-level agent configuration and routing",
    author: "marvellous",
    branch: "feat/agent-config",
    targetBranch: "main",
    status: "draft",
    reviewRequested: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    commentsCount: 0,
    filesChanged: 19,
  },
  {
    id: "5",
    number: 38,
    title: "feat: review page layout and PR summary cards",
    author: "marvellous",
    branch: "feat/review-page",
    targetBranch: "main",
    status: "open",
    reviewRequested: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    commentsCount: 6,
    filesChanged: 5,
  },
])

const stats = computed(() => ({
  open:   pullRequests.value.filter(p => p.status === "open").length,
  closed: pullRequests.value.filter(p => p.status === "closed").length,
  needsReview: pullRequests.value.filter(p => p.reviewRequested && p.status === "open").length,
  draft:  pullRequests.value.filter(p => p.status === "draft").length,
}))

const activeFilter = ref<PRStatus | "all">("all")

const filtered = computed(() =>
  activeFilter.value === "all"
    ? pullRequests.value
    : pullRequests.value.filter(p => p.status === activeFilter.value)
)

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
  if (m < 60)  return `${m}m ago`
  if (h < 24)  return `${h}h ago`
  if (d < 7)   return `${d}d ago`
  if (w < 5)   return `${w}w ago`
  if (mo < 12) return `${mo}mo ago`
  return `${y}y ago`
}

const statusConfig: Record<PRStatus, { label: string; color: string; textColor: string; dotColor: string }> = {
  open:   { label: "Open",   color: "#EBF5EB", textColor: "#2D7A2D", dotColor: "#3DAA3D" },
  closed: { label: "Closed", color: "#F5EBEB", textColor: "#7A2D2D", dotColor: "#AA3D3D" },
  merged: { label: "Merged", color: "#EDE9F5", textColor: "#5B3DA8", dotColor: "#7C5CD8" },
  draft:  { label: "Draft",  color: "#F4F4F4", textColor: "#6B6B6B", dotColor: "#9A9A9A" },
}
</script>

<template>
  <div class="flex h-full w-full flex-col overflow-y-auto noscrollbar">

    <!-- Page header -->
    <div class="mx-auto w-full max-w-2xl px-6 pt-14 pb-2">
      <h1 class="font-sans text-xl font-semibold text-[#121212] leading-none tracking-tight">
        Review
      </h1>
      <p class="unmodified-font-sans mt-1.5 text-sm text-[#9A9A9A]">
        Pull requests across this workspace
      </p>
    </div>

    <!-- Stats row -->
    <div class="mx-auto w-full max-w-2xl px-6 pt-6">
      <div class="grid grid-cols-4 gap-3">

        <!-- Open -->
        <SmoothCorners as-child :corners="{ radius: 12, smoothing: 0.6 }">
          <div class="flex flex-col gap-y-2 border border-[#E3E3E3] bg-white px-4 py-3.5">
            <div class="flex items-center gap-x-1.5">
              <CircleDot :size="13" :stroke-width="2" class="text-[#3DAA3D]" />
              <span class="unmodified-font-sans text-xs text-[#9A9A9A]">Open</span>
            </div>
            <span class="font-sans text-2xl font-semibold text-[#121212] leading-none">
              {{ stats.open }}
            </span>
          </div>
        </SmoothCorners>

        <!-- Closed -->
        <SmoothCorners as-child :corners="{ radius: 12, smoothing: 0.6 }">
          <div class="flex flex-col gap-y-2 border border-[#E3E3E3] bg-white px-4 py-3.5">
            <div class="flex items-center gap-x-1.5">
              <GitPullRequestClosed :size="13" :stroke-width="2" class="text-[#AA3D3D]" />
              <span class="unmodified-font-sans text-xs text-[#9A9A9A]">Closed</span>
            </div>
            <span class="font-sans text-2xl font-semibold text-[#121212] leading-none">
              {{ stats.closed }}
            </span>
          </div>
        </SmoothCorners>

        <!-- Needs Review -->
        <SmoothCorners as-child :corners="{ radius: 12, smoothing: 0.6 }">
          <div class="flex flex-col gap-y-2 border border-[#E3E3E3] bg-white px-4 py-3.5">
            <div class="flex items-center gap-x-1.5">
              <BookMarked :size="13" :stroke-width="2" class="text-[#C07A1A]" />
              <span class="unmodified-font-sans text-xs text-[#9A9A9A]">Need review</span>
            </div>
            <span class="font-sans text-2xl font-semibold text-[#121212] leading-none">
              {{ stats.needsReview }}
            </span>
          </div>
        </SmoothCorners>

        <!-- Drafts -->
        <SmoothCorners as-child :corners="{ radius: 12, smoothing: 0.6 }">
          <div class="flex flex-col gap-y-2 border border-[#E3E3E3] bg-white px-4 py-3.5">
            <div class="flex items-center gap-x-1.5">
              <GitPullRequestArrow :size="13" :stroke-width="2" class="text-[#9A9A9A]" />
              <span class="unmodified-font-sans text-xs text-[#9A9A9A]">Drafts</span>
            </div>
            <span class="font-sans text-2xl font-semibold text-[#121212] leading-none">
              {{ stats.draft }}
            </span>
          </div>
        </SmoothCorners>

      </div>
    </div>

    <!-- Filter tabs -->
    <div class="mx-auto w-full max-w-2xl px-6 pt-5">
      <div class="flex items-center gap-x-1">
        <SmoothCorners
          v-for="tab in ([
            { key: 'all',    label: 'All' },
            { key: 'open',   label: 'Open' },
            { key: 'closed', label: 'Closed' },
            { key: 'merged', label: 'Merged' },
            { key: 'draft',  label: 'Drafts' },
          ] as const)"
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
                : 'text-[#9A9A9A] hover:bg-[#EBEBEB] hover:text-[#6B6B6B]'
            ]"
            @click="activeFilter = tab.key"
          >
            {{ tab.label }}
          </button>
        </SmoothCorners>
      </div>
    </div>

    <!-- PR list -->
    <div class="mx-auto w-full max-w-2xl px-6 pt-3 pb-16">

      <!-- Empty state -->
      <div
        v-if="filtered.length === 0"
        class="flex flex-col items-center gap-y-1.5 py-20 text-center"
      >
        <p class="font-sans text-sm font-medium text-[#6B6B6B]">No pull requests</p>
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
          <div class="group border border-[#E3E3E3] bg-white px-5 py-4 transition-colors duration-100 hover:bg-[#FAFAFA] cursor-pointer">
            <div class="flex items-start justify-between gap-x-4">
              <!-- Title + meta -->
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-x-2">
                  <span class="unmodified-font-sans shrink-0 text-xs text-[#BBBBBB]">#{{ pr.number }}</span>
                  <p class="font-sans text-sm font-medium text-[#121212] truncate leading-snug">
                    {{ pr.title }}
                  </p>
                </div>
                <p class="unmodified-font-sans mt-0.5 text-xs text-[#9A9A9A] truncate">
                  <span>{{ pr.branch }}</span>
                  <span class="mx-1 text-[#CCCCCC]">→</span>
                  <span>{{ pr.targetBranch }}</span>
                  <span class="mx-1.5 text-[#DDDDDD]">·</span>
                  <span>{{ pr.author }}</span>
                  <span class="mx-1.5 text-[#DDDDDD]">·</span>
                  <span>{{ pr.filesChanged }} file{{ pr.filesChanged !== 1 ? "s" : "" }} changed</span>
                </p>
              </div>
              <!-- Time -->
              <span class="unmodified-font-sans mt-px shrink-0 text-xs text-[#BBBBBB]">
                {{ timeAgo(pr.updatedAt) }}
              </span>
            </div>

            <!-- Bottom row: status badge + review badge + comments -->
            <div class="mt-3 flex items-center gap-x-2">
              <!-- Status badge -->
              <SmoothCorners as-child :corners="{ radius: 6, smoothing: 0.8 }">
                <span
                  class="unmodified-font-sans inline-flex items-center gap-x-1 px-2 py-0.5 text-xs font-medium"
                  :style="{ backgroundColor: statusConfig[pr.status].color, color: statusConfig[pr.status].textColor }"
                >
                  <span
                    class="inline-block h-1.5 w-1.5 rounded-full"
                    :style="{ backgroundColor: statusConfig[pr.status].dotColor }"
                  />
                  {{ statusConfig[pr.status].label }}
                </span>
              </SmoothCorners>

              <!-- Needs review badge -->
              <SmoothCorners v-if="pr.reviewRequested" as-child :corners="{ radius: 6, smoothing: 0.8 }">
                <span class="unmodified-font-sans inline-flex items-center gap-x-1 bg-[#FEF3E2] px-2 py-0.5 text-xs font-medium text-[#C07A1A]">
                  <BookMarked :size="10" :stroke-width="2" />
                  Review requested
                </span>
              </SmoothCorners>

              <!-- Comments -->
              <span
                v-if="pr.commentsCount > 0"
                class="unmodified-font-sans ml-auto text-xs text-[#BBBBBB]"
              >
                {{ pr.commentsCount }} comment{{ pr.commentsCount !== 1 ? "s" : "" }}
              </span>
            </div>
          </div>
        </SmoothCorners>
      </div>

    </div>
  </div>
</template>
