<script setup lang="ts">
import { ref, watch } from 'vue'
import { Trash2 } from 'lucide-vue-next'
import ConfirmModal from '@/components/common/ConfirmModal.vue'

const props = defineProps<{
  note: string
  readonly?: boolean
  isEditing: boolean
}>()

const emit = defineEmits<{
  'update-note': [note: string]
  'update:isEditing': [value: boolean]
}>()

const noteInput = ref('')
const showCancelConfirmModal = ref(false)

watch(() => props.note, () => {
  if (!props.isEditing) {
    noteInput.value = ''
  }
})

watch(() => props.isEditing, (newVal) => {
  if (newVal) {
    noteInput.value = props.note || ''
  }
})

const startEditing = () => {
  noteInput.value = props.note || ''
  emit('update:isEditing', true)
}

const saveNote = () => {
  emit('update-note', noteInput.value)
  emit('update:isEditing', false)
}

const deleteNote = () => {
  emit('update-note', '')
  emit('update:isEditing', false)
  noteInput.value = ''
}

const cancelEditing = () => {
  const originalNote = props.note || ''
  if (noteInput.value !== originalNote) {
    showCancelConfirmModal.value = true
    return
  }

  emit('update:isEditing', false)
  noteInput.value = ''
}

const confirmCancelNote = () => {
  showCancelConfirmModal.value = false
  emit('update:isEditing', false)
  noteInput.value = ''
}
</script>

<template>
  <section v-if="note && !isEditing" class="bg-yellow-50/50 border border-yellow-100 rounded-3xl p-6 shadow-sm group relative">
    <div class="flex justify-between items-start mb-3">
      <h3 class="text-[11px] font-black text-yellow-600 uppercase tracking-[0.15em]">Note</h3>
      <div v-if="!readonly" class="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
        <button @click="startEditing" class="p-1 hover:bg-yellow-100 rounded text-yellow-600 transition-all" title="Edit note">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
        </button>
        <button @click="deleteNote" class="p-1 hover:bg-red-100 rounded text-red-500 transition-all" title="Delete note">
          <Trash2 :size="12" />
        </button>
      </div>
    </div>
    <p class="text-xs font-bold text-slate-600 leading-relaxed whitespace-pre-wrap">{{ note }}</p>
  </section>

  <section v-if="isEditing" class="bg-white border border-[#0052ff]/20 rounded-3xl p-6 shadow-xl ring-4 ring-[#0052ff]/5">
    <h3 class="text-[11px] font-black text-[#0052ff] uppercase tracking-[0.15em] mb-4">Clinical Note</h3>
    <textarea
      v-model="noteInput"
      placeholder="Enter clinical observations, findings, or remarks for this tooth..."
      class="w-full min-h-30 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0052ff]/10 focus:border-[#0052ff]/30 transition-all resize-none mb-4"
      autofocus
    ></textarea>
    <div class="flex gap-3">
      <button
        @click="saveNote"
        class="flex-1 py-3 bg-[#0052ff] hover:bg-[#0041cc] text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-200"
      >
        Save Note
      </button>
      <button
        v-if="note"
        @click="deleteNote"
        class="px-4 py-3 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-1.5"
        title="Delete note"
      >
        <Trash2 :size="12" />
      </button>
      <button
        @click="cancelEditing"
        class="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
      >
        Cancel
      </button>
    </div>
  </section>

  <ConfirmModal
    :show="showCancelConfirmModal"
    title="Cancel Editing"
    message="Are you sure you want to cancel?<br/>Any unsaved changes will be lost."
    confirm-text="Discard Changes"
    cancel-text="Continue Editing"
    type="danger"
    @confirm="confirmCancelNote"
    @cancel="showCancelConfirmModal = false"
  />
</template>
