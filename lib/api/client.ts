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
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) headers.set("X-HouseLink-CSRF", "1");
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers,
      credentials: "include",
    });
  } catch (error) {
    const aborted = error instanceof DOMException && error.name === "AbortError";
    return {
      data: undefined as T,
      error: {
        code: "NETWORK_ERROR",
        message: aborted ? "This is taking longer than expected. Please check again in a moment." : "We could not connect just now. Please try again.",
      },
    };
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const fallbackMessage =
      response.status === 413
        ? "The upload is too large for the server request limit. Try a smaller file."
        : response.ok
          ? "We received an unexpected response. Please try again."
          : "This part of HouseLink is temporarily unavailable. Please try again.";
    return {
      data: undefined as T,
      error: {
        code: "NON_JSON_RESPONSE",
        message: fallbackMessage,
      },
    };
  }
  const envelope = await response.json() as ApiEnvelope<T>;
  if (envelope.error?.message) {
    envelope.error.message = friendlyApiErrorMessage(envelope.error.message);
  }
  return envelope;
}

function friendlyApiErrorMessage(message: string) {
  const text = message.trim();
  if (/server error|unexpected server response|request took longer|longer than expected|\(\d{3}\)/i.test(text)) {
    return "This part of HouseLink is temporarily unavailable. Please try again.";
  }
  return text;
}

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  roles: string[];
  /** False for continue-with-email checkout accounts until they set a password. */
  hasPassword?: boolean;
  verification: {
    identity: string;
    phone: string;
    email: string;
  };
  savedCount?: number;
  alertCount?: number;
};
