import { defineStore } from "pinia";
import { ref, computed } from "vue";
import {
  loginUser,
  logoutUser,
  registerUser,
  getMe,
  type RegisterInput,
} from "../services/api/auth.api";
import { ApiError } from "../services/api/http";
import {
  clearClientSession,
  handleUnauthorizedSession,
  registerSessionClearListener,
} from "../services/session";
import {
  getAccessToken,
  getAuthHeaders as getStoredAuthHeaders,
  getStoredUserProfile,
  saveSession,
} from "../services/token-storage";
import type { UserProfile } from "../types/auth";

export const useAuthStore = defineStore("auth", () => {
  // State
  const user = ref<UserProfile | null>(getStoredUserProfile());
  const token = ref<string | null>(getAccessToken());

  registerSessionClearListener(() => {
    token.value = null;
    user.value = null;
  });

  // Getters
  const isAuthenticated = computed(() => !!token.value);
  const userProfile = computed(() => user.value);

  // Actions
  async function fetchProfile() {
    if (!token.value) return;
    try {
      const userProfile = await getMe();
      user.value = userProfile;
      saveSession(token.value, userProfile);
    } catch (error: any) {
      console.error("Failed to fetch profile:", error);
      if (error instanceof ApiError && error.status === 401) {
        await handleUnauthorized();
      }
    }
  }

  async function login(email: string, password: string) {
    try {
      const result = await loginUser(email, password);

      saveSession(result.token, result.user);
      token.value = result.token;
      user.value = result.user;

      // Fetch the full profile from backend
      await fetchProfile();

      return { success: true, user: user.value, token: result.token };
    } catch (error: any) {
      console.error("Login Error:", error);
      return {
        success: false,
        message: error.message || "Cannot connect to server",
      };
    }
  }

  async function register(input: RegisterInput) {
    try {
      await registerUser(input);
      return { success: true };
    } catch (error: any) {
      console.error("Register Error:", error);
      return {
        success: false,
        message: error.message || "Cannot connect to server",
        status: error.status,
        errors: error.errors,
      };
    }
  }

  async function logout() {
    try {
      if (token.value) {
        await logoutUser();
      }
    } catch (error) {
      console.error("Logout Error:", error);
    } finally {
      await clearClientSession();
    }
  }

  /**
   * เคลียร์ session และ redirect ไปหน้า login เมื่อ token หมดอายุ หรือไม่ถูกต้อง (401)
   */
  async function handleUnauthorized() {
    await handleUnauthorizedSession();
  }

  function getAuthHeaders(): Record<string, string> {
    return getStoredAuthHeaders();
  }

  return {
    user,
    token,
    isAuthenticated,
    userProfile,
    login,
    register,
    logout,
    handleUnauthorized,
    getAuthHeaders,
    fetchProfile,
  };
});
