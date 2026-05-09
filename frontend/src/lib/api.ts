import type { AuthResponse, ProductsResponse } from "@/types/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

type ApiRequestOptions = RequestInit & {
  redirectOnUnauthorized?: boolean;
};

async function request<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { redirectOnUnauthorized = true, ...fetchOptions } = options;
  const headers = new Headers(fetchOptions.headers);

  if (typeof fetchOptions.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...fetchOptions,
    credentials: "include",
    headers,
  });

  if (!response.ok) {
    if (
      response.status === 401 &&
      redirectOnUnauthorized &&
      typeof window !== "undefined"
    ) {
      window.location.assign("/login");
    }

    throw new ApiError(response.statusText || "Request failed", response.status);
  }

  return (await response.json()) as T;
}

export function login(email: string, password: string) {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function logout() {
  return request<{ success: boolean }>("/auth/logout", {
    method: "POST",
  });
}

export async function logoutWithFallback() {
  try {
    return await logout();
  } catch (error) {
    const response = await fetch("/api/session/end", {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      throw error;
    }

    return (await response.json()) as { success: boolean };
  }
}

export async function getCurrentUser() {
  try {
    return await request<AuthResponse>("/auth/me", {
      redirectOnUnauthorized: false,
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }

    throw error;
  }
}

export function getProducts({
  pageSize,
  cursor,
}: {
  pageSize: number;
  cursor?: string | null;
}) {
  const searchParams = new URLSearchParams({ pageSize: String(pageSize) });

  if (cursor) {
    searchParams.set("cursor", cursor);
  }

  return request<ProductsResponse>(`/products?${searchParams.toString()}`);
}
