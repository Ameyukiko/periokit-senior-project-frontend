<script setup lang="ts">
import { reactive, ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { useNotificationStore } from "../stores/notification";
import { Mail, Lock, CheckCircle2, Eye, EyeOff } from "lucide-vue-next";

const router = useRouter();
const authStore = useAuthStore();
const notificationStore = useNotificationStore();

const form = reactive({
  email: "",
  password: "",
});
const rememberEmail = ref(false);
const loading = ref(false);
const errors = reactive({
  email: "",
  password: "",
});
const showPassword = ref(false);

onMounted(() => {
  // Check for logout message
  if (router.currentRoute.value.query.logout === "true") {
    notificationStore.success("You have been successfully signed out.");
    // Clear the query param from URL without reloading
    router.replace({ query: {} });
  }

  const savedEmail = localStorage.getItem("periokit_email");
  const savedRemember =
    localStorage.getItem("periokit_remember_email") === "true";

  localStorage.removeItem("periokit_password");
  localStorage.removeItem("periokit_remember");

  if (savedRemember) {
    form.email = savedEmail || "";
    rememberEmail.value = true;
  }
});

const handleLogin = async () => {
  // Clear previous errors
  errors.email = "";
  errors.password = "";

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Simple validation
  if (!form.email) {
    errors.email = "Please enter your email";
  } else if (!emailRegex.test(form.email)) {
    errors.email = "Please enter a valid email address";
  }

  // Password validation
  if (!form.password) {
    errors.password = "Please enter your password";
  } else if (form.password.length < 6) {
    errors.password = "Password must be at least 6 characters";
  }

  if (errors.email || errors.password) return;

  loading.value = true;

  try {
    const result = await authStore.login(form.email, form.password);

    if (!result.success) {
      notificationStore.error(result.message || "Login failed");
      return;
    }

    notificationStore.success("Successfully signed in!");

    if (rememberEmail.value) {
      localStorage.setItem("periokit_email", form.email);
      localStorage.setItem("periokit_remember_email", "true");
    } else {
      localStorage.removeItem("periokit_email");
      localStorage.removeItem("periokit_remember_email");
    }

    // Redirect to my-patients page

    router.push({ name: "my-patients" });
  } catch (error: any) {
    console.error("Login Error:", error);
    notificationStore.error(error.message || "An unexpected error occurred");
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div
    class="min-h-screen bg-[#f3f6ff] flex flex-col items-center justify-center py-8 px-4 font-sans"
  >
    <div class="w-full max-w-[480px]">
      <div
        class="bg-white rounded-[24px] shadow-[0_10px_40px_rgba(0,0,0,0.05)] p-12"
      >
        <!-- Logo & Header -->
        <div class="mb-10 text-center flex flex-col items-center">
          <img
            src="../assets/mini_Logo_Periokit.png"
            alt="PerioKit Logo"
            class="h-23 w-20 mb-4"
          />
          <h2 class="text-[36px] font-bold text-[#0052ff] leading-none mb-3">
            PerioKit
          </h2>
          <p class="text-[#6b7280] text-[16px] font-medium">
            Periodontal Charting System
          </p>
        </div>

        <form @submit.prevent="handleLogin" class="space-y-6">
          <!-- Email -->
          <div>
            <label class="block text-[14px] font-bold text-[#1f2937] mb-2"
              >Email</label
            >
            <div class="relative">
              <div
                class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"
              >
                <Mail class="h-5 w-5 text-[#9ca3af]" />
              </div>
              <input
                v-model="form.email"
                type="email"
                placeholder="Enter your email"
                :class="[
                  'w-full bg-[#f1f5f9] border-none rounded-[12px] py-3.5 pl-12 pr-4 text-[#1f2937] placeholder-[#9ca3af] focus:ring-2 focus:ring-[#0052ff] outline-none text-[15px] transition-all',
                  errors.email ? 'ring-2 ring-red-500 bg-red-50' : '',
                ]"
              />
            </div>
            <p
              v-if="errors.email"
              class="text-red-500 text-[12px] font-bold mt-1.5 ml-1"
            >
              {{ errors.email }}
            </p>
          </div>

          <!-- Password -->
          <div>
            <label class="block text-[14px] font-bold text-[#1f2937] mb-2"
              >Password</label
            >
            <div class="relative">
              <div
                class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"
              >
                <Lock class="h-5 w-5 text-[#9ca3af]" />
              </div>
              <input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Enter your password"
                :class="[
                  'w-full bg-[#f1f5f9] border-none rounded-[12px] py-3.5 pl-12 pr-12 text-[#1f2937] placeholder-[#9ca3af] focus:ring-2 focus:ring-[#0052ff] outline-none text-[15px] transition-all',
                  errors.password ? 'ring-2 ring-red-500 bg-red-50' : '',
                ]"
              />
              <!-- Toggle Password Visibility -->
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute inset-y-0 right-0 pr-4 flex items-center text-[#9ca3af] hover:text-[#0052ff] transition-colors"
              >
                <Eye v-if="!showPassword" class="h-5 w-5" />
                <EyeOff v-else class="h-5 w-5" />
              </button>
            </div>
            <p
              v-if="errors.password"
              class="text-red-500 text-[12px] font-bold mt-1.5 ml-1"
            >
              {{ errors.password }}
            </p>
          </div>

          <!-- Remember Email -->
          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="rememberEmail = !rememberEmail"
              class="flex items-center gap-2 focus:outline-none group"
            >
              <div class="w-5 h-5 flex items-center justify-center">
                <CheckCircle2
                  v-if="rememberEmail"
                  class="w-5 h-5 text-[#0052ff] fill-[#0052ff] text-white"
                />
                <div
                  v-else
                  class="w-5 h-5 rounded-full border-2 border-[#d1d5db] group-hover:border-[#0052ff] transition-colors"
                ></div>
              </div>
              <span class="text-[14px] text-[#9ca3af] font-medium"
                >Remember Email</span
              >
            </button>
          </div>

          <!-- Submit Button -->
          <div class="pt-2">
            <button
              type="submit"
              :disabled="loading"
              class="w-full bg-[#0052ff] hover:bg-[#0042cc] text-white font-bold py-4 rounded-[12px] transition-colors disabled:opacity-50 text-[16px] shadow-lg shadow-blue-200"
            >
              {{ loading ? "Signing In..." : "Sign In" }}
            </button>
          </div>
        </form>

        <!-- Register Link -->
        <div class="mt-8 text-center">
          <p class="text-[14px] text-[#6b7280] font-medium">
            Don't have an account?
            <router-link
              to="/register"
              class="text-[#0052ff] hover:underline font-bold"
            >
              Create Account
            </router-link>
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div class="mt-8 text-center">
        <p class="text-[14px] text-[#9ca3af] font-medium">© 2026 PerioKit.</p>
      </div>
    </div>
  </div>
</template>
