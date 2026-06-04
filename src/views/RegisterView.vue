<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { useNotificationStore } from "../stores/notification";
import { Upload, Eye, EyeOff } from "lucide-vue-next";

const router = useRouter();
const authStore = useAuthStore();
const notificationStore = useNotificationStore();

const form = reactive({
  studentId: "",
  firstName: "",
  surname: "",
  email: "",
  password: "",
  confirmPassword: "",
});

const profileFile = ref<File | null>(null);
const previewUrl = ref<string | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

const triggerFileInput = () => {
  fileInput.value?.click();
};

const handleFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    const file = input.files[0];
    profileFile.value = file;
    previewUrl.value = URL.createObjectURL(file);
  }
};

const loading = ref(false);

// Add state to store errors for each field separately
const errors = reactive({
  studentId: "",
  firstName: "",
  surname: "",
  email: "",
  password: "",
  confirmPassword: "",
});

const showPassword = ref(false);
const showConfirmPassword = ref(false);

const register = async () => {
  // 1. Clear all previous errors first
  Object.keys(errors).forEach(
    (key) => (errors[key as keyof typeof errors] = ""),
  );

  // 2. Validate all fields simultaneously
  if (!form.firstName) errors.firstName = "Please enter your First Name";
  if (!form.surname) errors.surname = "Please enter your Surname";

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!form.email) {
    errors.email = "Please enter your Email";
  } else if (!emailRegex.test(form.email)) {
    errors.email = "Please enter a valid email address";
  }

  // Password validation
  if (!form.password) {
    errors.password = "Please enter your Password";
  } else if (form.password.length < 6) {
    errors.password = "Password must be at least 6 characters";
  }

  // Confirm Password validation
  if (!form.confirmPassword) {
    errors.confirmPassword = "Please confirm your password";
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = "Passwords do not match";
  }

  // 3. Check if there are any errors in any field
  const hasErrors = Object.values(errors).some((error) => error !== "");
  if (hasErrors) return;

  loading.value = true;

  try {
    const result = await authStore.register({
      email: form.email,
      password: form.password,
      firstName: form.firstName,
      lastName: form.surname,
      studentId: form.studentId,
      profileImage: profileFile.value,
    });

    if (!result.success) {
      // Handle Email already exists or other conflict errors
      if (
        result.status === 409 ||
        result.message?.toLowerCase().includes("already exists")
      ) {
        notificationStore.error(result.message || "Email already exists");
        if (result.message?.toLowerCase().includes("email")) {
          errors.email = "Email already exists";
        }
        return;
      }

      // Handle field validation errors from backend (array format)
      if (Array.isArray(result.errors)) {
        result.errors.forEach((err: { path?: string; message: string }) => {
          const path = err.path;
          if (path === "email") errors.email = err.message;
          if (path === "password") errors.password = err.message;
          if (path === "firstName") errors.firstName = err.message;
          if (path === "lastName") errors.surname = err.message;
          if (path === "studentId") errors.studentId = err.message;
        });
        notificationStore.error("Validation failed. Please check your inputs.");
      } else {
        notificationStore.error(result.message || "Registration failed");
      }
      return;
    }

    notificationStore.success("Registration successful!");

    // Auto login after successful registration
    const loginResult = await authStore.login(form.email, form.password);

    if (loginResult.success) {
      notificationStore.success("Signing you in...");
      setTimeout(() => {
        router.push({ name: "my-patients" });
      }, 1500);
    } else {
      // If auto-login fails for some reason, redirect to login page as fallback
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    }
  } catch (error: any) {
    if (
      error instanceof TypeError ||
      error.message?.toLowerCase().includes("fetch")
    ) {
      notificationStore.error("Cannot connect to server");
    } else {
      notificationStore.error(error.message);
    }
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div
    class="min-h-screen bg-[#f3f6ff] flex flex-col items-center justify-center py-8 px-4 font-sans"
  >
    <div class="w-full max-w-162.5">
      <div
        class="bg-white rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.05)] p-10"
      >
        <!-- Logo & Header -->
        <div class="mb-6">
          <img
            src="../assets/mini_Logo_Periokit.png"
            alt="PerioKit Logo"
            class="h-24 w-20 ml-4 mb-4"
          />
          <h2 class="text-[32px] font-bold text-[#0052ff] leading-none mb-2">
            Sign up
          </h2>
          <p class="text-[#6b7280] text-[15px]">
            Enter your details below to create your account and get started.
          </p>
        </div>

        <form @submit.prevent="register" class="space-y-5">
          <!-- Profile Picture -->
          <div class="flex flex-col items-center mb-2">
            <span class="text-[13px] font-bold text-[#1f2937] mb-3"
              >Profile Picture</span
            >

            <div
              @click="triggerFileInput"
              class="w-25 h-25 rounded-full bg-[#f1f5f9] border-2 border-dashed border-[#e2e8f0] mb-4 flex items-center justify-center overflow-hidden cursor-pointer hover:border-[#0052ff] transition-all group relative"
            >
              <img
                v-if="previewUrl"
                :src="previewUrl"
                class="w-full h-full object-cover"
              />
              <div
                v-else
                class="flex flex-col items-center text-[#9ca3af] group-hover:text-[#0052ff]"
              >
                <Upload class="w-6 h-6 mb-1" />
                <span class="text-[10px] font-medium">Upload</span>
              </div>

              <!-- Overlay on hover when image exists -->
              <div
                v-if="previewUrl"
                class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
              >
                <Upload class="w-6 h-6 text-white" />
              </div>
            </div>

            <input
              ref="fileInput"
              type="file"
              accept="image/*"
              class="hidden"
              @change="handleFileChange"
            />

            <button
              type="button"
              @click="triggerFileInput"
              class="flex items-center gap-2 px-4 py-1.5 border border-[#e2e8f0] rounded-lg text-[13px] font-medium text-[#374151] hover:bg-gray-50 transition-colors"
            >
              <Upload class="w-3.5 h-3.5" />
              {{ previewUrl ? "Change Photo" : "Upload Photo" }}
            </button>
          </div>

          <!-- Doctor ID -->
          <div>
            <label class="block text-[13px] font-bold text-[#1f2937] mb-1.5"
              >Doctor ID <span class="text-[#9ca3af] font-normal">(Optional)</span></label
            >
            <input
              v-model="form.studentId"
              type="text"
              placeholder="Doctor ID"
              :class="[
                'w-full bg-[#f1f5f9] border-none rounded-[10px] py-2.5 px-4 text-[#1f2937] placeholder-[#9ca3af] focus:ring-2 focus:ring-[#0052ff] outline-none transition-all',
                errors.studentId ? 'ring-2 ring-red-500 bg-red-50' : '',
              ]"
            />
            <p
              v-if="errors.studentId"
              class="text-red-500 text-[11px] font-bold mt-1 ml-1"
            >
              {{ errors.studentId }}
            </p>
          </div>

          <!-- First Name & Surname -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-[13px] font-bold text-[#1f2937] mb-1.5"
                >First Name</label
              >
              <input
                v-model="form.firstName"
                type="text"
                placeholder="John"
                :class="[
                  'w-full bg-[#f1f5f9] border-none rounded-[10px] py-2.5 px-4 text-[#1f2937] placeholder-[#9ca3af] focus:ring-2 focus:ring-[#0052ff] outline-none transition-all',
                  errors.firstName ? 'ring-2 ring-red-500 bg-red-50' : '',
                ]"
              />
              <p
                v-if="errors.firstName"
                class="text-red-500 text-[11px] font-bold mt-1 ml-1"
              >
                {{ errors.firstName }}
              </p>
            </div>
            <div>
              <label class="block text-[13px] font-bold text-[#1f2937] mb-1.5"
                >Surname</label
              >
              <input
                v-model="form.surname"
                type="text"
                placeholder="Doe"
                :class="[
                  'w-full bg-[#f1f4f9] border-none rounded-[10px] py-2.5 px-4 text-[#1f2937] placeholder-[#9ca3af] focus:ring-2 focus:ring-[#0052ff] outline-none transition-all',
                  errors.surname ? 'ring-2 ring-red-500 bg-red-50' : '',
                ]"
              />
              <p
                v-if="errors.surname"
                class="text-red-500 text-[11px] font-bold mt-1 ml-1"
              >
                {{ errors.surname }}
              </p>
            </div>
          </div>

          <!-- Email -->
          <div>
            <label class="block text-[13px] font-bold text-[#1f2937] mb-1.5"
              >Email</label
            >
            <input
              v-model="form.email"
              type="email"
              placeholder="example@gmail.com"
              :class="[
                'w-full bg-[#f1f5f9] border-none rounded-[10px] py-2.5 px-4 text-[#1f2937] placeholder-[#9ca3af] focus:ring-2 focus:ring-[#0052ff] outline-none transition-all',
                errors.email ? 'ring-2 ring-red-500 bg-red-50' : '',
              ]"
            />
            <p
              v-if="errors.email"
              class="text-red-500 text-[11px] font-bold mt-1 ml-1"
            >
              {{ errors.email }}
            </p>
          </div>

          <!-- Password & Confirm Password -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-[13px] font-bold text-[#1f2937] mb-1.5"
                >Password</label
              >
              <div class="relative">
                <input
                  v-model="form.password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="********"
                  :class="[
                    'w-full bg-[#f1f5f9] border-none rounded-[10px] py-2.5 pl-4 pr-10 text-[#1f2937] placeholder-[#9ca3af] focus:ring-2 focus:ring-[#0052ff] outline-none transition-all',
                    errors.password ? 'ring-2 ring-red-500 bg-red-50' : '',
                  ]"
                />
                <button
                  type="button"
                  @click="showPassword = !showPassword"
                  class="absolute inset-y-0 right-0 pr-3 flex items-center text-[#9ca3af] hover:text-[#0052ff] transition-colors"
                >
                  <Eye v-if="!showPassword" class="w-4 h-4" />
                  <EyeOff v-else class="h-5 w-5" />
                </button>
              </div>
              <p
                v-if="errors.password"
                class="text-red-500 text-[11px] font-bold mt-1 ml-1"
              >
                {{ errors.password }}
              </p>
            </div>
            <div>
              <label class="block text-[13px] font-bold text-[#1f2937] mb-1.5"
                >Confirm Password</label
              >
              <div class="relative">
                <input
                  v-model="form.confirmPassword"
                  :type="showConfirmPassword ? 'text' : 'password'"
                  placeholder="********"
                  :class="[
                    'w-full bg-[#f1f5f9] border-none rounded-[10px] py-2.5 pl-4 pr-10 text-[#1f2937] placeholder-[#9ca3af] focus:ring-2 focus:ring-[#0052ff] outline-none transition-all',
                    errors.confirmPassword
                      ? 'ring-2 ring-red-500 bg-red-50'
                      : '',
                  ]"
                />
                <button
                  type="button"
                  @click="showConfirmPassword = !showConfirmPassword"
                  class="absolute inset-y-0 right-0 pr-3 flex items-center text-[#9ca3af] hover:text-[#0052ff] transition-colors"
                >
                  <Eye v-if="!showConfirmPassword" class="w-4 h-4" />
                  <EyeOff v-else class="h-5 w-5" />
                </button>
              </div>
              <p
                v-if="errors.confirmPassword"
                class="text-red-500 text-[11px] font-bold mt-1 ml-1"
              >
                {{ errors.confirmPassword }}
              </p>
            </div>
          </div>

          <!-- Submit Button -->
          <div class="pt-2">
            <button
              type="submit"
              :disabled="loading"
              class="w-full bg-[#0052ff] hover:bg-[#0042cc] text-white font-bold py-3 rounded-[10px] transition-colors disabled:opacity-50"
            >
              {{ loading ? "Signing up..." : "Confirm" }}
            </button>
          </div>
        </form>

        <!-- Login Link -->
        <div class="mt-6 text-center">
          <p class="text-[13px] text-[#6b7280]">
            Already have an account?
            <router-link
              to="/login"
              class="font-bold text-[#0052ff] hover:underline"
            >
              Login
            </router-link>
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div class="mt-4 text-center">
        <p class="text-[12px] text-[#9ca3af]">© 2026 PerioKit.</p>
      </div>
    </div>
  </div>
</template>
