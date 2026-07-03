import { apiFetch } from "@/lib/api/client";

type ToastFn = (message: string, tone?: "success" | "error" | "info") => void;

export async function runAdminAction(
  body: Record<string, unknown>,
  showToast: ToastFn,
  options?: { successMessage?: string; onSuccess?: () => void },
) {
  const result = await apiFetch("/api/v1/admin/actions", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (result.error) {
    showToast(result.error.message ?? "Action failed.", "error");
    return false;
  }
  showToast(options?.successMessage ?? "Action completed.");
  options?.onSuccess?.();
  return true;
}
