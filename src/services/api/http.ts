import { getAuthHeaders } from "../token-storage";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export type ApiValidationError = {
  path?: string;
  message: string;
};

export type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
  errors?: ApiValidationError[];
  /**
   * Machine-readable cause, on the endpoints that send one (the X-ray upload
   * answers `file_too_large`, `unsupported_type`, `upload_id_count_mismatch`).
   * `message` is written for a person and may be reworded at any time, so
   * anything branching on the cause has to read this instead.
   */
  reason?: string;
};

export class ApiError extends Error {
  status: number;
  errors?: ApiValidationError[];
  data?: unknown;
  reason?: string;

  constructor(
    message: string,
    status: number,
    errors?: ApiValidationError[],
    data?: unknown,
    reason?: string,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
    this.data = data;
    this.reason = reason;
  }
}

type ApiRequestOptions = RequestInit & {
  auth?: boolean;
};

function hasBodyContentType(body: BodyInit | null | undefined): boolean {
  return body instanceof FormData;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<ApiResponse<T>> {
  const { auth = false, headers, body, ...requestOptions } = options;
  const requestHeaders: HeadersInit = {
    ...(hasBodyContentType(body) ? {} : { "Content-Type": "application/json" }),
    ...(auth ? getAuthHeaders() : {}),
    ...headers,
  };

  const response = await fetch(`${API_URL}${path}`, {
    ...requestOptions,
    body,
    headers: requestHeaders,
  });

  const text = await response.text();
  const payload = text
    ? (JSON.parse(text) as ApiResponse<T>)
    : { success: response.ok };

  if (!response.ok) {
    throw new ApiError(
      payload.message || "API request failed",
      response.status,
      payload.errors,
      payload.data,
      payload.reason,
    );
  }

  return payload;
}
