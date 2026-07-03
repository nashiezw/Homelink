export type ApiEnvelope<T> = {
  data: T;
  meta?: Record<string, unknown>;
  error?: {
    code: string;
    message: string;
  };
};

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    credentials: "include",
  });
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
