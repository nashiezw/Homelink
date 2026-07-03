import { requireAdmin } from "@/lib/admin/require-admin";
import { ok, problem } from "@/lib/api/response";
import { getStore } from "@/lib/store/app-store";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = requireAdmin(request);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const store = getStore();
  const payment = store.getPaymentById(id);
  if (!payment) return problem(404, "NOT_FOUND", "Payment not found.");

  const audit = store.getAuditLog(50).filter((e) => e.target === id);
  return ok({ payment, audit });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = requireAdmin(request);
  if (auth.error || !auth.user) return auth.error ?? problem(401, "UNAUTHORIZED", "Admin required.");

  const { id } = await context.params;
  const body = await request.json();
  const store = getStore();
  const actor = { id: auth.user.id, name: auth.user.name };

  const payment = store.getPaymentById(id);
  if (!payment) return problem(404, "NOT_FOUND", "Payment not found.");

  switch (body.action as string) {
    case "approve":
      store.approveManualPayment(id, actor, body.note);
      store.createNotification(payment.userId, {
        channel: "email",
        subject: "Payment approved",
        body: `Your payment of $${payment.amount} has been approved. Receipt: ${payment.receiptNumber ?? id}`,
      });
      break;
    case "reject":
      store.rejectManualPayment(id, actor, body.reason);
      store.createNotification(payment.userId, {
        channel: "email",
        subject: "Payment rejected",
        body: body.reason ?? "Your payment could not be verified.",
      });
      break;
    case "request_proof":
      store.requestPaymentProof(id, actor);
      store.createNotification(payment.userId, {
        channel: "email",
        subject: "Proof of payment required",
        body: "Please upload proof of payment to complete your transaction.",
      });
      break;
    case "upload_proof":
      if (!body.proofUrl) return problem(400, "INVALID_INPUT", "proofUrl required.");
      store.uploadPaymentProof(id, body.proofUrl);
      break;
    case "add_note":
      if (!body.note) return problem(400, "INVALID_INPUT", "note required.");
      store.addFinanceNote(id, actor, body.note);
      break;
    case "reverse":
      store.reversePayment(id, actor, body.reason);
      break;
    case "refund":
      store.refundPayment(id, actor, body.reason);
      break;
    case "mark_received":
      store.approveManualPayment(id, actor, "Marked as received by admin");
      break;
    case "mark_pending":
      payment.status = "PENDING";
      payment.updatedAt = new Date().toISOString();
      break;
    case "assign_reference":
      payment.referenceNumber = body.referenceNumber;
      payment.updatedAt = new Date().toISOString();
      break;
    default:
      return problem(400, "UNKNOWN_ACTION", `Unknown action: ${body.action}`);
  }

  return ok({ payment: store.getPaymentById(id) });
}
