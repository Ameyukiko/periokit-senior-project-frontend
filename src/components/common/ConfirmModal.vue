<script setup lang="ts">
import { LogOut, AlertCircle, X } from "lucide-vue-next";

defineProps<{
  show: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "info" | "warning";
}>();

const emit = defineEmits(["confirm", "cancel"]);
</script>

<template>
  <Transition name="fade">
    <div
      v-if="show"
      class="fixed inset-0 z-9999 flex items-center justify-center p-4"
    >
      <!-- Backdrop -->
      <div
        class="absolute inset-0 bg-black/40 backdrop-blur-sm"
        @click="emit('cancel')"
      ></div>

      <!-- Modal Content -->
      <Transition name="scale">
        <div
          v-if="show"
          class="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
        >
          <!-- Header/Icon Section -->
          <div
            :class="[
              'h-32 flex items-center justify-center relative',
              type === 'danger' ? 'bg-red-50' : 'bg-blue-50',
            ]"
          >
            <div
              class="w-20 h-20 rounded-full flex items-center justify-center shadow-sm"
              :class="
                type === 'danger'
                  ? 'bg-red-500 text-white'
                  : 'bg-[#0052ff] text-white'
              "
            >
              <LogOut v-if="type === 'danger'" class="w-10 h-10" />
              <AlertCircle v-else class="w-10 h-10" />
            </div>

            <button
              @click="emit('cancel')"
              class="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-black/5"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <!-- Body -->
          <div class="p-8 text-center">
            <h3 class="text-2xl font-bold text-gray-900 mb-2">
              {{ title }}
            </h3>
            <p
              class="text-gray-500 font-medium leading-relaxed whitespace-pre-line"
            >
              {{ message }}
            </p>
          </div>

          <!-- Actions -->
          <div class="px-8 pb-8 flex flex-col sm:flex-row gap-3">
            <button
              @click="emit('cancel')"
              class="flex-1 px-6 py-3.5 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all active:scale-95"
            >
              {{ cancelText || "Cancel" }}
            </button>
            <button
              @click="emit('confirm')"
              :class="[
                'flex-1 px-6 py-3.5 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95',
                type === 'danger'
                  ? 'bg-red-500 hover:bg-red-600 shadow-red-200'
                  : 'bg-[#0052ff] hover:bg-[#0042cc] shadow-blue-200',
              ]"
            >
              {{ confirmText || "Confirm" }}
            </button>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>
