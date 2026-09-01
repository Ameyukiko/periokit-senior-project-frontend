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
      class="fixed inset-0 z-[150] bg-black/40 xl:bg-transparent xl:static xl:w-80 xl:sticky xl:top-32 xl:h-[calc(100vh-160px)] xl:shrink-0 flex flex-col justify-end xl:block p-2 xl:p-0"
      @click.self="emit('close')"
    >
      <div class="w-full h-[85vh] xl:h-full transition-transform">
        <ToothSidebar
          :toothId="toothId"
          :toothData="toothData"
          :readonly="readonly"
          @close="emit('close')"
          @update-note="($event) => emit('update-note', $event)"
        />
      </div>
    </aside>
  </Transition>
</template>
