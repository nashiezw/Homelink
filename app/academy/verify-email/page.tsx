"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, Home, Mail, RefreshCw } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "check-email" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [resending, setResending] = useState(false);

  const token = searchParams?.get("token");
  const pending = searchParams?.get("pending") === "true";

  useEffect(() => {
    if (!token) {
      setStatus(pending ? "check-email" : "error");
      setMessage(pending
        ? "We sent a verification link to the email address on your account."
        : "Open the verification link from your email, or request a new one below.");
      return;
    }

    async function verifyEmail() {
      try {
        const result = await apiFetch("/api/v1/academy/verify-email", {
          method: "POST",
          body: JSON.stringify({ token }),
        });
        
        if (result.error) {
          setStatus("error");
          setMessage(result.error.message);
        } else if (result.data) {
          setStatus("success");
          setMessage((result.data as { message?: string }).message || "Email verified successfully!");
        }
      } catch {
        setStatus("error");
        setMessage("Failed to verify email");
      }
    }

    verifyEmail();
  }, [pending, token]);

  async function resendVerification() {
    setResending(true);
    try {
      const result = await apiFetch("/api/v1/academy/send-verification", {
        method: "POST",
        body: JSON.stringify({}),
      });

      if (result.error) {
        setMessage(result.error.message);
      } else {
        setStatus("check-email");
        setMessage("Verification email sent. Use the link in the newest email; your earlier unexpired link will also remain valid.");
      }
    } catch {
      setMessage("We could not send the verification email. Please try again.");
    } finally {
      setResending(false);
    }
  }

  return (
    <PageShell eyebrow="HouseLink Academy" title="Email Verification" description="">
      <div className="max-w-md mx-auto text-center py-12">
        {status === "loading" && (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-4" />
            <p className="text-slate-600 dark:text-slate-400">Verifying your email...</p>
          </div>
        )}

        {status === "check-email" && (
          <div className="flex flex-col items-center">
            <div className="rounded-full bg-blue-100 dark:bg-blue-900/20 w-20 h-20 flex items-center justify-center mb-6">
              <Mail className="size-10 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">Check Your Email</h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-2">{message}</p>
            <p className="text-sm text-slate-500 dark:text-slate-500 mb-6">
              Click the link in that email to verify your account, then return to the Academy to finish registration.
            </p>
            <Button variant="secondary" onClick={resendVerification} disabled={resending}>
              <RefreshCw className={`size-4 mr-2 ${resending ? "animate-spin" : ""}`} />
              {resending ? "Sending..." : "Resend Verification Email"}
            </Button>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center">
            <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/20 w-20 h-20 flex items-center justify-center mb-6">
              <CheckCircle2 className="size-10 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">Email Verified!</h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-6">{message}</p>
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <Link href="/dashboard/academy" className="flex-1">
                <Button className="w-full">Go to Dashboard</Button>
              </Link>
              <Link href="/academy" className="flex-1">
                <Button variant="secondary" className="w-full">
                  <Home className="size-4 mr-2" /> Back to Academy
                </Button>
              </Link>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center">
            <div className="rounded-full bg-red-100 dark:bg-red-900/20 w-20 h-20 flex items-center justify-center mb-6">
              <XCircle className="size-10 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">Verification Failed</h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-6">{message}</p>
            <Button variant="secondary" className="mb-6" onClick={resendVerification} disabled={resending}>
              <RefreshCw className={`size-4 mr-2 ${resending ? "animate-spin" : ""}`} />
              {resending ? "Sending..." : "Send a New Verification Email"}
            </Button>
            <div className="flex flex-col sm:flex-row gap-3 w-full">
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

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <PageShell eyebrow="HouseLink Academy" title="Loading..." description="">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-4" />
        </div>
      </PageShell>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
