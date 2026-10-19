<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { Menu, Activity, Users, Bell } from "lucide-vue-next";
import ProfileMenu from "./ProfileMenu.vue";

const router = useRouter();

const emit = defineEmits<{
  (e: 'toggle-drawer'): void
}>()

const hasMyPatientRoute = computed(() => {
  return router.hasRoute("my-patients");
});
</script>

<template>
  <nav
    class="bg-white border-b border-[#e2e8f0] h-16 flex items-center justify-between px-4 xl:px-8 sticky top-0 z-50 shadow-sm"
  >

    <div class="flex items-center gap-4 xl:gap-8">
      <div class="flex items-center gap-3 xl:gap-6">

        <button @click="emit('toggle-drawer')" class="p-1 hover:bg-gray-100 rounded-lg transition-colors">
          <Menu class="w-6 h-6 text-[#1f2937]" />
        </button>


        <router-link to="/chart" class="flex items-center">
          <img
            src="@/assets/logo_perio.png"
            alt="PERIOKIT"
            class="h-12 w-auto"
          />
        </router-link>
      </div>


      <div class="hidden xl:flex items-center gap-6">
        <router-link
          to="/chart"
          class="flex items-center gap-2 text-[#4b5563] hover:text-[#0052ff] font-bold text-sm transition-colors"
          active-class="text-[#0052ff]"
        >
          <Activity class="w-5 h-5" />
          Periodontal Chart
        </router-link>

        <router-link
          v-if="hasMyPatientRoute"
          to="/patients"
          class="flex items-center gap-2 text-[#4b5563] hover:text-[#0052ff] font-bold text-sm transition-colors"
          active-class="text-[#0052ff]"
        >
          <Users class="w-5 h-5" />
          My Patient
        </router-link>


        <div
          v-else
          class="flex items-center gap-2 text-gray-400 font-bold text-sm cursor-not-allowed select-none"
          title="This feature will be available in Sprint 2"
        >
          <Users class="w-5 h-5" />
          My Patient
        </div>
      </div>
    </div>


    <div class="flex items-center gap-6">

      <button
        class="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
      >
        <Bell class="w-5 h-5" />
        <span
          class="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"
        ></span>
      </button>


      <ProfileMenu />
    </div>
  </nav>


</template>
