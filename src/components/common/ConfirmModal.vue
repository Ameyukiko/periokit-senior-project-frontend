<script setup lang="ts">
import { LogOut, AlertCircle } from "lucide-vue-next";

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
          class="relative bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.12)] w-full max-w-lg overflow-hidden"
        >
          <!-- Background Glow Effect -->
          <div 
            class="absolute -top-20 -right-20 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none transition-colors"
            :class="type === 'danger' ? 'bg-red-500' : 'bg-[#0052ff]'"
          ></div>

          <div class="p-8 relative z-10">
            <!-- Header/Icon Section -->
            <div class="flex justify-between items-start mb-2">
              <h3 
                class="text-2xl font-bold pr-4"
                :class="type === 'danger' ? 'text-red-600' : 'text-[#0052ff]'"
              >
                {{ title }}
              </h3>
              <div 
                :class="type === 'danger' ? 'text-red-500' : 'text-[#0052ff]'"
                class="flex-shrink-0"
              >
                <LogOut v-if="type === 'danger'" class="w-8 h-8" />
                <AlertCircle v-else class="w-8 h-8" />
              </div>
            </div>

            <!-- Body -->
            <p
              class="text-gray-500 font-semibold leading-relaxed whitespace-pre-line mb-8"
              v-html="message"
            ></p>

            <!-- Actions -->
            <div class="flex flex-col sm:flex-row gap-3">
              <button
                @click="emit('confirm')"
                :class="[
                  'flex-1 px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95',
                  type === 'danger'
                    ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                    : 'bg-[#0052ff] hover:bg-[#0042cc] shadow-blue-500/20',
                ]"
              >
                {{ confirmText || "Confirm" }}
              </button>
              <button
                @click="emit('cancel')"
                class="flex-1 px-6 py-3 rounded-xl font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-all active:scale-95"
              >
                {{ cancelText || "Cancel" }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

