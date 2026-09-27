<script setup lang="ts">
import type { ChangeProposal } from "~/composables/useChat"
// ChangeProposal is defined and exported from the composable

defineProps<{
  proposal: ChangeProposal
}>()

const actionLabel: Record<string, string> = {
  create: "Create",
  modify: "Modify",
  delete: "Delete",
}

const actionClass: Record<string, string> = {
  create: "bg-[#E6F4EA] text-[#1E7E34]",
  modify: "bg-[#EAF0FF] text-[#2B5CE6]",
  delete: "bg-[#FFF1F1] text-[#B42318]",
}
</script>

<template>
  <div class="mt-2 rounded-2xl rounded-tl-md border border-[#E5E7EB] bg-[#F7F8FA] p-4 font-sans text-sm text-[#1f2328]">
    <!-- Header -->
    <div class="mb-3 flex items-center gap-x-2">
      <span class="rounded-md bg-[#1f2328] px-2 py-0.5 text-xs font-medium text-white tracking-wide">
        PLAN
      </span>
      <p class="font-medium leading-snug">{{ proposal.summary }}</p>
    </div>

    <!-- Reason -->
    <p class="mb-3 text-xs leading-5 text-[#57606a]">{{ proposal.reason }}</p>

    <!-- File entries -->
    <ul class="flex flex-col gap-y-2">
      <li
        v-for="(file, i) in proposal.files"
        :key="i"
        class="rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5"
      >
        <div class="flex items-center gap-x-2">
          <!-- Action badge -->
          <span
            :class="[
              'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
              actionClass[file.action] ?? 'bg-[#F0F0F0] text-[#555]',
            ]"
          >
            {{ actionLabel[file.action] ?? file.action }}
          </span>
          <!-- File path -->
          <code class="truncate text-xs font-mono text-[#1f2328]">{{ file.path }}</code>
        </div>

        <!-- Explanation -->
        <p class="mt-1.5 text-xs leading-5 text-[#57606a]">{{ file.explanation }}</p>

        <!-- Symbols -->
        <div v-if="file.symbols?.length" class="mt-1.5 flex flex-wrap gap-1">
          <span
            v-for="sym in file.symbols"
            :key="sym"
            class="rounded bg-[#F0F0F0] px-1.5 py-0.5 font-mono text-[10px] text-[#555]"
          >
            {{ sym }}
          </span>
        </div>
      </li>
    </ul>
  </div>
</template>
