<script setup lang="ts">

definePageMeta({
  layout: "use"
})

useSeoMeta({
  title: "Workspace"
})

const route = useRoute()
const workspaceId = computed(() => String(route.params.workspace ?? route.params.workspaceId ?? route.path.split("/")[2] ?? ""))
const username = "marvellous"
</script>

<template>
  <div class="font-sans unmodified-font-sans mx-auto flex h-full w-full flex-col px-1 py-0">
    <AppsChatbox :displayName="username" :workspaceId="workspaceId" class="min-h-0 flex-1" />
  </div>
</template>
