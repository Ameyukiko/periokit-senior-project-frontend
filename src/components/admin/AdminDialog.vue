<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

/** Bare modal shell: overlay, Escape, focus trap and return focus. Content renders its own header. */
const props = defineProps<{ show: boolean; busy?: boolean; width?: string; z?: string }>()
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
    <div v-if="show" class="fixed inset-0 flex items-center justify-center p-4" :class="z ?? 'z-50'">
      <div class="absolute inset-0 bg-slate-900/30" @click="close" />
      <div
        ref="panel"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        class="relative bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto flex flex-col"
        :class="width ?? 'w-100 max-w-[95vw]'"
      >
        <slot :title-id="titleId" :close="close" />
      </div>
    </div>
  </Teleport>
</template>
