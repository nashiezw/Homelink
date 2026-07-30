"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, CheckCircle2, KeyRound } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";

type ClaimPreview = {
  id: string;
  email: string;
  expiresAt: string | null;
  orderNumber: string;
  total: number;
  currency: string;
};

function LibraryClaimInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams?.get("token")?.trim() ?? "";
  const [claim, setClaim] = useState<ClaimPreview | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError("This claim link is missing a token.");
      return;
    }
    void apiFetch<{ claim: ClaimPreview }>(`/api/v1/library/claims/redeem?token=${encodeURIComponent(token)}`).then((result) => {
      setLoading(false);
      if (result.error || !result.data?.claim) {
        setError(result.error?.message ?? "This claim link is invalid or already used.");
        return;
      }
      setClaim(result.data.claim);
    });
  }, [token]);

  async function redeem() {
    if (!token) return;
    setBusy(true);
    setError("");
    const result = await apiFetch<{ redirectUrl?: string }>("/api/v1/library/claims/redeem", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
    setBusy(false);
    if (result.error) {
      setError(result.error.message || "Could not redeem this claim.");
      return;
    }
    router.push(result.data?.redirectUrl || "/dashboard/my-library");
  }

  return (
    <PageShell
      eyebrow="Library access claim"
      title="Claim your Library purchase"
      description="Use the email linked to this claim, then unlock downloads and order tracking in My Library."
      compactHero
      actions={<Link href="/dashboard/my-library" className="border border-white/20 bg-white/10 text-white hover:bg-white/15">My Library</Link>}
    >
      <section className="mx-auto max-w-xl surface-panel rounded-lg p-6">
        {loading ? (
          <p className="text-sm text-slate-500">Checking claim link…</p>
        ) : claim ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <KeyRound className="mt-0.5 size-5 text-emerald-600" />
              <div>
                <p className="font-semibold text-ink dark:text-white">Order {claim.orderNumber}</p>
                <p className="mt-1 text-sm text-slate-500">
                  Claim email: <strong>{claim.email}</strong>
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Total {claim.currency} {claim.total.toFixed(2)}
                  {claim.expiresAt ? ` · expires ${new Date(claim.expiresAt).toLocaleDateString()}` : ""}
                </p>
              </div>
            </div>
            <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              Sign in with exactly this email, then redeem to attach the order and unlock digital access.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button disabled={busy} onClick={() => void redeem()}>
                <CheckCircle2 className="size-4" /> {busy ? "Claiming…" : "Redeem access"}
              </Button>
              <Button variant="secondary" onClick={() => { window.location.href = `/login?next=${encodeURIComponent(`/library/claim?token=${token}`)}`; }}>
                Sign in first
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <BookOpen className="size-8 text-slate-400" />
            <p className="font-semibold">Claim unavailable</p>
            <p className="text-sm text-slate-500">{error || "Ask HouseLink support to issue a fresh claim link."}</p>
          </div>
        )}
        {error && claim && (
          <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}
      </section>
    </PageShell>
  );
}

export default function LibraryClaimPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-500">Loading claim…</div>}>
      <LibraryClaimInner />
    </Suspense>
  );
}
