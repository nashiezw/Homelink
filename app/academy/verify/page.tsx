import type { Metadata } from "next";
import { Suspense } from "react";
import { CertificateVerificationClient } from "@/components/academy/certificate-verification-client";
import { PageShell } from "@/components/layout/page-shell";

export const metadata: Metadata = {
  title: "Verify a HouseLink Academy Certificate | HouseLink Zimbabwe",
  description: "Check whether a HouseLink Academy certificate is active, valid, and tied to assessed property industry skills.",
  alternates: {
    canonical: "/academy/verify",
  },
};

export default function AcademyCertificateVerificationPage() {
  return (
    <PageShell
      eyebrow="Academy Verification"
      title="Verify a HouseLink Academy certificate"
      description="Confirm that a certificate number is active, authentic, and linked to assessed HouseLink property training outcomes."
      highlights={[
        { value: "Active", label: "Credential status" },
        { value: "Proof", label: "Assessment evidence" },
        { value: "Public", label: "Shareable verification" },
      ]}
    >
      <Suspense fallback={<div className="h-40 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />}>
        <CertificateVerificationClient />
      </Suspense>
    </PageShell>
  );
}
