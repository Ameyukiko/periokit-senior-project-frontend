<script setup lang="ts">
import { useNotificationStore } from "../../stores/notification";
import { X } from "lucide-vue-next";

const notificationStore = useNotificationStore();

const getContainerClass = (type: string) => {
  switch (type) {
    case "success":
      return "bg-gradient-to-r from-[#ebfcf0] to-white border border-[#dcfce7]";
    case "error":
      return "bg-gradient-to-r from-[#fef2f2] to-white border border-[#fee2e2]";
    case "warning":
      return "bg-gradient-to-r from-[#fffbeb] to-white border border-[#fef3c7]";
    default:
      return "bg-gradient-to-r from-[#eff6ff] to-white border border-[#dbeafe]";
  }
};
</script>

<template>
  <div
    class="fixed top-6 right-6 z-[9999] flex flex-col gap-4 max-w-md w-full sm:w-[400px]"
  >
    <TransitionGroup name="notification" tag="div" class="flex flex-col gap-3">
      <div
        v-for="notification in notificationStore.notifications"
        :key="notification.id"
        :class="[
          'flex items-start p-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-300 pointer-events-auto relative overflow-hidden',
          getContainerClass(notification.type),
        ]"
      >
        <div class="shrink-0 mr-3 mt-0.5">
          <!-- Success Icon -->
          <svg v-if="notification.type === 'success'" class="w-6 h-6 text-[#22a061]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="currentColor"/>
            <path d="M8 12.5L10.5 15L16 9" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          
          <!-- Error Icon -->
          <svg v-else-if="notification.type === 'error'" class="w-6 h-6 text-[#d94b4b]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="currentColor"/>
            <path d="M15 9l-6 6M9 9l6 6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          
          <!-- Warning Icon -->
          <svg v-else-if="notification.type === 'warning'" class="w-6 h-6 text-[#f59e0b]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="currentColor"/>
            <path d="M12 7v5M12 15h.01" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>

          <!-- Info/Default Icon -->
          <svg v-else class="w-6 h-6 text-[#4a72e8]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="currentColor"/>
            <path d="M12 16v-4M12 8h.01" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>

        <div class="flex-1 pt-[2px]">
          <p class="text-[15px] font-semibold text-gray-900 leading-tight" :class="{'mb-1': notification.description}">
            {{ notification.message }}
          </p>
          <p v-if="notification.description" class="text-[14px] text-gray-500 leading-relaxed pr-2">
            {{ notification.description }}
          </p>
          
          <div v-if="notification.type === 'error' && notification.description" class="flex items-center gap-4 mt-3">
            <button @click.stop="notificationStore.remove(notification.id)" class="text-[14px] font-semibold text-[#4a72e8] hover:text-blue-700 transition-colors">
              Retry
            </button>
            <button @click.stop="notificationStore.remove(notification.id)" class="text-[14px] font-medium text-gray-500 hover:text-gray-700 transition-colors">
              Dismiss
            </button>
          </div>
        </div>

        <button
          @click="notificationStore.remove(notification.id)"
          class="shrink-0 ml-2 text-gray-400 hover:text-gray-600 transition-colors mt-[2px]"
        >
          <X class="w-4 h-4" />
        </button>

        <!-- Progress Bar (Subtle) -->
        <div
          class="absolute bottom-0 left-0 h-[2px] opacity-10"
          :class="{
            'bg-[#22a061]': notification.type === 'success',
            'bg-[#d94b4b]': notification.type === 'error',
            'bg-[#f59e0b]': notification.type === 'warning',
            'bg-[#4a72e8]': notification.type === 'info' || !notification.type
          }"
          :style="{
            width: '100%',
            animation: `progress ${notification.duration}ms linear forwards`,
          }"
        ></div>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.notification-enter-from {
  opacity: 0;
  transform: translateX(100%) scale(0.95);
}
.notification-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(0.95);
}

@keyframes progress {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}
</style>
