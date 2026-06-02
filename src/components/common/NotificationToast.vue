<script setup lang="ts">
import { useNotificationStore } from "../../stores/notification";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
} from "lucide-vue-next";

const notificationStore = useNotificationStore();

const getIcon = (type: string) => {
  switch (type) {
    case "success":
      return CheckCircle2;
    case "error":
      return AlertCircle;
    case "warning":
      return AlertTriangle;
    default:
      return Info;
  }
};

const getTypeClass = (type: string) => {
  switch (type) {
    case "success":
      return "bg-white border-l-4 border-green-500 text-green-800";
    case "error":
      return "bg-white border-l-4 border-red-500 text-red-800";
    case "warning":
      return "bg-white border-l-4 border-yellow-500 text-yellow-800";
    default:
      return "bg-white border-l-4 border-blue-500 text-blue-800";
  }
};

const getIconClass = (type: string) => {
  switch (type) {
    case "success":
      return "text-green-500";
    case "error":
      return "text-red-500";
    case "warning":
      return "text-yellow-500";
    default:
      return "text-blue-500";
  }
};
</script>

<template>
  <div
    class="fixed top-6 right-6 z-9999 flex flex-col gap-4 max-w-md w-full sm:w-400px"
  >
    <TransitionGroup name="notification" tag="div" class="flex flex-col gap-3">
      <div
        v-for="notification in notificationStore.notifications"
        :key="notification.id"
        :class="[
          'flex items-start p-4 rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.1)] transition-all duration-300 pointer-events-auto overflow-hidden relative',
          getTypeClass(notification.type),
        ]"
      >
        <!-- Background Glow -->
        <div
          class="absolute inset-0 opacity-[0.03] pointer-events-none"
          :class="
            notification.type === 'success'
              ? 'bg-green-500'
              : notification.type === 'error'
                ? 'bg-red-500'
                : 'bg-blue-500'
          "
        ></div>

        <div class="shrink-0 mr-3">
          <component
            :is="getIcon(notification.type)"
            :class="['w-6 h-6', getIconClass(notification.type)]"
          />
        </div>

        <div class="flex-1 pt-0.5">
          <p class="text-[15px] font-semibold leading-tight mb-1">
            {{
              notification.type.charAt(0).toUpperCase() +
              notification.type.slice(1)
            }}
          </p>
          <p class="text-[14px] font-medium opacity-90">
            {{ notification.message }}
          </p>
        </div>

        <button
          @click="notificationStore.remove(notification.id)"
          class="shrink-0 ml-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X class="w-4 h-4" />
        </button>

        <!-- Progress Bar -->
        <div
          class="absolute bottom-0 left-0 h-1 bg-current opacity-20"
          :style="{
            width: '100%',
            animation: `progress ${notification.duration}ms linear forwards`,
          }"
        ></div>
      </div>
    </TransitionGroup>
  </div>
</template>
