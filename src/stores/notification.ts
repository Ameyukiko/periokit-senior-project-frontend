import { defineStore } from "pinia";
import { ref } from "vue";

export type NotificationType = "success" | "error" | "info" | "warning";

export interface Notification {
  id: string;
  message: string;
  description?: string;
  type: NotificationType;
  duration: number;
}

export const useNotificationStore = defineStore("notification", () => {
  const notifications = ref<Notification[]>([]);

  const DEFAULT_DURATION = 500;

  const show = (
    message: string,
    type: NotificationType = "info",
    duration: number = DEFAULT_DURATION,
    description?: string,
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    const notification: Notification = { id, message, type, duration, description };

    notifications.value.push(notification);

    if (duration > 0) {
      setTimeout(() => {
        remove(id);
      }, duration);
    }
  };

  const remove = (id: string) => {
    const index = notifications.value.findIndex((n) => n.id === id);
    if (index !== -1) {
      notifications.value.splice(index, 1);
    }
  };

  const success = (message: string, description?: string, duration?: number) =>
    show(message, "success", duration ?? DEFAULT_DURATION, description);
  const error = (message: string, description?: string, duration?: number) =>
    show(message, "error", duration ?? DEFAULT_DURATION, description);
  const info = (message: string, description?: string, duration?: number) =>
    show(message, "info", duration ?? DEFAULT_DURATION, description);
  const warning = (message: string, description?: string, duration?: number) =>
    show(message, "warning", duration ?? DEFAULT_DURATION, description);

  return {
    notifications,
    show,
    remove,
    success,
    error,
    info,
    warning,
  };
});
