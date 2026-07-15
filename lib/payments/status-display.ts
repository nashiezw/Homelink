import type { Payment } from "@/lib/store/types";

export type PaymentStatusTone = "success" | "pending" | "error" | "neutral";

export type PaymentStatusDisplay = {
  label: string;
  title: string;
  description: string;
  tone: PaymentStatusTone;
  action?: string;
};

type PaymentStatusInput = Pick<Payment, "status" | "manual"> & {
  proofStatus?: string;
  proofUrl?: string;
  metadata?: Record<string, unknown>;
};

export function paymentStatusDisplay(payment: PaymentStatusInput): PaymentStatusDisplay {
  if (hasFailedWebhook(payment.metadata)) {
    return {
      label: "Failed webhook",
      title: "Gateway update failed",
      description: "HomeLink did not receive a trusted payment confirmation from the gateway. Finance must review this before activation.",
      tone: "error",
      action: "Contact support with your payment reference.",
    };
  }

  if (payment.status === "REFUNDED") {
    return {
      label: "Refunded",
      title: "Payment refunded",
      description: "HomeLink has marked this payment as refunded. The related service is not active from this payment.",
      tone: "neutral",
    };
  }

  if (payment.status === "REVERSED") {
    return {
      label: "Reversed",
      title: "Payment reversed",
      description: "This payment was reversed by finance. Do not treat it as money received.",
      tone: "error",
    };
  }

  if (payment.status === "FAILED" || payment.proofStatus === "REJECTED") {
    return {
      label: payment.proofStatus === "REJECTED" ? "Proof rejected" : "Payment failed",
      title: payment.proofStatus === "REJECTED" ? "Proof rejected" : "Payment failed",
      description: payment.proofStatus === "REJECTED"
        ? "Finance could not verify the uploaded proof. Upload a clearer receipt or contact support before paying again."
        : "The payment did not complete. No HomeLink service has been activated from this attempt.",
      tone: "error",
      action: payment.proofStatus === "REJECTED" ? "Upload new proof or contact support." : "Create a new payment when you are ready.",
    };
  }

  if (payment.status === "PAID" || payment.proofStatus === "VERIFIED") {
    return {
      label: "Verified",
      title: "Payment verified",
      description: "HomeLink finance has verified this payment. The related service can now be activated.",
      tone: "success",
    };
  }

  if (payment.manual && payment.proofStatus === "UPLOADED") {
    return {
      label: "Pending proof review",
      title: "Proof under review",
      description: "Your proof was uploaded successfully. Finance still needs to verify that money reached HomeLink.",
      tone: "pending",
      action: "Keep your receipt until finance confirms.",
    };
  }

  if (payment.manual && (payment.proofStatus === "REQUESTED" || payment.status === "AWAITING_PROOF")) {
    return {
      label: "Pending proof",
      title: "Pending proof upload",
      description: "A manual transfer has been created, but HomeLink has not received proof yet.",
      tone: "pending",
      action: "Pay using the reference, then upload proof.",
    };
  }

  if (payment.manual && payment.status === "PENDING") {
    return {
      label: "Manual transfer pending",
      title: "Manual transfer pending",
      description: "HomeLink is waiting for the transfer and proof before finance can verify this payment.",
      tone: "pending",
      action: "Use the reference in your transfer narration.",
    };
  }

  if (payment.status === "PENDING" || payment.status === "MANUAL_REVIEW") {
    return {
      label: payment.status === "MANUAL_REVIEW" ? "Manual review" : "Pending",
      title: payment.status === "MANUAL_REVIEW" ? "Manual review required" : "Payment pending",
      description: "This payment is not verified yet. Do not assume money moved until HomeLink confirms it.",
      tone: "pending",
    };
  }

  return {
    label: String(payment.status).replace(/_/g, " "),
    title: String(payment.status).replace(/_/g, " "),
    description: "HomeLink has recorded this payment state. Contact support if it does not match your receipt.",
    tone: "neutral",
  };
}

export function paymentStatusTone(status: string): PaymentStatusTone {
  if (status === "PAID" || status === "success" || status === "VERIFIED") return "success";
  if (status === "FAILED" || status === "failed" || status === "REJECTED" || status === "REVERSED") return "error";
  if (status === "PENDING" || status === "AWAITING_PROOF" || status === "MANUAL_REVIEW" || status === "pending" || status === "UPLOADED") {
    return "pending";
  }
  return "neutral";
}

function hasFailedWebhook(metadata: PaymentStatusInput["metadata"]) {
  if (!metadata) return false;
  return metadata.webhookStatus === "FAILED" || Boolean(metadata.webhookFailed) || Boolean(metadata.lastWebhookError);
}
