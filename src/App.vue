<script setup lang="ts">
import { onMounted } from "vue";
import { RouterView } from "vue-router";
import NotificationToast from "./components/common/NotificationToast.vue";
import { useAuthStore } from "./stores/auth";

const authStore = useAuthStore();

onMounted(async () => {
  if (authStore.isAuthenticated) {
    await authStore.fetchProfile();
  }
});
</script>

<template>
  <NotificationToast />
  <RouterView />
</template>
