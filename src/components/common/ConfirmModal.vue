<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from "vue";
import { LogOut, AlertCircle, Loader2 } from "lucide-vue-next";

const props = defineProps<{
  show: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "info" | "warning";
  /**
   * The confirmed action is still running. Both buttons lock and the dialog
   * refuses to close — closing it mid-request would leave the screen saying one
   * thing while the request finishes saying another.
   */
  busy?: boolean;
  busyText?: string;
}>();

const emit = defineEmits(["confirm", "cancel"]);

/** Esc and the backdrop are the same answer as Cancel, and are refused alike. */
function requestCancel() {
  if (props.busy) return;
  emit("cancel");
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key === "Escape") requestCancel();
}

const confirmButton = ref<HTMLButtonElement | null>(null);
const cancelButton = ref<HTMLButtonElement | null>(null);

// Only listened for while the dialog is up, so a closed one never swallows Esc
// from the page behind it.
watch(
  () => props.show,
  async (open) => {
    if (!open) {
      document.removeEventListener("keydown", onKeyDown);
      return;
    }
    document.addEventListener("keydown", onKeyDown);
    await nextTick();
    // A dialog that can destroy something opens with the safe answer under the
    // cursor, so Return keeps what is there instead of throwing it away. Every
    // other dialog is asking the user to go ahead, and focuses that.
    (props.type === "danger" ? cancelButton : confirmButton).value?.focus();
  },
  { immediate: true },
);

onBeforeUnmount(() => document.removeEventListener("keydown", onKeyDown));
</script>

<template>
  <Transition name="fade">
    <div
      v-if="show"
      class="fixed inset-0 z-[9999] flex items-center justify-center p-4"
    >
      <!-- Backdrop -->
      <div
        class="absolute inset-0 bg-black/40 backdrop-blur-sm"
        @click="requestCancel"
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
                ref="confirmButton"
                @click="emit('confirm')"
                :disabled="busy"
                :class="[
                  'flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all',
                  type === 'danger'
                    ? 'bg-red-500 shadow-red-500/20'
                    : 'bg-[#0052ff] shadow-blue-500/20',
                  busy
                    ? 'opacity-60 cursor-default'
                    : type === 'danger'
                      ? 'hover:bg-red-600 active:scale-95'
                      : 'hover:bg-[#0042cc] active:scale-95',
                ]"
              >
                <Loader2 v-if="busy" class="w-4 h-4 animate-spin" />
                {{ busy ? busyText || "Working..." : confirmText || "Confirm" }}
              </button>
              <button
                ref="cancelButton"
                @click="emit('cancel')"
                :disabled="busy"
                class="flex-1 px-6 py-3 rounded-xl font-bold text-gray-700 bg-white border border-gray-200 transition-all"
                :class="
                  busy
                    ? 'opacity-60 cursor-default'
                    : 'hover:bg-gray-50 active:scale-95'
                "
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

