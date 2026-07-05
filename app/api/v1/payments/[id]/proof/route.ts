import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { shouldUsePostgresPayments, uploadPaymentProofInPostgres } from "@/lib/payments/postgres-payment-repository";
import { getStore } from "@/lib/store/app-store";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to upload proof of payment.");

  const { id } = await context.params;
  const body = await request.json();
  const proofUrl = String(body.proofUrl ?? "").trim();
  if (!proofUrl) return problem(400, "INVALID_PROOF", "proofUrl is required.");

  if (shouldUsePostgresPayments()) {
    const updated = await uploadPaymentProofInPostgres(id, userId, proofUrl);
    if (!updated) return problem(404, "NOT_FOUND", "Payment not found.");
    if (updated === "FORBIDDEN") return problem(403, "FORBIDDEN", "You can only upload proof for your own payment.");
    if (updated === "NOT_MANUAL") return problem(400, "NOT_MANUAL", "Proof upload is only required for manual payments.");
    return ok({ payment: updated });
  }

  const store = getStore();
  const payment = store.getPaymentById(id);
  if (!payment) return problem(404, "NOT_FOUND", "Payment not found.");
  if (payment.userId !== userId) return problem(403, "FORBIDDEN", "You can only upload proof for your own payment.");
  if (!payment.manual) return problem(400, "NOT_MANUAL", "Proof upload is only required for manual payments.");

  const updated = store.uploadPaymentProof(id, proofUrl);
  for (const admin of store.listUsers({ role: "ADMIN" })) {
    store.createNotification(admin.id, {
      channel: "IN_APP",
      subject: "Payment proof uploaded",
      body: `${payment.userName ?? "A customer"} uploaded proof for ${payment.plan} payment ${payment.referenceNumber ?? payment.id}.`,
    });
  }

  return ok({ payment: updated });
}
