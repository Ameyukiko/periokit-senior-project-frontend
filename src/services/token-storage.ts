import type { UserProfile } from "../types/auth";

const TOKEN_KEY = "periokit_access_token";
const USER_KEY = "periokit_user_profile";

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeAccessToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function getStoredUserProfile(): UserProfile | null {
  const value = localStorage.getItem(USER_KEY);

  if (!value || value === "undefined") {
    return null;
  }

  try {
    return JSON.parse(value) as UserProfile;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function setStoredUserProfile(user: UserProfile): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function removeStoredUserProfile(): void {
  localStorage.removeItem(USER_KEY);
}

export function saveSession(token: string, user: UserProfile): void {
  setAccessToken(token);
  setStoredUserProfile(user);
}

export function clearSessionStorage(): void {
  removeAccessToken();
  removeStoredUserProfile();
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
