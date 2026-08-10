"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Clock, Mail, Upload, ArrowRight, Home } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";

type RegistrationStatus = {
  id: string;
  courseId: string;
  courseTitle: string;
  status: "APPROVED" | "PENDING_PAYMENT" | "PAYMENT_UPLOADED" | "PENDING_EMAIL_VERIFICATION";
  paymentId?: string;
  finalPrice?: number;
  currency?: string;
  needsPaymentProof?: boolean;
  emailVerified?: boolean;
  emailSent?: boolean;
  emailError?: string;
};

function RegistrationConfirmationContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<RegistrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const registrationId = searchParams?.get("id");
  const emailSentParam = searchParams?.get("emailSent");
  const finalPriceParam = searchParams?.get("finalPrice");
  const currencyParam = searchParams?.get("currency");

  const emailSent = emailSentParam === "true";
  const finalPrice = finalPriceParam ? parseFloat(finalPriceParam) : undefined;
  const currency = currencyParam || "USD";

  useEffect(() => {
    if (!registrationId) {
      setError("No registration ID provided");
      setLoading(false);
      return;
    }

    async function fetchStatus() {
      try {
        const result = await apiFetch<RegistrationStatus>(`/api/v1/academy/registration/${registrationId}`);
        if (result.error) {
          setError(result.error.message);
        } else if (result.data) {
          setStatus(result.data);
        }
      } catch {
        setError("Failed to load registration status");
      } finally {
        setLoading(false);
      }
    }

    fetchStatus();
  }, [registrationId]);

  if (loading) {
    return (
      <PageShell eyebrow="HouseLink Academy" title="Loading..." description="">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </div>
      </PageShell>
    );
  }

  if (error || !status) {
    return (
      <PageShell eyebrow="HouseLink Academy" title="Registration Not Found" description="">
        <div className="max-w-md mx-auto text-center py-12">
          <div className="rounded-full bg-red-100 dark:bg-red-900/20 w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Clock className="size-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">Registration Not Found</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">{error || "We couldn't find your registration details."}</p>
          <Link href="/academy">
            <Button variant="secondary" className="w-full">
              <Home className="size-4 mr-2" /> Back to Academy
            </Button>
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell eyebrow="HouseLink Academy" title="Registration Confirmation" description="">
      <div className="max-w-2xl mx-auto">
        {status.status === "APPROVED" && (
          <div className="text-center py-12">
            <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/20 w-20 h-20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="size-10 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">Registration Complete!</h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-4">You now have access to {status.courseTitle}</p>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-6 mb-8">
              <p className="text-emerald-800 dark:text-emerald-300 font-medium">Your course access is active and ready to use.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <Link href={`/dashboard/academy/${status.courseId}`} className="flex-1">
                <Button className="w-full">
                  <ArrowRight className="size-4 mr-2" /> Start Learning
                </Button>
              </Link>
            </div>
          </div>
        )}

        {(status.status === "PENDING_PAYMENT" || status.status === "PAYMENT_UPLOADED") && (
          <div className="text-center py-12">
            <div className="rounded-full bg-amber-100 dark:bg-amber-900/20 w-20 h-20 flex items-center justify-center mx-auto mb-6">
              <Clock className="size-10 text-amber-600 dark:text-amber-400" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">Registration Submitted</h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-4">Your registration for {status.courseTitle} is pending payment verification</p>
            
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6 mb-8 text-left">
              <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-3">Payment Required</h3>
              <div className="space-y-3 text-amber-800 dark:text-amber-300">
                {finalPrice !== undefined && finalPrice > 0 ? (
                  <>
                    <p className="text-base">
                      <span className="font-medium">Amount to pay:</span>{" "}
                      <span className="font-bold text-lg">{currency} {finalPrice.toFixed(2)}</span>
                    </p>
                    {status.needsPaymentProof && (
                      <div className="bg-amber-100 dark:bg-amber-900/30 rounded-lg p-4 mt-4">
                        <p className="font-medium mb-2">Action Required:</p>
                        <p className="text-sm">Please upload proof of payment from your learner dashboard to complete your registration. Your access will be activated after admin verification.</p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-base font-medium text-emerald-700 dark:text-emerald-300">
                    This course is free! Your registration is complete and awaiting admin approval.
                  </p>
                )}
              </div>
              
              <div className="mt-6 pt-4 border-t border-amber-200 dark:border-amber-800">
                <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">Next Steps:</h4>
                <ol className="space-y-2 text-sm text-amber-800 dark:text-amber-300">
                  {finalPrice !== undefined && finalPrice > 0 && (
                    <>
                      {emailSent ? (
                        <li className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center text-amber-900 dark:text-amber-100 text-sm font-bold">1</span>
                          <span>Complete payment using the instructions sent to your email</span>
                        </li>
                      ) : (
                        <li className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center text-amber-900 dark:text-amber-100 text-sm font-bold">1</span>
                          <span>Check your learner dashboard for payment instructions</span>
                        </li>
                      )}
                      {status.needsPaymentProof && (
                        <li className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center text-amber-900 dark:text-amber-100 text-sm font-bold">2</span>
                          <span>Upload proof of payment from your learner dashboard</span>
                        </li>
                      )}
                      <li className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center text-amber-900 dark:text-amber-100 text-sm font-bold">
                          {status.needsPaymentProof ? "3" : "2"}
                        </span>
                        <span>Wait for admin approval (usually within 24-48 hours)</span>
                      </li>
                    </>
                  )}
                  {finalPrice !== undefined && finalPrice === 0 && (
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center text-amber-900 dark:text-amber-100 text-sm font-bold">1</span>
                      <span>Wait for admin approval (usually within 24-48 hours)</span>
                    </li>
                  )}
                </ol>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {status.needsPaymentProof && finalPrice !== undefined && finalPrice > 0 && (
                <Link href="/dashboard/academy" className="flex-1">
                  <Button className="w-full">
                    <Upload className="size-4 mr-2" /> Upload Payment Proof
                  </Button>
                </Link>
              )}
              <Link href="/dashboard/academy" className="flex-1">
                <Button variant="secondary" className="w-full">
                  <ArrowRight className="size-4 mr-2" /> Go to Dashboard
                </Button>
              </Link>
              <Link href="/academy" className="flex-1">
                <Button variant="secondary" className="w-full">
                  <Home className="size-4 mr-2" /> Back to Academy
                </Button>
              </Link>
            </div>
          </div>
        )}

        {status.status === "PENDING_EMAIL_VERIFICATION" && (
          <div className="text-center py-12">
            <div className="rounded-full bg-blue-100 dark:bg-blue-900/20 w-20 h-20 flex items-center justify-center mx-auto mb-6">
              <Mail className="size-10 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">Verify Your Email</h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-4">We sent a verification link to your email address</p>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 mb-8 text-left">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">To complete your registration:</h3>
              <ol className="space-y-3 text-blue-800 dark:text-blue-300">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center text-blue-900 dark:text-blue-100 text-sm font-bold">1</span>
                  <span>Check your email inbox for the verification link</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center text-blue-900 dark:text-blue-100 text-sm font-bold">2</span>
                  <span>Click the verification link to confirm your email</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center text-blue-900 dark:text-blue-100 text-sm font-bold">3</span>
                  <span>Your registration will be processed after verification</span>
                </li>
              </ol>
              <p className="mt-4 text-sm text-blue-700 dark:text-blue-400">
                If you don't see the email, check your spam folder or request a new verification link.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                variant="secondary" 
                className="w-full"
                onClick={async () => {
                  const result = await apiFetch("/api/v1/academy/resend-verification", {
                    method: "POST",
                    body: JSON.stringify({ registrationId: status.id }),
                  });
                  if (result.data) {
                    alert("Verification email resent successfully!");
                  } else {
                    alert("Failed to resend verification email.");
                  }
                }}
              >
                <Mail className="size-4 mr-2" /> Resend Verification Email
              </Button>
              <Link href="/academy" className="flex-1">
                <Button variant="secondary" className="w-full">
                  <Home className="size-4 mr-2" /> Back to Academy
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}

export default function RegistrationConfirmationPage() {
  return (
    <Suspense fallback={
      <PageShell eyebrow="HouseLink Academy" title="Loading..." description="">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </div>
      </PageShell>
    }>
      <RegistrationConfirmationContent />
    </Suspense>
  );
}
