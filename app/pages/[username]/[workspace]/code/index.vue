<script setup lang="ts">
import { FileCode2, Folder, Search, ArrowLeft, GitBranch, LoaderCircle } from "@lucide/vue";
import { SmoothCorners } from "@lisse/vue";
definePageMeta({ layout: "use" });
useSeoMeta({ title: "Code" });
type Node={path:string;type:string;size:number|null;sha:string|null};
const route=useRoute(); const workspaceId=route.params.workspace as string;
const tree=ref<Node[]>([]); const selected=ref(""); const content=ref(""); const branch=ref(""); const loading=ref(true); const fileLoading=ref(false); const error=ref(""); const search=ref("");
const files=computed(()=>tree.value.filter(n=>n.type==="blob" && (!search.value || n.path.toLowerCase().includes(search.value.toLowerCase()))));
const folders=computed(()=>{ const s=new Set<string>(); tree.value.filter(n=>n.type==="blob").forEach(n=>{const parts=n.path.split("/"); if(parts.length>1) s.add(parts[0]);}); return [...s]; });
async function loadTree(){ loading.value=true; error.value=""; try{const r=await $fetch<{tree:Node[];branch:string}>("/api/code/tree",{query:{workspaceId}}); tree.value=r.tree; branch.value=r.branch;}catch(e){error.value=e instanceof Error?e.message:"Failed to load repository";}finally{loading.value=false;} }
async function openFile(path:string){selected.value=path; fileLoading.value=true; try{const r=await $fetch<{content:string}>("/api/code/content",{query:{workspaceId,path,branch:branch.value}}); content.value=r.content;}catch(e){content.value=e instanceof Error?e.message:"Failed to load file";}finally{fileLoading.value=false;} }
function lineCount(value:string){return value.split("\n").length}
await loadTree();
</script>
<template>
<div class="flex h-full min-h-0 flex-col">
<div class="flex shrink-0 items-center justify-between border-b border-[#E3E3E3] px-5 py-4">
<div><h1 class="text-base font-semibold text-black">Code</h1><p class="mt-0.5 text-xs text-[#888]">Browse the repository connected to this workspace.</p></div>
<div class="flex items-center gap-2 text-xs text-[#777]"><GitBranch :size="14"/>{{ branch || "—" }}</div>
</div>
<div v-if="loading" class="flex flex-1 items-center justify-center text-sm text-[#888]"><LoaderCircle :size="16" class="mr-2 animate-spin"/>Loading repository…</div>
<div v-else-if="error" class="m-5 rounded-xl border border-[#E3E3E3] bg-white p-5 text-sm text-[#666]">{{ error }}</div>
<div v-else class="grid min-h-0 flex-1 grid-cols-[280px_minmax(0,1fr)]">
<aside class="min-h-0 overflow-y-auto border-r border-[#E3E3E3] bg-white">
<div class="sticky top-0 border-b border-[#E3E3E3] bg-white p-3"><div class="flex items-center gap-2 rounded-lg bg-[#F4F4F4] px-2.5 py-2"><Search :size="14" class="text-[#888]"/><input v-model="search" placeholder="Search files" class="min-w-0 flex-1 bg-transparent text-xs outline-none" /></div></div>
<div class="p-2">
<div v-if="!search" v-for="folder in folders" :key="folder" class="flex items-center gap-2 px-2 py-1.5 text-xs text-[#777]"><Folder :size="14"/> {{ folder }}</div>
<button v-for="file in files" :key="file.path" class="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors hover:bg-[#F4F4F4]" :class="selected===file.path?'bg-[#EAEAEA] text-black':'text-[#666]'" @click="openFile(file.path)"><FileCode2 :size="14" class="shrink-0"/><span class="truncate">{{ file.path }}</span></button>
</div>
</aside>
<main class="min-w-0 overflow-auto bg-[#FAFAFA]">
<div v-if="!selected" class="flex h-full items-center justify-center text-sm text-[#999]">Select a file to inspect its source.</div>
<div v-else-if="fileLoading" class="flex h-full items-center justify-center text-sm text-[#888]"><LoaderCircle :size="16" class="mr-2 animate-spin"/>Loading file…</div>
<div v-else class="min-w-max p-5">
<div class="mb-3 flex items-center justify-between border-b border-[#E3E3E3] pb-3"><span class="font-mono text-xs text-[#555]">{{ selected }}</span><span class="text-xs text-[#999]">{{ lineCount(content) }} lines</span></div>
<pre class="font-mono text-[12px] leading-6 text-[#333]"><code><span v-for="(line,index) in content.split('\n')" :key="index" class="flex"><span class="w-10 shrink-0 select-none pr-4 text-right text-[#B5B5B5]">{{ index+1 }}</span><span class="whitespace-pre">{{ line }}</span></span></code></pre>
</div>
</main>
</div>
</div>
</template>