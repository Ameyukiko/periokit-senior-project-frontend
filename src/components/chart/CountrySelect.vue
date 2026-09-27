<script setup lang="ts">
import { Check } from 'lucide-vue-next'
import { computed, nextTick, ref } from 'vue'
import { COUNTRY_NAMES } from '@/domain/chart/chart.constants'

const props = defineProps<{
  disabled?: boolean
}>()

// Free text stays allowed: older visits hold values like "Thai" that are not
// country names, and they must still read back unchanged.
const model = defineModel<string>({ default: '' })

const open = ref(false)
const highlighted = ref(0)
const listRef = ref<HTMLElement | null>(null)

// Names that start with what was typed come first, then any that contain it.
const matches = computed(() => {
  const query = model.value.trim().toLowerCase()
  if (!query) return COUNTRY_NAMES
  const starts = COUNTRY_NAMES.filter(name => name.toLowerCase().startsWith(query))
  const contains = COUNTRY_NAMES.filter(
    name => !name.toLowerCase().startsWith(query) && name.toLowerCase().includes(query),
  )
  return [...starts, ...contains]
})

const show = () => {
  if (props.disabled) return
  open.value = true
  highlighted.value = 0
}

const choose = (name: string) => {
  model.value = name
  open.value = false
}

const scrollToHighlighted = async () => {
  await nextTick()
  listRef.value?.querySelector('[data-highlighted="true"]')?.scrollIntoView({ block: 'nearest' })
}

const onKeydown = (event: KeyboardEvent) => {
  if (!open.value && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
    show()
    return
  }
  if (!open.value) return

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    highlighted.value = Math.min(highlighted.value + 1, matches.value.length - 1)
    scrollToHighlighted()
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    highlighted.value = Math.max(highlighted.value - 1, 0)
    scrollToHighlighted()
  } else if (event.key === 'Enter') {
    const name = matches.value[highlighted.value]
    if (name) {
      event.preventDefault()
      choose(name)
    }
  } else if (event.key === 'Escape') {
    open.value = false
  }
}

const onInput = () => {
  open.value = true
  highlighted.value = 0
}
</script>

<template>
  <div class="relative w-full">
    <input
      v-model="model"
      type="text"
      autocomplete="off"
      placeholder="Type to search"
      :disabled="disabled"
      class="bg-slate-50 border border-slate-300 rounded-md px-2 py-1 text-[14px] w-full outline-none focus:ring-2 focus:ring-slate-300 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-100"
      @focus="show"
      @input="onInput"
      @keydown="onKeydown"
      @blur="open = false"
    />

    <!-- mousedown.prevent keeps focus in the input, so the blur above does not
         close the list before the click on an option lands. -->
    <div
      v-if="open"
      ref="listRef"
      class="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto p-2 space-y-0.5"
      @mousedown.prevent
    >
      <div v-if="matches.length === 0" class="px-2 py-3 text-center text-[13px] text-slate-500">
        No country found — what you typed is kept
      </div>
      <button
        v-for="(name, index) in matches"
        :key="name"
        type="button"
        tabindex="-1"
        :data-highlighted="index === highlighted"
        class="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg text-left text-[13px] transition-colors"
        :class="index === highlighted ? 'bg-blue-50 text-[#0052ff] font-bold' : 'text-slate-700 hover:bg-slate-50'"
        @mouseenter="highlighted = index"
        @click="choose(name)"
      >
        <span class="truncate">{{ name }}</span>
        <Check v-if="name === model" class="w-3.5 h-3.5 shrink-0 text-[#0052ff]" />
      </button>
    </div>
  </div>
</template>
