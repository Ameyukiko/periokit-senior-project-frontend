<script setup lang="ts">
import { Combobox, ComboboxInput, ComboboxOption, ComboboxOptions } from '@headlessui/vue'
import { Check } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { COUNTRY_NAMES } from '@/domain/chart/chart.constants'

defineProps<{
  disabled?: boolean
}>()

const model = defineModel<string>({ default: '' })

// What is typed is kept apart from the chosen value, as Headless UI expects;
// the model only changes when an option is picked.
const query = ref('')

// Free text stays allowed through a "Use …" option: older visits hold values
// like "Thai" that are not country names, and they must still be enterable.
const customValue = computed(() => {
  const text = query.value.trim()
  if (!text) return null
  return COUNTRY_NAMES.some(name => name.toLowerCase() === text.toLowerCase()) ? null : text
})

// Names that start with what was typed come first, then any that contain it.
const matches = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return COUNTRY_NAMES
  const starts = COUNTRY_NAMES.filter(name => name.toLowerCase().startsWith(q))
  const contains = COUNTRY_NAMES.filter(
    name => !name.toLowerCase().startsWith(q) && name.toLowerCase().includes(q),
  )
  return [...starts, ...contains]
})

// Headless UI (v1) leaves placement to us. The list is teleported to <body> so
// the header card (overflow-hidden) cannot clip it, and pinned to the input
// with fixed coordinates: below it, or above when the screen ends first.
const LIST_HEIGHT = 108 // three rows; matches max-h-[108px]
const anchorRef = ref<HTMLElement | null>(null)
const listStyle = ref<Record<string, string>>({})

const placeList = () => {
  const rect = anchorRef.value?.getBoundingClientRect()
  if (!rect) return
  const roomBelow = window.innerHeight - rect.bottom >= LIST_HEIGHT + 8
  listStyle.value = {
    ...(roomBelow
      ? { top: `${rect.bottom + 4}px` }
      : { bottom: `${window.innerHeight - rect.top + 4}px` }),
    left: `${rect.left}px`,
    width: `${rect.width}px`,
  }
}

const onType = (event: Event) => {
  query.value = (event.target as HTMLInputElement).value
  placeList()
}

onMounted(() => {
  window.addEventListener('scroll', placeList, true)
  window.addEventListener('resize', placeList)
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', placeList, true)
  window.removeEventListener('resize', placeList)
})
</script>

<template>
  <!-- Headless UI opens the list only once typing starts, not on focus. -->
  <Combobox v-model="model" :disabled="disabled">
    <div ref="anchorRef" class="relative w-full">
      <ComboboxInput
        autocomplete="off"
        :display-value="(value: unknown) => String(value ?? '')"
        class="bg-slate-50 border border-slate-300 rounded-md px-2 py-1 text-[14px] w-full outline-none focus:ring-2 focus:ring-slate-300 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-100"
        @change="onType"
      />

      <Teleport to="body">
        <ComboboxOptions
          class="fixed bg-white border border-slate-200 rounded-xl shadow-xl z-[210] max-h-[108px] overflow-y-auto p-2 space-y-0.5 outline-none"
          :style="listStyle"
        >
          <ComboboxOption
            v-for="name in matches"
            :key="name"
            v-slot="{ active, selected }"
            :value="name"
            as="template"
          >
            <li
              class="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg text-left text-[13px] cursor-pointer list-none transition-colors"
              :class="active ? 'bg-blue-50 text-[#0052ff] font-bold' : 'text-slate-700'"
            >
              <span class="truncate">{{ name }}</span>
              <Check v-if="selected" class="w-3.5 h-3.5 shrink-0 text-[#0052ff]" />
            </li>
          </ComboboxOption>
          <ComboboxOption v-if="customValue" v-slot="{ active }" :value="customValue" as="template">
            <li
              class="w-full px-2 py-1.5 rounded-lg text-left text-[13px] cursor-pointer list-none truncate transition-colors"
              :class="active ? 'bg-blue-50 text-[#0052ff] font-bold' : 'text-slate-500'"
            >
              Use "{{ customValue }}"
            </li>
          </ComboboxOption>
        </ComboboxOptions>
      </Teleport>
    </div>
  </Combobox>
</template>
