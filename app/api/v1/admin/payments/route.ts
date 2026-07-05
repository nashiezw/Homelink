import { requireAdmin, requireAdminAsync } from "@/lib/admin/require-admin";
import { createPostgresManualPayment, getPostgresPaymentsAdminData } from "@/lib/admin/postgres-admin-config";
import { created, ok, problem } from "@/lib/api/response";
import { isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import { getStore } from "@/lib/store/app-store";
import type { PaymentMethod, PaymentStatus } from "@/lib/store/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = isPostgresStoreEnabled() ? await requireAdminAsync(request, "payments:read") : requireAdmin(request, "payments:read");
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as PaymentStatus | null;
  const manual = searchParams.get("manual");
  const q = searchParams.get("q") ?? undefined;
  if (isPostgresStoreEnabled()) {
    return ok(await getPostgresPaymentsAdminData({ status, manual, q }));
  }

  const store = getStore();
  const payments = store.listAllPayments({
    status: status ?? undefined,
    manual: manual === "true" ? true : manual === "false" ? false : undefined,
    q,
  });

  const paid = payments.filter((p) => p.status === "PAID");
  const pending = payments.filter((p) => ["PENDING", "MANUAL_REVIEW", "AWAITING_PROOF"].includes(p.status));

  return ok({
    payments,
    escrowHolds: store.listEscrowHolds(),
    chargebacks: store.listChargebacks(),
    taxSummary: {
      platformCommissionPercent: store.getPaymentSettings().fees.platformCommissionPercent,
      taxPercent: store.getPaymentSettings().fees.taxPercent,
      heldInEscrow: store.listEscrowHolds().filter((e) => e.status === "HELD").reduce((s, e) => s + e.amount, 0),
      openChargebacks: store.listChargebacks().filter((c) => ["OPEN", "UNDER_REVIEW"].includes(c.status)).length,
    },
    summary: {
      total: payments.length,
      paid: paid.length,
      pending: pending.length,
      revenue: paid.reduce((s, p) => s + p.amount, 0),
      manualReview: payments.filter((p) => p.status === "MANUAL_REVIEW").length,
      failed: payments.filter((p) => p.status === "FAILED").length,
    },
    settings: store.getPaymentSettings(),
    health: store.getPaymentHealth(),
  });
}

export async function PATCH(request: Request) {
  const auth = isPostgresStoreEnabled() ? await requireAdminAsync(request, "payments:write") : requireAdmin(request, "payments:write");
  if (auth.error || !auth.user) return auth.error ?? problem(401, "UNAUTHORIZED", "Admin required.");

  const body = await request.json();
  const store = getStore();
  const actor = { id: auth.user.id, name: auth.user.name };
  const { action, id, status } = body as { action?: string; id?: string; status?: string };

  if (action === "update_escrow" && id && status) {
    const result = store.updateEscrowHold(id, status as import("@/lib/admin/enterprise-types").EscrowHold["status"], actor);
    if (!result) return problem(404, "NOT_FOUND", "Escrow hold not found.");
    return ok({ escrow: result });
  }
  if (action === "update_chargeback" && id && status) {
    const result = store.updateChargeback(id, status as import("@/lib/admin/enterprise-types").Chargeback["status"], actor);
    if (!result) return problem(404, "NOT_FOUND", "Chargeback not found.");
    return ok({ chargeback: result });
  }
  return problem(400, "INVALID_ACTION", "Unknown action.");
}

export async function POST(request: Request) {
  const auth = isPostgresStoreEnabled() ? await requireAdminAsync(request, "payments:write") : requireAdmin(request, "payments:write");
  if (auth.error || !auth.user) return auth.error ?? problem(401, "UNAUTHORIZED", "Admin required.");

  const body = await request.json();
  if (isPostgresStoreEnabled()) {
    if (!body.userId || !body.plan || !body.amount || !body.method) {
      return problem(400, "INVALID_INPUT", "userId, plan, amount, and method are required.");
    }
    const payment = await createPostgresManualPayment({
      userId: body.userId,
      method: body.method,
      plan: body.plan,
      amount: Number(body.amount),
      referenceNumber: body.referenceNumber,
      proofUrl: body.proofUrl,
      listingId: body.listingId,
      autoApprove: Boolean(body.autoApprove),
    });
    return created({ payment });
  }
  const store = getStore();
  const actor = { id: auth.user.id, name: auth.user.name };

  if (!body.userId || !body.plan || !body.amount || !body.method) {
    return problem(400, "INVALID_INPUT", "userId, plan, amount, and method are required.");
  }
  const manualMethod = store.getPaymentSettings().manualMethods.find((method) => method.id === body.method);
  if (manualMethod && manualMethod.requiresProof && !body.autoApprove && !body.proofUrl) {
    return problem(400, "PROOF_REQUIRED", `${manualMethod.label} requires proof before finance can approve.`);
  }

  const payment = store.recordManualPayment(
    {
      userId: body.userId,
      method: body.method as PaymentMethod,
      plan: body.plan,
      amount: Number(body.amount),
      referenceNumber: body.referenceNumber ?? `MAN-${Date.now()}`,
      proofUrl: body.proofUrl,
      listingId: body.listingId,
      autoApprove: Boolean(body.autoApprove),
    },
    actor,
  );

  if (body.userId) {
    store.createNotification(body.userId, {
      channel: "email",
      subject: "Payment recorded",
      body: `A manual payment of $${body.amount} for ${body.plan} has been recorded.`,
    });
  }

  return created({ payment });
}
