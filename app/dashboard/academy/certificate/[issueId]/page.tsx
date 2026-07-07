"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { CertificateDocument } from "@/components/academy/certificate-document";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/providers/app-provider";
import { apiFetch } from "@/lib/api/client";
import { getProgrammeCourse } from "@/lib/academy/academy-programme";

type CertificatePayload = {
  id: string;
  certificateNumber: string;
  courseId: string;
  courseTitle: string;
  certificateTitle: string;
  issuedAt: string;
  expiresAt?: string | null;
  verifyUrl: string;
  learnerName: string;
  accent: string;
};

export default function AcademyCertificatePage({ params }: { params: Promise<{ issueId: string }> }) {
  const { issueId } = use(params);
  const { user } = useApp();
  const [data, setData] = useState<CertificatePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiFetch<CertificatePayload>(`/api/v1/academy/certificates/${issueId}`).then((result) => {
      if (result.data) setData(result.data);
      else setError(result.error?.message ?? "Certificate not found.");
    });
  }, [issueId]);

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 text-center">
        <p>Sign in to view your certificate.</p>
      </div>
    );
  }

  if (!data && !error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-lg font-semibold">{error ?? "Certificate unavailable"}</p>
        <Link href="/dashboard/academy" className="mt-6 inline-block"><Button variant="secondary">Back to dashboard</Button></Link>
      </div>
    );
  }

  const programme = getProgrammeCourse(data.courseId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-emerald-50/40 to-amber-50/30 print:bg-white">
      <div className="mx-auto max-w-5xl px-4 pt-6 print:hidden">
        <Link href="/dashboard/academy">
          <Button variant="ghost"><ArrowLeft className="size-4 mr-2" /> Back to Academy</Button>
        </Link>
      </div>
      <CertificateDocument
        learnerName={data.learnerName}
        courseTitle={data.courseTitle}
        certificateTitle={data.certificateTitle}
        certificateNumber={data.certificateNumber}
        issuedAt={data.issuedAt}
        expiresAt={data.expiresAt}
        verifyUrl={data.verifyUrl}
        accent={programme?.theme.accent ?? data.accent}
      />
    </div>
  );
}
