import { paymentStatusDisplay, type PaymentStatusDisplay } from "@/lib/payments/status-display";

export type LibraryPaymentStage =
  | "awaiting_payment"
  | "awaiting_proof"
  | "proof_under_review"
  | "proof_rejected"
  | "paid"
  | "fulfilled"
  | "refunded"
  | "failed";

export type LibraryOrderStageInput = {
  status?: string | null;
  paymentStatus?: string | null;
  payment?: {
    id?: string | null;
    status?: string | null;
    proofStatus?: string | null;
    proofUrl?: string | null;
    method?: string | null;
    provider?: string | null;
    referenceNumber?: string | null;
    manual?: boolean | null;
    adminNote?: string | null;
    metadata?: Record<string, unknown> | null;
  } | null;
};

export function libraryPaymentStage(order: LibraryOrderStageInput): LibraryPaymentStage {
  const paymentStatus = String(order.payment?.status || order.paymentStatus || "").toUpperCase();
  const proofStatus = String(order.payment?.proofStatus || "").toUpperCase();
  const orderStatus = String(order.status || "").toUpperCase();

  if (paymentStatus === "REFUNDED" || orderStatus === "REFUNDED") return "refunded";
  if (orderStatus === "FULFILLED" || (paymentStatus === "PAID" && orderStatus === "FULFILLED")) return "fulfilled";
  if (paymentStatus === "PAID" || proofStatus === "VERIFIED" || orderStatus === "PAID") return "paid";
  // Fresh upload after a rejection should show "under review", not rejected.
  if (proofStatus === "UPLOADED") return "proof_under_review";
  if (proofStatus === "REJECTED" || (paymentStatus === "FAILED" && proofStatus !== "UPLOADED")) return "proof_rejected";
  if (Boolean(order.payment?.proofUrl) && proofStatus !== "REJECTED") return "proof_under_review";
  if (proofStatus === "REQUESTED" || paymentStatus === "AWAITING_PROOF") return "awaiting_proof";
  if (paymentStatus === "FAILED") return "failed";
  return "awaiting_payment";
}

export function libraryOrderStageCopy(order: LibraryOrderStageInput): {
  stage: LibraryPaymentStage;
  title: string;
  description: string;
  badge: string;
  tone: "success" | "pending" | "error" | "neutral";
  showBankDetails: boolean;
  showProofUpload: boolean;
  showProofReceived: boolean;
  adminNote?: string;
  paymentDisplay: PaymentStatusDisplay;
} {
  const stage = libraryPaymentStage(order);
  const adminNote =
    order.payment?.adminNote ||
    (typeof order.payment?.metadata?.adminNote === "string" ? order.payment.metadata.adminNote : undefined) ||
    (typeof order.payment?.metadata?.rejectReason === "string" ? order.payment.metadata.rejectReason : undefined) ||
    undefined;

  const paymentDisplay = paymentStatusDisplay({
    status: (order.payment?.status || order.paymentStatus || "PENDING") as "PENDING",
    manual: order.payment?.manual !== false,
    proofStatus: order.payment?.proofStatus || undefined,
    proofUrl: order.payment?.proofUrl || undefined,
    metadata: {
      ...(order.payment?.metadata ?? {}),
      ...(adminNote ? { adminNote } : {}),
    },
  });

  if (adminNote && (stage === "proof_rejected" || stage === "refunded" || stage === "failed")) {
    paymentDisplay.description = `${paymentDisplay.description} Reason: ${adminNote}`;
  }

  switch (stage) {
    case "fulfilled":
      return {
        stage,
        title: "Order complete",
        description: "Payment is verified and your Library purchase is ready in My Library.",
        badge: "Complete",
        tone: "success",
        showBankDetails: false,
        showProofUpload: false,
        showProofReceived: false,
        adminNote,
        paymentDisplay,
      };
    case "paid":
      return {
        stage,
        title: "Payment verified",
        description: "Finance confirmed your payment. Digital access unlocks in My Library; printed items move to fulfilment.",
        badge: "Paid",
        tone: "success",
        showBankDetails: false,
        showProofUpload: false,
        showProofReceived: false,
        adminNote,
        paymentDisplay,
      };
    case "proof_under_review":
      return {
        stage,
        title: "Proof under review",
        description: "Your proof of payment was received. You do not need to upload again unless finance asks for a clearer receipt.",
        badge: "Under review",
        tone: "pending",
        showBankDetails: true,
        showProofUpload: false,
        showProofReceived: true,
        adminNote,
        paymentDisplay,
      };
    case "proof_rejected":
      return {
        stage,
        title: "Proof rejected",
        description: adminNote
          ? `Finance could not verify your proof. ${adminNote}`
          : "Finance could not verify your proof. Upload a clearer receipt with the correct reference, or contact support.",
        badge: "Proof rejected",
        tone: "error",
        showBankDetails: true,
        showProofUpload: true,
        showProofReceived: false,
        adminNote,
        paymentDisplay,
      };
    case "refunded":
      return {
        stage,
        title: "Order refunded",
        description: adminNote
          ? `This Library order was refunded. ${adminNote}`
          : "This Library order was refunded and related download access has been revoked.",
        badge: "Refunded",
        tone: "neutral",
        showBankDetails: false,
        showProofUpload: false,
        showProofReceived: false,
        adminNote,
        paymentDisplay,
      };
    case "failed":
      return {
        stage,
        title: "Payment failed",
        description: "This payment did not complete. Start a new checkout if you still want the products.",
        badge: "Failed",
        tone: "error",
        showBankDetails: false,
        showProofUpload: false,
        showProofReceived: false,
        adminNote,
        paymentDisplay,
      };
    case "awaiting_proof":
      return {
        stage,
        title: "Upload proof of payment",
        description:
          "1) Pay using the HouseLink details below. 2) Put your payment reference on the transfer. 3) Upload a clear PDF or photo of the receipt (bank slip, EcoCash/ZIPIT screenshot).",
        badge: "Awaiting proof",
        tone: "pending",
        showBankDetails: true,
        showProofUpload: true,
        showProofReceived: false,
        adminNote,
        paymentDisplay,
      };
    default:
      return {
        stage: "awaiting_payment",
        title: "Awaiting payment",
        description:
          "1) Pay using the HouseLink bank or mobile money details. 2) Include your payment reference on the transfer. 3) Upload a clear PDF or photo of the receipt for finance to verify.",
        badge: "Awaiting payment",
        tone: "pending",
        showBankDetails: true,
        showProofUpload: true,
        showProofReceived: false,
        adminNote,
        paymentDisplay,
      };
  }
}

export function libraryOrderStatusLabel(status?: string | null) {
  switch (String(status || "").toUpperCase()) {
    case "FULFILLED":
      return "Fulfilled";
    case "PAID":
      return "Paid · preparing";
    case "REFUNDED":
      return "Refunded";
    case "CANCELLED":
      return "Cancelled";
    default:
      return "Pending";
  }
}
