<script setup lang="ts">
import { SmoothCorners } from "@lisse/vue"
import { Search, Lock, Globe, X, ChevronRight, LoaderCircle } from "@lucide/vue"

definePageMeta({ layout: "use" })
useSeoMeta({ title: "Home" })

const route = useRoute()
const username = route.params.username as string

// ── Modal state ──────────────────────────────────────────────────────────────

const modalOpen = ref(false)
const searchQuery = ref("")
const creating = ref(false)
const createError = ref("")

// ── Repo list ────────────────────────────────────────────────────────────────

interface Repo {
  id: number
  name: string
  fullName: string
  description: string | null
  url: string
  private: boolean
  defaultBranch: string
  updatedAt: string | null
}

const { data: repoData, pending: reposLoading, error: reposError, refresh: refreshRepos } = useFetch<{ repos: Repo[] }>(
  "/api/github/repos",
  { immediate: false, watch: false },
)

const repos = computed(() => repoData.value?.repos ?? [])

// True when GitHub access is missing or the stored connection is invalid.
const needsGithubConnect = computed(() => {
  const status = (reposError.value as any)?.statusCode
  return status === 401 || status === 403
})

const filteredRepos = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  if (!q) return repos.value
  return repos.value.filter(
    (r) =>
      r.name.toLowerCase().includes(q) ||
      r.fullName.toLowerCase().includes(q) ||
      (r.description ?? "").toLowerCase().includes(q),
  )
})

function openModal() {
  modalOpen.value = true
  searchQuery.value = ""
  createError.value = ""
  // Always refresh so a newly-connected GitHub account is picked up immediately
  refreshRepos()
}

function connectGithub() {
  window.location.href = `/api/github/connect?returnTo=${encodeURIComponent(window.location.pathname)}`
}

function closeModal() {
  if (creating.value) return
  modalOpen.value = false
}

// ── Create workspace from selected repo ──────────────────────────────────────

async function connectRepo(repo: Repo) {
  if (creating.value) return
  creating.value = true
  createError.value = ""

  try {
    const data = await $fetch<{ workspace: { id: string; name: string } }>(
      "/api/workspaces",
      {
        method: "POST",
        body: {
          name: repo.name,
          repoName: repo.fullName,
          repoUrl: repo.url,
          branch: repo.defaultBranch,
          description: repo.description ?? undefined,
        },
      },
    )

    // Navigate into the new workspace
    await navigateTo(`/${username}/${data.workspace.id}/home`)
  } catch (err: any) {
    createError.value =
      err?.data?.message ?? err?.message ?? "Failed to create workspace. Please try again."
    creating.value = false
  }
}

// ── Relative time helper ──────────────────────────────────────────────────────

function relativeTime(iso: string | null): string {
  if (!iso) return ""
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}
</script>

<template>
  <div class="flex h-full w-full items-center justify-center">
    <div class="flex flex-col items-center gap-y-5 text-center">

      <!-- GitHub logo -->
      <div class="flex h-14 w-14 items-center justify-center">
        <svg
          viewBox="0 0 98 96"
          xmlns="http://www.w3.org/2000/svg"
          class="h-full w-full text-[#121212]"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"
          />
        </svg>
      </div>

      <div class="flex flex-col gap-y-1.5">
        <h1 class="font-sans text-[15px] font-semibold text-[#121212]">Connect a repository</h1>
        <p class="font-sans text-sm font-normal text-[#6B6B6B] max-w-[280px] leading-relaxed">
          Link a GitHub repository to get started. Each repository becomes a workspace where your agents can read, review, and act on your codebase.
        </p>
      </div>

      <SmoothCorners as-child :corners="{ radius: 10, smoothing: 0.6 }">
        <button
          type="button"
          class="flex items-center gap-x-2 bg-[#121212] px-4 py-2 transition-opacity duration-100 hover:opacity-80"
          @click="openModal"
        >
          <svg viewBox="0 0 98 96" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-white" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z" />
          </svg>
          <span class="font-sans text-sm font-medium text-white">Connect repository</span>
        </button>
      </SmoothCorners>
    </div>
  </div>

  <Teleport to="body">
    <Transition enter-active-class="transition-opacity duration-150 ease-out" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="transition-opacity duration-100 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="modalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="closeModal">
        <Transition enter-active-class="transition-all duration-150 ease-out" enter-from-class="opacity-0 scale-95" enter-to-class="opacity-100 scale-100" leave-active-class="transition-all duration-100 ease-in" leave-from-class="opacity-100 scale-100" leave-to-class="opacity-0 scale-95">
          <div v-if="modalOpen" class="relative flex w-full max-w-[520px] flex-col rounded-[14px] bg-white shadow-xl">
            <div class="flex items-center justify-between border-b border-[#E5E7EB] px-5 py-4">
              <div class="flex flex-col gap-y-0.5">
                <h2 class="font-sans text-[15px] font-semibold text-[#121212]">Select a repository</h2>
                <p class="font-sans text-xs text-[#6B6B6B]">Choose a repo to connect as a new workspace.</p>
              </div>
              <button type="button" class="flex h-7 w-7 items-center justify-center rounded-full text-[#6B6B6B] transition-colors duration-100 hover:bg-[#F0F0F0] hover:text-[#121212]" :disabled="creating" @click="closeModal">
                <X :size="15" :stroke-width="2" />
              </button>
            </div>

            <div class="border-b border-[#E5E7EB] px-5 py-3">
              <div class="flex items-center gap-x-2 rounded-[8px] border border-[#E5E7EB] bg-[#F7F8FA] px-3 py-2">
                <Search :size="14" :stroke-width="1.8" class="shrink-0 text-[#9A9A9A]" />
                <input v-model="searchQuery" type="text" placeholder="Search repositories…" class="flex-1 bg-transparent font-sans text-sm text-[#121212] outline-none placeholder:text-[#BBBBBB]" :disabled="creating" />
              </div>
            </div>

            <div class="max-h-[340px] overflow-y-auto">
              <div v-if="reposLoading" class="flex items-center justify-center gap-x-2 py-10 text-[#6B6B6B]">
                <LoaderCircle :size="16" :stroke-width="2" class="animate-spin" />
                <span class="font-sans text-sm">Loading repositories…</span>
              </div>

              <!-- No GitHub access — offer to connect/reconnect -->
              <div v-else-if="needsGithubConnect" class="flex flex-col items-center gap-y-4 px-5 py-10 text-center">
                <svg viewBox="0 0 98 96" xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-[#BBBBBB]" fill="currentColor" aria-hidden="true">
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z" />
                </svg>
                <div class="flex flex-col gap-y-1">
                  <p class="font-sans text-sm font-medium text-[#121212]">Connect your GitHub account</p>
                  <p class="font-sans text-xs text-[#6B6B6B] max-w-[300px] leading-relaxed">
                    Your GitHub connection is missing or invalid. Authorise access to read your repositories.
                  </p>
                </div>
                <button type="button" class="flex items-center gap-x-2 rounded-[8px] bg-[#121212] px-4 py-2 font-sans text-sm font-medium text-white transition-opacity duration-100 hover:opacity-80" @click="connectGithub">
                  <svg viewBox="0 0 98 96" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-white" fill="currentColor" aria-hidden="true">
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M48.854 0C21.839 0 0 22 0 49.217c0-0.05 0 0 0 0" />
                  </svg>
                  Authorise GitHub
                </button>
              </div>

              <div v-else-if="reposError" class="px-5 py-8 text-center">
                <p class="font-sans text-sm text-[#E05050]">{{ (reposError as any)?.data?.message ?? "Could not load repositories." }}</p>
                <button type="button" class="mt-3 font-sans text-sm text-[#3b82d4] hover:underline" @click="refreshRepos">Try again</button>
              </div>

              <div v-else-if="filteredRepos.length === 0" class="px-5 py-8 text-center">
                <p class="font-sans text-sm text-[#9A9A9A]">No repositories match <span class="text-[#121212]">"{{ searchQuery }}"</span>.</p>
              </div>

              <ul v-else class="divide-y divide-[#F0F0F0]">
                <li v-for="repo in filteredRepos" :key="repo.id">
                  <button type="button" class="group flex w-full items-center gap-x-3 px-5 py-3.5 text-left transition-colors duration-100 hover:bg-[#F7F8FA] disabled:cursor-not-allowed disabled:opacity-50" :disabled="creating" @click="connectRepo(repo)">
                    <div class="flex min-w-0 flex-1 flex-col gap-y-0.5">
                      <div class="flex items-center gap-x-1.5">
                        <component :is="repo.private ? Lock : Globe" :size="11" :stroke-width="1.8" class="shrink-0 text-[#9A9A9A]" />
                        <span class="font-sans text-sm font-medium text-[#121212] truncate">{{ repo.fullName }}</span>
                      </div>
                      <p v-if="repo.description" class="font-sans text-xs text-[#6B6B6B] truncate">{{ repo.description }}</p>
                    </div>
                    <div class="flex shrink-0 items-center gap-x-2">
                      <span v-if="repo.updatedAt" class="font-sans text-xs text-[#BBBBBB]">{{ relativeTime(repo.updatedAt) }}</span>
                      <ChevronRight :size="14" :stroke-width="1.8" class="text-[#CCCCCC] transition-colors duration-100 group-hover:text-[#6B6B6B]" />
                    </div>
                  </button>
                </li>
              </ul>
            </div>

            <div v-if="creating || createError" class="border-t border-[#E5E7EB] px-5 py-3">
              <div v-if="creating" class="flex items-center gap-x-2 text-[#6B6B6B]">
                <LoaderCircle :size="14" :stroke-width="2" class="animate-spin" />
                <span class="font-sans text-sm">Creating workspace…</span>
              </div>
              <p v-else-if="createError" class="font-sans text-sm text-[#E05050]">{{ createError }}</p>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
