export type ApiEnvelope<T> = {
  data: T;
  meta?: Record<string, unknown>;
  error?: {
    code: string;
    message: string;
  };
};

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const method = (init?.method ?? "GET").toUpperCase();
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) headers.set("X-HomeLink-CSRF", "1");
  const response = await fetch(path, {
    ...init,
    headers,
    credentials: "include",
  });
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return {
      data: undefined as T,
      error: {
        code: "NON_JSON_RESPONSE",
        message: response.ok ? "Unexpected server response." : "Server error. Please try again.",
      },
    };
  }
  return response.json() as Promise<ApiEnvelope<T>>;
}

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  roles: string[];
  verification: {
    identity: string;
    phone: string;
    email: string;
  };
  savedCount?: number;
  alertCount?: number;
};
