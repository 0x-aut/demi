<script setup lang="ts">
import { SmoothCorners } from "@lisse/vue"
import { ChevronDown, Check } from "@lucide/vue"

const emit = defineEmits<{ select: [model: string] }>()

// Maps display labels → actual OpenAI model IDs
const MODELS: { label: string; id: string }[] = [
  { label: "GPT-6 Luna", id: "gpt-6-luna" },
  { label: "GPT-6 Sol", id: "gpt-6-sol" },
  // { label: "GPT-6 Astra",  id: "gpt-6-astra" }, Not enough credits to test this
]

const selected  = ref(MODELS[0]!)
const isOpen    = ref(false)
const pillRef   = ref<HTMLButtonElement | null>(null)
const dropdownRef = ref<HTMLElement | null>(null)

// Teleported dropdown position (fixed, relative to viewport)
const dropdownStyle = ref<Record<string, string>>({})

function calculatePosition() {
  const pill = pillRef.value
  if (!pill) return

  const rect        = pill.getBoundingClientRect()
  const DROPDOWN_H  = 120          // estimated dropdown height
  const GAP         = 6            // gap between pill and dropdown
  const spaceBelow  = window.innerHeight - rect.bottom

  if (spaceBelow < DROPDOWN_H && rect.top > spaceBelow) {
    // Open above
    dropdownStyle.value = {
      position:  "fixed",
      bottom:    `${window.innerHeight - rect.top + GAP}px`,
      right:     `${window.innerWidth  - rect.right}px`,
    }
  } else {
    // Open below
    dropdownStyle.value = {
      position: "fixed",
      top:      `${rect.bottom + GAP}px`,
      right:    `${window.innerWidth - rect.right}px`,
    }
  }
}

function toggleDropdown() {
  if (isOpen.value) {
    isOpen.value = false
  } else {
    calculatePosition()
    isOpen.value = true
  }
}

function selectModel(model: { label: string; id: string }) {
  selected.value = model
  isOpen.value   = false
  emit("select", model.id)
}

function handleOutsideClick(event: MouseEvent) {
  const target = event.target as Node
  if (
    pillRef.value?.contains(target) ||
    dropdownRef.value?.contains(target)
  ) return
  isOpen.value = false
}

onMounted(() => {
  document.addEventListener("mousedown", handleOutsideClick)
  emit("select", selected.value.id)
})
onUnmounted(() => document.removeEventListener("mousedown", handleOutsideClick))
</script>

<template>
  <!-- Pill trigger -->
  <button
    ref="pillRef"
    type="button"
    :aria-expanded="isOpen"
    aria-haspopup="listbox"
    class="group flex items-center gap-x-1 rounded-full bg-[#F4F4F4] px-2.5 py-1 transition-colors duration-100 hover:bg-[#EBEBEB]"
    @click="toggleDropdown"
  >
    <span class="font-sans text-xs font-medium text-[#6B6B6B] transition-colors duration-100 group-hover:text-[#121212]">
      {{ selected.label }}
    </span>
    <ChevronDown
      :size="12"
      :stroke-width="1.8"
      class="text-[#6B6B6B] transition-colors duration-100 group-hover:text-[#121212]"
    />
  </button>

  <!-- Dropdown — teleported to body to escape any overflow/clip ancestor -->
  <Teleport to="body">
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
        as-child
        :corners="{ radius: 12, smoothing: 0.6 }"
      >
        <div
          ref="dropdownRef"
          role="listbox"
          aria-label="Select model"
          :style="dropdownStyle"
          class="z-[9999] min-w-[160px] border border-[#E3E3E3] bg-[#FFFFFF] py-1 shadow-md"
        >
          <button
            v-for="model in MODELS"
            :key="model.id"
            type="button"
            role="option"
            :aria-selected="selected.id === model.id"
            class="group flex w-full items-center justify-between gap-x-2 px-3 py-1.5 transition-colors duration-100 hover:bg-[#F4F4F4]"
            @click="selectModel(model)"
          >
            <span
              :class="[
                'font-sans text-sm transition-colors duration-100',
                selected.id === model.id ? 'font-medium text-[#121212]' : 'font-normal text-[#6B6B6B] group-hover:text-[#121212]'
              ]"
            >
              {{ model.label }}
            </span>
            <Check
              v-if="selected.id === model.id"
              :size="12"
              :stroke-width="2"
              class="shrink-0 text-[#121212]"
            />
          </button>
        </div>
      </SmoothCorners>
    </Transition>
  </Teleport>
</template>
