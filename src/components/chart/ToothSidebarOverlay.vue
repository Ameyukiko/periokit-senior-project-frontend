<script setup lang="ts">
import ToothSidebar from "./ToothSidebar.vue";

defineProps<{
  isOpen: boolean;
  toothId: string | number | null;
  toothData: any;
  readonly?: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "update-note", payload: { id: string | number; note: string }): void;
}>();
</script>

<template>
  <Transition
    enter-active-class="transition ease-out duration-300"
    enter-from-class="translate-x-full opacity-0"
    enter-to-class="translate-x-0 opacity-100"
    leave-active-class="transition ease-in duration-200"
    leave-from-class="translate-x-0 opacity-100"
    leave-to-class="translate-x-full opacity-0"
  >
    <aside
      v-if="isOpen && toothId"
      class="w-80 sticky top-32 h-[calc(100vh-160px)] shrink-0"
    >
      <ToothSidebar
        :toothId="toothId"
        :toothData="toothData"
        :readonly="readonly"
        @close="emit('close')"
        @update-note="($event) => emit('update-note', $event)"
      />
    </aside>
  </Transition>
</template>
