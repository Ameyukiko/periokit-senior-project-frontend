<script setup lang="ts">
import { computed } from 'vue'
import { PROGNOSIS_REFERENCES, type PrognosisReferenceType } from '@/domain/chart/prognosis.references'

const emit = defineEmits<{
  'update:modelValue': [value: PrognosisReferenceType | null]
}>()

const props = defineProps<{
  modelValue: PrognosisReferenceType | null
}>()

const activeReference = computed(() => props.modelValue ? PROGNOSIS_REFERENCES[props.modelValue] : null)

const close = () => {
  emit('update:modelValue', null)
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
        @click="close"
      >
        <div
          class="bg-white w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-4xl shadow-2xl"
          @click.stop
        >
          <div class="sticky top-0 bg-white/80 backdrop-blur-md px-8 py-6 border-b border-slate-50 flex items-center justify-between z-10">
            <h2 class="text-lg font-black text-slate-800 tracking-tight">
              {{ activeReference?.title }}
            </h2>
            <button @click="close" class="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:text-slate-600 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div class="p-8 space-y-10">
            <div v-if="activeReference">
              <div class="flex items-center gap-3 mb-5">
                <span
                  class="text-white text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider"
                  :class="activeReference.badgeClass"
                >
                  Classification
                </span>
                <h3 class="text-sm font-black text-slate-800 uppercase tracking-wide">Prognosis Criteria</h3>
              </div>
              <div class="overflow-hidden border border-slate-100 rounded-2xl shadow-sm">
                <table class="w-full text-left border-collapse">
                  <thead>
                    <tr class="bg-slate-50">
                      <th class="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 w-32">Prognosis</th>
                      <th class="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">{{ activeReference.detailHeader }}</th>
                    </tr>
                  </thead>
                  <tbody class="text-[11px] font-medium text-slate-600">
                    <tr
                      v-for="(row, index) in activeReference.rows"
                      :key="row.prognosis"
                      class="hover:bg-slate-50/50 transition-colors"
                      :class="{ 'border-b border-slate-50': index < activeReference.rows.length - 1 }"
                    >
                      <td class="px-4 py-4 font-black" :class="row.prognosisClass">{{ row.prognosis }}</td>
                      <td class="px-4 py-4 leading-relaxed">{{ row.description }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div class="p-8 bg-slate-50/50 border-t border-slate-50 text-center rounded-b-4xl">
            <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">Reference: Clinical Periodontology Standards</p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
