import { requireAdmin, requireAdminAsync } from "@/lib/admin/require-admin";
import { getPostgresAdminPayment, updatePostgresPayment } from "@/lib/admin/postgres-admin-config";
import { ok, problem } from "@/lib/api/response";
import { isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import { fulfillPaidLibraryOrdersForPayment, revokeLibraryAccessForPayment } from "@/lib/library/repository";
import { getStore } from "@/lib/store/app-store";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = isPostgresStoreEnabled() ? await requireAdminAsync(request, "payments:read") : requireAdmin(request);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  if (isPostgresStoreEnabled()) {
    const result = await getPostgresAdminPayment(id);
    if (!result) return problem(404, "NOT_FOUND", "Payment not found.");
    return ok(result);
  }

  const store = getStore();
  const payment = store.getPaymentById(id);
  if (!payment) return problem(404, "NOT_FOUND", "Payment not found.");

  const audit = store.getAuditLog(50).filter((e) => e.target === id);
  return ok({ payment, audit });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = isPostgresStoreEnabled() ? await requireAdminAsync(request, "payments:write") : requireAdmin(request);
  if (auth.error || !auth.user) return auth.error ?? problem(401, "UNAUTHORIZED", "Admin required.");

  const { id } = await context.params;
  const body = await request.json();
  const action = String(body.action || "");
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  const note = typeof body.note === "string" ? body.note.trim() : "";

  if (isPostgresStoreEnabled()) {
    const payment = await updatePostgresPayment(id, action, reason || undefined, note || undefined);
    if (!payment) return problem(400, "UNKNOWN_ACTION", `Unknown action: ${body.action}`);
    const isLibrary = Boolean(payment.plan?.startsWith("library_"));
    if ((action === "approve" || action === "mark_received") && isLibrary) {
      await fulfillPaidLibraryOrdersForPayment(id);
      await notifyPaymentUser(payment.userId, "Library payment approved", "Your HouseLink Library payment has been approved. Open My Library to access your purchases.");
    }
    if (action === "reject" && isLibrary) {
      await revokeLibraryAccessForPayment(id, reason || note || "Proof rejected", "reject");
      await notifyPaymentUser(
        payment.userId,
        "Library payment proof rejected",
        reason || note || "Your Library payment proof could not be verified. Upload a clearer receipt from your order confirmation page.",
      );
    }
    if (action === "refund" && isLibrary) {
      await revokeLibraryAccessForPayment(id, reason || note || "Refunded", "refund");
      await notifyPaymentUser(
        payment.userId,
        "Library payment refunded",
        reason || note || "Your HouseLink Library payment was refunded and related download access was revoked.",
      );
    }
    if (action === "request_proof" && isLibrary) {
      await notifyPaymentUser(payment.userId, "Proof of payment required", "Please upload proof of payment to complete your HouseLink Library order.");
    }
    return ok({ payment });
  }

  const store = getStore();
  const actor = { id: auth.user.id, name: auth.user.name };

  const payment = store.getPaymentById(id);
  if (!payment) return problem(404, "NOT_FOUND", "Payment not found.");

  switch (action) {
    case "approve":
    case "mark_received":
      store.approveManualPayment(id, actor, note || "Approved by admin");
      if (payment.plan?.startsWith("library_")) {
        await fulfillPaidLibraryOrdersForPayment(id);
        store.createNotification(payment.userId, {
          channel: "email",
          subject: "Library downloads active",
          body: "Your HouseLink Library payment has been approved. Open My Library to access your purchases.",
        });
      }
      store.createNotification(payment.userId, {
        channel: "email",
        subject: "Payment approved",
        body: `Your payment of $${payment.amount} has been approved. Receipt: ${payment.receiptNumber ?? id}`,
      });
      break;
    case "reject":
      store.rejectManualPayment(id, actor, reason || note || "Proof could not be verified.");
      if (payment.plan?.startsWith("library_")) {
        await revokeLibraryAccessForPayment(id, reason || note || "Proof rejected", "reject");
      }
      store.createNotification(payment.userId, {
        channel: "email",
        subject: "Payment rejected",
        body: reason || note || "Your payment could not be verified.",
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
      if (!note) return problem(400, "INVALID_INPUT", "note required.");
      store.addFinanceNote(id, actor, note);
      break;
    case "reverse":
      store.reversePayment(id, actor, reason);
      break;
    case "refund":
      store.refundPayment(id, actor, reason || note || "Refunded by admin");
      if (payment.plan?.startsWith("library_")) {
        await revokeLibraryAccessForPayment(id, reason || note || "Refunded", "refund");
      }
      store.createNotification(payment.userId, {
        channel: "email",
        subject: "Payment refunded",
        body: reason || note || "Your payment was refunded.",
      });
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

async function notifyPaymentUser(userId: string | undefined | null, subject: string, body: string) {
  if (!userId || !isPostgresStoreEnabled()) return;
  const { getMainPrisma } = await import("@/lib/db/main-prisma");
  const { NotificationChannel, NotificationStatus } = await import("@prisma/client");
  await getMainPrisma().notification.create({
    data: {
      userId,
      channel: NotificationChannel.EMAIL,
      status: NotificationStatus.QUEUED,
      subject,
      body,
    },
  }).catch(() => null);
}
