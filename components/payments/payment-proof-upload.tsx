"use client";

import { Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics/client";
import { apiFetch } from "@/lib/api/client";

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

type PaymentProofUploadProps = {
  paymentId: string;
  onUploaded: () => void;
  showToast: (message: string, tone?: "error" | "success" | "info") => void;
  label?: string;
  className?: string;
};

export function PaymentProofUpload({
  paymentId,
  onUploaded,
  showToast,
  label = "Upload proof of payment",
  className,
}: PaymentProofUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function uploadProof(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;

    setBusy(true);
    const dataUrl = await readFile(file);
    const uploaded = await apiFetch<{ url: string }>("/api/v1/uploads", {
      method: "POST",
      body: JSON.stringify({ dataUrl, kind: "document", folder: "payments" }),
    });

    if (uploaded.error || !uploaded.data) {
      setBusy(false);
      trackEvent("upload_failed", paymentId, { stage: "storage", reason: uploaded.error?.code ?? "unknown" });
      showToast(uploaded.error?.message ?? "Proof upload failed.", "error");
      return;
    }

    const proof = await apiFetch(`/api/v1/payments/${paymentId}/proof`, {
      method: "POST",
      body: JSON.stringify({ proofUrl: uploaded.data.url }),
    });
    setBusy(false);

    if (proof.error) {
      trackEvent("upload_failed", paymentId, { stage: "proof_submit", reason: proof.error.code ?? "unknown" });
      showToast(proof.error.message ?? "Could not submit proof.", "error");
      return;
    }

    showToast("Proof uploaded. Status is now pending finance verification.", "success");
    onUploaded();
  }

  return (
    <>
      <Button
        className={className}
        variant="secondary"
        disabled={busy}
        onClick={() => fileRef.current?.click()}
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="mr-2 size-4" />}
        {label}
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp"
        className="hidden"
        onChange={(event) => void uploadProof(event.target.files)}
      />
    </>
  );
}
