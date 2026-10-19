<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { Info, Pencil, RotateCcw, Trash2, UserCheck, UserMinus } from 'lucide-vue-next'

const ITEMS = [
  { icon: Pencil, color: 'text-[#0052ff]', title: 'Edit', text: "Change name, student ID or role. Email can't be changed." },
  { icon: UserMinus, color: 'text-amber-500', title: 'Deactivate', text: 'Blocks sign-in. Account stays in the list. Undo with Reactivate.' },
  { icon: UserCheck, color: 'text-emerald-600', title: 'Reactivate', text: 'Lets a deactivated user sign in again.' },
  { icon: Trash2, color: 'text-red-500', title: 'Delete', text: 'Hides the account and blocks sign-in. Records are kept. Restorable from the Deleted filter.' },
  { icon: RotateCcw, color: 'text-[#0052ff]', title: 'Restore', text: 'Brings a deleted account back as Deactivated.' },
]

const open = ref(false)
const root = ref<HTMLElement | null>(null)
const onClick = (e: MouseEvent) => {
  if (!root.value?.contains(e.target as Node)) open.value = false
}
const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') open.value = false
}
onMounted(() => {
  document.addEventListener('click', onClick)
  document.addEventListener('keydown', onKey)
})
onUnmounted(() => {
  document.removeEventListener('click', onClick)
  document.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div ref="root" class="relative">
    <button
      type="button"
      title="Key"
      aria-label="Action key"
      :aria-expanded="open"
      class="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm hover:bg-slate-50"
      @click="open = !open"
    >
      <Info class="w-5 h-5 text-[#0052ff]" />
    </button>
    <div v-if="open" class="absolute right-0 top-full mt-2 w-65 bg-white rounded-2xl border border-slate-200 shadow-xl p-4 flex flex-col gap-3 text-[11px] text-slate-500 z-30">
      <p class="font-bold text-slate-400 uppercase tracking-wide">Key</p>
      <div v-for="item in ITEMS" :key="item.title" class="flex gap-2.5">
        <component :is="item.icon" class="w-4 h-4 shrink-0 mt-0.5" :class="item.color" />
        <div><p class="font-bold text-slate-700 text-[12px]">{{ item.title }}</p><p>{{ item.text }}</p></div>
      </div>
      <div class="flex gap-2.5 pt-3 border-t border-slate-100">
        <Trash2 class="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
        <div><p class="font-bold text-slate-700 text-[12px]">Gray icon</p><p>Not available, e.g. on your own account.</p></div>
      </div>
    </div>
  </div>
</template>
