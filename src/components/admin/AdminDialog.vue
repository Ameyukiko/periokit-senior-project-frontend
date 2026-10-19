<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { X } from 'lucide-vue-next'

const props = defineProps<{ show: boolean; title: string; busy?: boolean; width?: string }>()
const emit = defineEmits<{ close: [] }>()

const panel = ref<HTMLElement | null>(null)
const titleId = `admin-dialog-${Math.random().toString(36).slice(2, 8)}`
let returnFocus: HTMLElement | null = null

function close() {
  if (!props.busy) emit('close')
}

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea, [href], [tabindex]:not([tabindex="-1"])'

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') return close()
  if (e.key !== 'Tab' || !panel.value) return
  const items = [...panel.value.querySelectorAll<HTMLElement>(FOCUSABLE)]
  if (!items.length) return
  const first = items[0]
  const last = items[items.length - 1]
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}

watch(
  () => props.show,
  async (open) => {
    if (!open) {
      document.removeEventListener('keydown', onKeyDown)
      returnFocus?.focus()
      return
    }
    returnFocus = document.activeElement as HTMLElement | null
    document.addEventListener('keydown', onKeyDown)
    await nextTick()
    const target = panel.value?.querySelector<HTMLElement>('[autofocus]') ?? panel.value?.querySelector<HTMLElement>(FOCUSABLE)
    target?.focus()
  },
  { immediate: true },
)

onBeforeUnmount(() => document.removeEventListener('keydown', onKeyDown))
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="close" />
      <div
        ref="panel"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        class="relative bg-white rounded-2xl shadow-2xl w-full max-h-[90vh] overflow-y-auto"
        :class="width ?? 'max-w-lg'"
      >
        <header class="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 :id="titleId" class="text-lg font-bold text-slate-800">{{ title }}</h2>
          <button type="button" class="p-1 rounded-lg text-slate-400 hover:bg-slate-100" aria-label="Close" :disabled="busy" @click="close">
            <X class="w-5 h-5" />
          </button>
        </header>
        <div class="px-6 pb-6">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>
