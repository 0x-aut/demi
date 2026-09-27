<script setup lang="ts">
import { ArrowLeft, ExternalLink, GitPullRequest, GitPullRequestClosed, GitMerge, GitBranch, UserRound, FileCode2, Plus, Minus, GitCommitHorizontal } from "@lucide/vue";
import { SmoothCorners } from "@lisse/vue";

definePageMeta({ layout: "use" });
useSeoMeta({ title: "Pull Request" });
type PullRequest = { number:number; title:string; body:string; url:string; state:string; merged:boolean; draft:boolean; author:string; branch:string; targetBranch:string; createdAt:string; updatedAt:string; mergedAt:string|null; filesChanged:number; additions:number; deletions:number; commits:number };
const route = useRoute();
const router = useRouter();
const workspaceId = route.params.workspace as string;
const pullRequest = ref<PullRequest|null>(null);
const isLoading = ref(true);
const error = ref("");
const status = computed(() => pullRequest.value?.merged ? "Merged" : pullRequest.value?.draft ? "Draft" : pullRequest.value?.state === "open" ? "Open" : "Closed");
const statusIcon = computed(() => pullRequest.value?.merged ? GitMerge : pullRequest.value?.state === "open" ? GitPullRequest : GitPullRequestClosed);
const statusClass = computed(() => pullRequest.value?.merged ? "bg-[#F3F0FF] text-[#6E56CF]" : pullRequest.value?.state === "open" ? "bg-[#EAF7EE] text-[#16803C]" : "bg-[#F4F4F4] text-[#666]");
function formatDate(value:string) { return new Intl.DateTimeFormat(undefined, { dateStyle:"medium", timeStyle:"short" }).format(new Date(value)); }
async function load() { isLoading.value=true; error.value=""; try { const response=await $fetch<{pullRequest:PullRequest}>("/api/review/"+route.params.number,{query:{workspaceId}}); pullRequest.value=response.pullRequest; } catch(err) { error.value=err instanceof Error ? err.message : "Failed to load pull request"; } finally { isLoading.value=false; } }
await load();
</script>
<template>
<div class="mx-auto flex h-full w-full max-w-5xl flex-col px-5 py-6">
<button class="mb-6 flex w-fit items-center gap-2 text-sm text-[#666] hover:text-black" @click="router.back()"><ArrowLeft :size="16"/> Back to review</button>
<div v-if="isLoading" class="flex flex-1 items-center justify-center text-sm text-[#888]">Loading pull request…</div>
<div v-else-if="error" class="rounded-2xl border border-[#E3E3E3] bg-white p-6 text-sm text-[#666]">{{ error }}</div>
<template v-else-if="pullRequest">
<div class="flex flex-col gap-6">
<div class="flex flex-col gap-4">
<div class="flex items-center gap-2 text-sm text-[#777]"><component :is="statusIcon" :size="17"/><span :class="['rounded-full px-2.5 py-1 text-xs font-medium',statusClass]">{{ status }}</span><span>Pull request #{{ pullRequest.number }}</span></div>
<div><h1 class="text-2xl font-semibold tracking-[-0.02em] text-black">{{ pullRequest.title }}</h1><div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#777]"><span class="flex items-center gap-1.5"><UserRound :size="15"/> {{ pullRequest.author }}</span><span class="flex items-center gap-1.5"><GitBranch :size="15"/> {{ pullRequest.branch }} → {{ pullRequest.targetBranch }}</span><span>Opened {{ formatDate(pullRequest.createdAt) }}</span></div></div>
</div>
<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
<SmoothCorners class="border border-[#E3E3E3] bg-white p-4"><div class="text-xs text-[#888]">Files changed</div><div class="mt-1 text-lg font-semibold">{{ pullRequest.filesChanged }}</div></SmoothCorners>
<SmoothCorners class="border border-[#E3E3E3] bg-white p-4"><div class="text-xs text-[#888]">Additions</div><div class="mt-1 flex items-center gap-1 text-lg font-semibold"><Plus :size="15"/>{{ pullRequest.additions }}</div></SmoothCorners>
<SmoothCorners class="border border-[#E3E3E3] bg-white p-4"><div class="text-xs text-[#888]">Deletions</div><div class="mt-1 flex items-center gap-1 text-lg font-semibold"><Minus :size="15"/>{{ pullRequest.deletions }}</div></SmoothCorners>
<SmoothCorners class="border border-[#E3E3E3] bg-white p-4"><div class="text-xs text-[#888]">Commits</div><div class="mt-1 flex items-center gap-1 text-lg font-semibold"><GitCommitHorizontal :size="15"/>{{ pullRequest.commits }}</div></SmoothCorners>
</div>
<SmoothCorners class="border border-[#E3E3E3] bg-white p-6"><div class="flex items-center justify-between gap-4"><h2 class="text-sm font-semibold">Description</h2><a :href="pullRequest.url" target="_blank" rel="noopener noreferrer" class="flex items-center gap-1.5 text-sm text-[#666] hover:text-black">Open GitHub <ExternalLink :size="14"/></a></div><div class="mt-5 whitespace-pre-wrap text-sm leading-7 text-[#555]">{{ pullRequest.body || "No description provided." }}</div></SmoothCorners>
<SmoothCorners class="border border-[#E3E3E3] bg-white p-6"><div class="flex items-center gap-2 text-sm font-semibold"><FileCode2 :size="16"/> Files changed</div><div class="mt-4 text-sm text-[#888]">Open GitHub to inspect the complete file diff and inline review.</div></SmoothCorners>
</div>
</template>
</div>
</template>