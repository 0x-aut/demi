<script setup lang="ts">
import { SmoothCorners } from "@lisse/vue";
import {
  ChevronDown,
  House,
  MessagesSquare,
  GitPullRequestArrow,
  FileCode2,
  Settings,
  MessageSquareText,
} from "@lucide/vue";

const route = useRoute();

const routeParts = computed(() => route.path.split("/").filter(Boolean))
const username = computed(() => String(route.params.username ?? routeParts.value[0] ?? ""))
const workspace = computed(() => String(route.params.workspace ?? route.params.workspaceId ?? routeParts.value[1] ?? ""))

const workspaceNavigation = computed(() => [
  {
    name: "Home",
    to: `/${username.value}/${workspace.value}/home`,
    icon: House,
    tooltip: "Workspace home",
  },
  {
    name: "Sessions",
    to: `/${username.value}/${workspace.value}/sessions`,
    icon: MessagesSquare,
    tooltip: "Browse past sessions",
  },
  {
    name: "Review",
    to: `/${username.value}/${workspace.value}/review`,
    icon: GitPullRequestArrow,
    tooltip: "Review agent activity",
  },
  {
    name: "Code",
    to: `/${username.value}/${workspace.value}/code`,
    icon: FileCode2,
    tooltip: "Browse repository code",
  },
]);

const settingsNavigation = computed(() => [
  {
    name: "Settings",
    to: `/${username.value}/${workspace.value}/settings`,
    icon: Settings,
    tooltip: "Workspace settings",
  },
]);

const recentOpen = ref(true);

type RecentSession = {
  id: string;
  title: string;
  to: string;
};

const recentSessions = ref<RecentSession[]>([]);
</script>

<template>
  <main
    class="unmodified-font-sans flex h-screen w-full justify-start bg-[#F4F4F4] p-2.5"
  >
    <aside class="flex w-55 shrink-0 flex-col py-2.5 pr-2.5 max-md:hidden">
      <div class="mb-5 flex items-center justify-between">
        <SmoothCorners as-child :corners="{ radius: 999 }">
          <button
            type="button"
            class="flex group items-center gap-x-1.5 px-1 py-0.75 transition-colors duration-100 hover:bg-[#EBEBEB]"
          >
            <SmoothCorners as-child :corners="{ radius: 7, smoothing: 1 }">
              <div class="flex h-6 w-6 shrink-0 items-center justify-center bg-[#4169E1]">
                <span class="font-sans text-xs font-semibold leading-none text-white">
                  {{ username.slice(0, 1).toUpperCase() || "?" }}
                </span>
              </div>
            </SmoothCorners>
            <span class="font-sans text-sm font-medium text-[#6B6B6B] group-hover:text-[#121212] duration-100">
              {{ username }}
            </span>
            <ChevronDown :size="14" :stroke-width="1.5" class="text-[#6B6B6B] duration-100 group-hover:text-[#121212]" />
          </button>
        </SmoothCorners>
      </div>

      <nav class="flex flex-col gap-y-0.5">
        <div v-for="item in workspaceNavigation" :key="item.to" class="relative group">
          <SmoothCorners as-child :corners="{ radius: 10, smoothing: 0.6 }">
            <NuxtLink
              :to="item.to"
              :class="[
                'flex items-center gap-x-1.5 px-2.5 py-1 transition-colors duration-100',
                route.path === item.to || route.path.startsWith(item.to) ? 'bg-[#E3E3E3]' : 'hover:bg-[#EBEBEB]'
              ]"
            >
              <component :is="item.icon" :size="14" :stroke-width="1.8" :class="[
                'transition-colors duration-100',
                route.path === item.to || route.path.startsWith(item.to) ? 'text-[#121212]' : 'text-[#6B6B6B] group-hover:text-[#121212]'
              ]" />
              <span :class="[
                'unmodified-font-sans text-sm font-normal transition-colors duration-100',
                route.path === item.to || route.path.startsWith(item.to) ? 'text-[#121212]' : 'text-[#6B6B6B] group-hover:text-[#121212]'
              ]">{{ item.name }}</span>
            </NuxtLink>
          </SmoothCorners>
          <ElementsNavTooltip :text="item.tooltip" />
        </div>
      </nav>

      <div class="mt-6 flex flex-col gap-y-1">
        <button
          type="button"
          class="group flex items-center justify-between px-2.5 py-0.5 transition-colors duration-100"
          @click="recentOpen = !recentOpen"
        >
          <span class="unmodified-font-sans text-xs font-medium text-[#9A9A9A] transition-colors duration-100 group-hover:text-[#6B6B6B]">Recent</span>
          <ChevronDown :size="12" :stroke-width="2" :class="[
            'text-[#9A9A9A] transition-all duration-150 group-hover:text-[#6B6B6B]',
            recentOpen ? 'rotate-0' : '-rotate-90'
          ]" />
        </button>

        <Transition
          enter-active-class="transition-all duration-150 ease-out overflow-hidden"
          enter-from-class="opacity-0 max-h-0"
          enter-to-class="opacity-100 max-h-96"
          leave-active-class="transition-all duration-100 ease-in overflow-hidden"
          leave-from-class="opacity-100 max-h-96"
          leave-to-class="opacity-0 max-h-0"
        >
          <div v-if="recentOpen" class="flex flex-col gap-y-0.5">
            <template v-if="recentSessions.length > 0">
              <SmoothCorners v-for="session in recentSessions" :key="session.id" as-child :corners="{ radius: 10, smoothing: 0.6 }">
                <NuxtLink
                  :to="session.to"
                  :class="[
                    'group flex items-center gap-x-1.5 px-2.5 py-1 transition-colors duration-100',
                    route.path === session.to ? 'bg-[#E3E3E3]' : 'hover:bg-[#EBEBEB]'
                  ]"
                >
                  <MessageSquareText :size="14" :stroke-width="1.8" :class="[
                    'shrink-0 transition-colors duration-100',
                    route.path === session.to ? 'text-[#121212]' : 'text-[#6B6B6B] group-hover:text-[#121212]'
                  ]" />
                  <span :class="[
                    'unmodified-font-sans truncate text-sm font-normal transition-colors duration-100',
                    route.path === session.to ? 'text-[#121212]' : 'text-[#6B6B6B] group-hover:text-[#121212]'
                  ]">{{ session.title }}</span>
                </NuxtLink>
              </SmoothCorners>
            </template>
            <p v-else class="unmodified-font-sans px-2.5 py-1 text-xs text-[#BBBBBB]">No recent sessions yet.</p>
          </div>
        </Transition>
      </div>

      <nav class="flex flex-col gap-y-0.5 mt-auto">
        <div v-for="item in settingsNavigation" :key="item.to" class="relative group">
          <SmoothCorners as-child :corners="{ radius: 10, smoothing: 0.6 }">
            <NuxtLink
              :to="item.to"
              :class="[
                'flex items-center gap-x-1.5 px-2.5 py-1 transition-colors duration-100',
                route.path === item.to || route.path.startsWith(item.to) ? 'bg-[#E3E3E3]' : 'hover:bg-[#EBEBEB]'
              ]"
            >
              <component :is="item.icon" :size="14" :stroke-width="1.8" :class="[
                'transition-colors duration-100',
                route.path === item.to || route.path.startsWith(item.to) ? 'text-[#121212]' : 'text-[#6B6B6B] group-hover:text-[#121212]'
              ]" />
              <span :class="[
                'unmodified-font-sans text-sm font-normal transition-colors duration-100',
                route.path === item.to || route.path.startsWith(item.to) ? 'text-[#121212]' : 'text-[#6B6B6B] group-hover:text-[#121212]'
              ]">{{ item.name }}</span>
            </NuxtLink>
          </SmoothCorners>
          <ElementsNavTooltip :text="item.tooltip" />
        </div>
      </nav>
    </aside>

    <section class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[10px] border border-[#E3E3E3] bg-[#FAFAFA]">
      <section class="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        <NuxtPage />
      </section>
    </section>
  </main>
</template>
