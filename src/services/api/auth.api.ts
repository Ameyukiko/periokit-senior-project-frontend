import type { UserProfile } from "../../types/auth";
import { apiRequest } from "./http";

type SupabaseUser = {
  id: string;
  email?: string;
  user_metadata?: {
    firstName?: string;
    lastName?: string;
    studentId?: string;
    role?: string;
    profileImageUrl?: string;
  };
};

type AuthSession = {
  access_token?: string;
};

type LoginResponse = {
  user?: SupabaseUser;
  session?: AuthSession;
};

export type LoginResult = {
  user: UserProfile;
  token: string;
};

export type RegisterInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  studentId?: string;
  profileImage?: File | null;
};

function mapUserProfile(rawUser: SupabaseUser): UserProfile {
  return {
    id: rawUser.id,
    email: rawUser.email || "",
    first_name: rawUser.user_metadata?.firstName || "",
    last_name: rawUser.user_metadata?.lastName || "",
    student_id: rawUser.user_metadata?.studentId,
    role: rawUser.user_metadata?.role,
    profile_image_url: rawUser.user_metadata?.profileImageUrl,
  };
}

export async function loginUser(
  email: string,
  password: string,
): Promise<LoginResult> {
  const response = await apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  const rawUser = response.data?.user;
  const token = response.data?.session?.access_token;

  if (!rawUser || !token) {
    throw new Error("Invalid response from server structure");
  }

  return {
    user: mapUserProfile(rawUser),
    token,
  };
}

export async function registerUser(input: RegisterInput): Promise<void> {
  const formData = new FormData();
  formData.append("email", input.email);
  formData.append("password", input.password);
  formData.append("firstName", input.firstName);
  formData.append("lastName", input.lastName);

  if (input.studentId) {
    formData.append("studentId", input.studentId);
  }

  if (input.profileImage) {
    formData.append("profileImage", input.profileImage);
  }

  await apiRequest("/auth/register", {
    method: "POST",
    body: formData,
  });
}

export async function logoutUser(): Promise<void> {
  await apiRequest("/auth/logout", {
    method: "POST",
    auth: true,
  });
}

export async function getMe(): Promise<UserProfile> {
  const response = await apiRequest<{
    user: { id: string; email: string };
    profile: {
      firstName: string;
      lastName: string;
      role: string;
      studentId?: number | null;
      profileImageUrl?: string | null;
    };
  }>("/auth/me", {
    method: "GET",
    auth: true,
  });

  const rawUser = response.data?.user;
  const rawProfile = response.data?.profile;

  if (!rawUser || !rawProfile) {
    throw new Error("Invalid response from server structure");
  }

  return {
    id: rawUser.id,
    email: rawUser.email || "",
    first_name: rawProfile.firstName || "",
    last_name: rawProfile.lastName || "",
    student_id: rawProfile.studentId?.toString(),
    role: rawProfile.role,
    profile_image_url: rawProfile.profileImageUrl || undefined,
  };
}

