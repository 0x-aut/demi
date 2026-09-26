<script setup lang="ts">

const username= "marvellous";

</script>

<template>
    <div class="font-sans unmodified-font-sans mx-auto flex h-full w-full flex-col px-1 py-0">
        <AppsChatbox :displayName="username" class="min-h-0 flex-1" />
    </div>
</template>