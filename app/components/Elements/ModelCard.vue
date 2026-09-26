<script setup lang="ts">
import { SmoothCorners } from "@lisse/vue"
import { ChevronDown, Check } from "@lucide/vue"

const MODELS = [
  "ChatGPT Sol 5.1",
  "ChatGPT Astra 6",
  "ChatGPT Luna 5.1",
]

const selectedModel = ref(MODELS[0])
const isOpen = ref(false)
const pillRef = ref<HTMLButtonElement | null>(null)
const dropdownRef = ref<HTMLDivElement | null>(null)
const openAbove = ref(false)

const DROPDOWN_MIN_HEIGHT = 120

function calculatePosition() {
  const pill = pillRef.value
  if (!pill) return

  const rect = pill.getBoundingClientRect()
  const spaceBelow = window.innerHeight - rect.bottom
  const spaceAbove = rect.top

  openAbove.value =
    spaceBelow < DROPDOWN_MIN_HEIGHT && spaceAbove > spaceBelow
}

async function toggleDropdown() {
  if (!isOpen.value) {
    calculatePosition()
    isOpen.value = true
    await nextTick()
  } else {
    isOpen.value = false
  }
}

function selectModel(model: string) {
  selectedModel.value = model
  isOpen.value = false
}

function handleOutsideClick(event: MouseEvent) {
  const target = event.target as Node
  if (
    pillRef.value?.contains(target) ||
    dropdownRef.value?.contains(target)
  ) return
  isOpen.value = false
}

onMounted(() => document.addEventListener("mousedown", handleOutsideClick))
onUnmounted(() => document.removeEventListener("mousedown", handleOutsideClick))
</script>

<template>
  <div class="relative">
    <!-- Pill trigger -->
    <SmoothCorners
      as-child
      :corners="{ radius: 999 }"
    >
      <button
        ref="pillRef"
        type="button"
        :aria-expanded="isOpen"
        aria-haspopup="listbox"
        class="group flex items-center gap-x-1 bg-[#F4F4F4] px-2.5 py-1 transition-colors duration-100 hover:bg-[#EBEBEB]"
        @click="toggleDropdown"
      >
        <span class="font-sans text-xs font-medium text-[#6B6B6B] transition-colors duration-100 group-hover:text-[#121212]">
          {{ selectedModel }}
        </span>
        <ChevronDown
          :size="12"
          :stroke-width="1.8"
          class="text-[#6B6B6B] transition-colors duration-100 group-hover:text-[#121212]"
        />
      </button>
    </SmoothCorners>

    <!-- Dropdown -->
    <Transition
      enter-active-class="transition-all duration-100 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition-all duration-75 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <SmoothCorners
        v-if="isOpen"
        ref="dropdownRef"
        as-child
        :corners="{ radius: 12, smoothing: 0.6 }"
      >
        <div
          role="listbox"
          :aria-label="'Select model'"
          :class="[
            'absolute z-50 min-w-[160px] border border-[#E3E3E3] bg-[#FFFFFF] py-1 shadow-sm',
            openAbove ? 'bottom-full mb-1.5 origin-bottom' : 'top-full mt-1.5 origin-top'
          ]"
        >
          <button
            v-for="model in MODELS"
            :key="model"
            type="button"
            role="option"
            :aria-selected="selectedModel === model"
            class="group flex w-full items-center justify-between gap-x-2 px-3 py-1.5 transition-colors duration-100 hover:bg-[#F4F4F4]"
            @click="selectModel(model)"
          >
            <span
              :class="[
                'font-sans text-sm transition-colors duration-100',
                selectedModel === model ? 'font-medium text-[#121212]' : 'font-normal text-[#6B6B6B] group-hover:text-[#121212]'
              ]"
            >
              {{ model }}
            </span>
            <Check
              v-if="selectedModel === model"
              :size="12"
              :stroke-width="2"
              class="shrink-0 text-[#121212]"
            />
          </button>
        </div>
      </SmoothCorners>
    </Transition>
  </div>
</template>
