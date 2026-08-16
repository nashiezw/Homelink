"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowRight, CheckCircle2, Clock, CreditCard, Home, Mail, ShieldCheck, Tag, Upload } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";

type RegistrationStatus = {
  id: string;
  courseId: string;
  courseTitle: string;
  firstLesson?: { lessonId: string; lessonTitle: string; href: string } | null;
  status: "APPROVED" | "PENDING_PAYMENT" | "PAYMENT_UPLOADED" | "PENDING_EMAIL_VERIFICATION" | "EXPIRED" | "REJECTED" | "REFUNDED";
  paymentId?: string;
  finalPrice?: number;
  currency?: string;
  needsPaymentProof?: boolean;
  emailVerified?: boolean;
  emailSent?: boolean;
  emailError?: string;
  firstLessonStarted?: boolean;
  firstLessonStartDeadlineAt?: string | null;
  firstLessonStartHoursRemaining?: number | null;
  firstLessonStartWindowHours?: number;
};

function RegistrationConfirmationContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<RegistrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [promoBusy, setPromoBusy] = useState(false);
  const [promoMessage, setPromoMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const registrationId = searchParams?.get("id");
  const emailSentParam = searchParams?.get("emailSent");
  const finalPriceParam = searchParams?.get("finalPrice");
  const currencyParam = searchParams?.get("currency");

  const emailSent = emailSentParam === "true";
  const queryFinalPrice = finalPriceParam ? parseFloat(finalPriceParam) : undefined;
  const queryCurrency = currencyParam || "USD";

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

  const dbFinalPrice = typeof status.finalPrice === "number" && Number.isFinite(status.finalPrice) ? status.finalPrice : undefined;
  const finalPrice = dbFinalPrice ?? (typeof queryFinalPrice === "number" && Number.isFinite(queryFinalPrice) ? queryFinalPrice : undefined);
  const currency = status.currency || queryCurrency;
  const paymentPending = status.status === "PENDING_PAYMENT";
  const paymentUploaded = status.status === "PAYMENT_UPLOADED";
  const paymentRequired = (paymentPending || paymentUploaded) && (finalPrice === undefined || finalPrice > 0);
  const noPaymentDue = (paymentPending || paymentUploaded) && finalPrice !== undefined && finalPrice <= 0;
  const canApplyPromo = paymentPending && paymentRequired && !paymentUploaded;
  const firstLessonHref = status.firstLesson?.href ?? `/dashboard/academy/${status.courseId}`;
  const deadlineLabel = formatDeadline(status.firstLessonStartDeadlineAt, status.firstLessonStartHoursRemaining);

  async function applyPromoCode() {
    const currentRegistrationId = status?.id;
    if (!currentRegistrationId) return;
    const code = promoCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!code) {
      setPromoMessage({ type: "error", text: "Enter a promo code first." });
      return;
    }
    setPromoBusy(true);
    setPromoMessage(null);
    const result = await apiFetch<RegistrationStatus & { promoApplied?: boolean; discountAmount?: number; code?: string }>(`/api/v1/academy/registration/${currentRegistrationId}/coupon`, {
      method: "POST",
      body: JSON.stringify({ code }),
    });
    setPromoBusy(false);
    if (result.error) {
      setPromoMessage({ type: "error", text: result.error.message });
      return;
    }
    if (result.data) {
      setStatus(result.data);
      setPromoCode("");
      const discount = typeof result.data.discountAmount === "number" ? `${result.data.currency || currency} ${result.data.discountAmount.toFixed(2)}` : "your discount";
      setPromoMessage({ type: "success", text: `${result.data.code || code} applied. You saved ${discount}.` });
    }
  }

  return (
    <PageShell eyebrow="HouseLink Academy" title="Registration Confirmation" description="">
      <div className="mx-auto max-w-4xl">
        {status.status === "APPROVED" && (
          <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-xl shadow-emerald-900/5 dark:border-emerald-800/70 dark:bg-slate-950">
            <div className="border-b border-emerald-100 bg-emerald-50 px-6 py-8 text-center dark:border-emerald-900/60 dark:bg-emerald-950/30 sm:px-10">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-900/20">
                <CheckCircle2 className="size-9" />
              </div>
              <h1 className="text-3xl font-bold text-slate-950 dark:text-white">Registration Complete</h1>
                <p className="mx-auto mt-3 max-w-2xl text-base text-slate-600 dark:text-slate-300">You now have access to {status.courseTitle}.</p>
            </div>
            <div className="grid gap-4 p-6 sm:grid-cols-3 sm:p-8">
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Course</p>
                <p className="mt-2 font-semibold text-slate-950 dark:text-white">{status.courseTitle}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Access</p>
                <p className="mt-2 font-semibold text-emerald-700 dark:text-emerald-300">Place reserved</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Payment</p>
                <p className="mt-2 font-semibold text-slate-950 dark:text-white">{currency} {(finalPrice ?? 0).toFixed(2)}</p>
              </div>
            </div>
            <div className="border-t border-slate-100 p-6 dark:border-slate-800 sm:p-8">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">Recommended first step</p>
                <h2 className="mt-2 text-xl font-bold text-slate-950 dark:text-white">{status.firstLesson?.lessonTitle ?? "Open your course"}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Your place has been reserved. Start your first lesson within {status.firstLessonStartWindowHours ?? 72} hours to keep your place. The system will release unused places.
                </p>
                {deadlineLabel && <p className="mt-3 text-sm font-semibold text-emerald-800 dark:text-emerald-200">Start deadline: {deadlineLabel}</p>}
              </div>
              <Link href={firstLessonHref} className="mt-4 block">
                <Button className="w-full sm:w-auto">
                  <ArrowRight className="size-4 mr-2" /> Start Lesson 1
                </Button>
              </Link>
            </div>
          </div>
        )}

        {status.status === "EXPIRED" && (
          <div className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-xl shadow-amber-900/5 dark:border-amber-900 dark:bg-slate-950">
            <div className="border-b border-amber-100 bg-amber-50 px-6 py-8 text-center dark:border-amber-900/60 dark:bg-amber-950/30 sm:px-10">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-lg shadow-amber-900/20">
                <Clock className="size-9" />
              </div>
              <h1 className="text-3xl font-bold text-slate-950 dark:text-white">Place Released</h1>
              <p className="mx-auto mt-3 max-w-2xl text-base text-slate-600 dark:text-slate-300">
                This reserved place for {status.courseTitle} was released because Lesson 1 was not started within {status.firstLessonStartWindowHours ?? 72} hours.
              </p>
            </div>
            <div className="p-6 text-center sm:p-8">
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                You can contact Academy admin or register again if places are available.
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Link href="/academy">
                  <Button variant="secondary" className="w-full sm:w-auto">
                    <Home className="size-4 mr-2" /> Back to Academy
                  </Button>
                </Link>
                <Link href="/dashboard/academy">
                  <Button className="w-full sm:w-auto">
                    <ArrowRight className="size-4 mr-2" /> Open Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {(status.status === "PENDING_PAYMENT" || status.status === "PAYMENT_UPLOADED") && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-950">
            <div className="bg-slate-950 px-6 py-8 text-white dark:bg-slate-900 sm:px-10">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                    {paymentUploaded ? <ShieldCheck className="size-4" /> : paymentRequired ? <CreditCard className="size-4" /> : <CheckCircle2 className="size-4" />}
                    {paymentUploaded ? "Proof submitted" : paymentRequired ? "Payment pending" : "Approval pending"}
                  </div>
                  <h1 className="text-3xl font-bold">Registration Submitted</h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                    {paymentUploaded
                      ? `Your payment proof for ${status.courseTitle} is awaiting admin verification.`
                      : paymentRequired
                        ? `Your registration for ${status.courseTitle} is saved. Complete payment to unlock admin approval.`
                        : `Your registration for ${status.courseTitle} is awaiting admin approval.`}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-left sm:min-w-48">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Balance Due</p>
                  <p className="mt-1 text-3xl font-bold">{finalPrice === undefined ? "Check dashboard" : `${currency} ${finalPrice.toFixed(2)}`}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-5 p-6 sm:p-8 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
                <h3 className="flex items-center gap-2 font-semibold text-slate-950 dark:text-white">
                  {paymentUploaded ? <ShieldCheck className="size-5 text-emerald-600" /> : paymentRequired ? <CreditCard className="size-5 text-amber-600" /> : <CheckCircle2 className="size-5 text-emerald-600" />}
                  {paymentUploaded ? "Payment proof uploaded" : paymentRequired ? "Payment required" : "No payment due"}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {paymentUploaded
                    ? "Your proof is safely recorded. Admin will verify it before activating your course access."
                    : paymentRequired
                      ? "Use the payment instructions in your dashboard, then upload proof of payment so admin can verify your access."
                      : "No payment is due for this registration. Admin only needs to approve the learner application."}
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Course</p>
                    <p className="mt-1 font-semibold text-slate-950 dark:text-white">{status.courseTitle}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current status</p>
                    <p className="mt-1 font-semibold text-slate-950 dark:text-white">{paymentUploaded ? "Verification pending" : paymentRequired ? "Payment pending" : "Admin approval pending"}</p>
                  </div>
                </div>
              </div>

              {canApplyPromo && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/70 dark:bg-emerald-950/20">
                  <h3 className="flex items-center gap-2 font-semibold text-emerald-950 dark:text-emerald-100">
                    <Tag className="size-5" />
                    Have a promo code?
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-emerald-800 dark:text-emerald-200">
                    You can still apply a promo code before uploading payment proof.
                  </p>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <input
                      value={promoCode}
                      onChange={(event) => {
                        setPromoCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""));
                        setPromoMessage(null);
                      }}
                      placeholder="PROMO CODE"
                      className="min-h-11 flex-1 rounded-xl border border-emerald-200 bg-white px-4 text-sm font-semibold uppercase tracking-wide text-slate-950 outline-none ring-emerald-500 transition focus:ring-2 dark:border-emerald-900 dark:bg-slate-950 dark:text-white"
                    />
                    <Button onClick={() => void applyPromoCode()} disabled={promoBusy} className="min-h-11">
                      {promoBusy ? "Applying..." : "Apply"}
                    </Button>
                  </div>
                  {promoMessage && (
                    <p className={`mt-3 flex items-start gap-2 text-sm font-medium ${promoMessage.type === "success" ? "text-emerald-700 dark:text-emerald-200" : "text-red-700 dark:text-red-300"}`}>
                      {promoMessage.type === "success" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <AlertCircle className="mt-0.5 size-4 shrink-0" />}
                      {promoMessage.text}
                    </p>
                  )}
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800 lg:col-span-2">
                <h4 className="font-semibold text-slate-950 dark:text-white">Next steps</h4>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {paymentRequired && (
                    <>
                      <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">1</span>
                        <p className="mt-3 text-sm font-medium text-slate-950 dark:text-white">{emailSent ? "Follow the payment email" : "Check dashboard instructions"}</p>
                      </div>
                      {status.needsPaymentProof && !paymentUploaded && (
                        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">2</span>
                          <p className="mt-3 text-sm font-medium text-slate-950 dark:text-white">Upload payment proof</p>
                        </div>
                      )}
                      <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">{status.needsPaymentProof && !paymentUploaded ? "3" : "2"}</span>
                        <p className="mt-3 text-sm font-medium text-slate-950 dark:text-white">Wait for admin approval</p>
                      </div>
                    </>
                  )}
                  {noPaymentDue && (
                    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">1</span>
                      <p className="mt-3 text-sm font-medium text-slate-950 dark:text-white">Wait for admin approval</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 p-6 dark:border-slate-800 sm:flex-row sm:p-8">
              {status.needsPaymentProof && paymentRequired && !paymentUploaded && (
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
          <div className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-xl shadow-blue-900/5 dark:border-blue-900 dark:bg-slate-950">
            <div className="border-b border-blue-100 bg-blue-50 px-6 py-8 text-center dark:border-blue-900/60 dark:bg-blue-950/30 sm:px-10">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-900/20">
                <Mail className="size-9" />
              </div>
              <h1 className="text-3xl font-bold text-slate-950 dark:text-white">Verify Your Email</h1>
              <p className="mx-auto mt-3 max-w-2xl text-base text-slate-600 dark:text-slate-300">We sent a verification link to your email address.</p>
            </div>
            
            <div className="p-6 sm:p-8">
              <h3 className="font-semibold text-slate-950 dark:text-white">To complete your registration</h3>
              <ol className="mt-4 space-y-3 text-slate-700 dark:text-slate-300">
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

            <div className="flex flex-col gap-3 border-t border-slate-100 p-6 dark:border-slate-800 sm:flex-row sm:p-8">
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

function formatDeadline(deadline?: string | null, hoursRemaining?: number | null) {
  if (!deadline) return "";
  const date = new Date(deadline);
  if (!Number.isFinite(date.getTime())) return "";
  const formatted = date.toLocaleString();
  if (typeof hoursRemaining === "number") {
    if (hoursRemaining <= 0) return `${formatted} - expired`;
    return `${formatted} - ${hoursRemaining} hour${hoursRemaining === 1 ? "" : "s"} left`;
  }
  return formatted;
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
