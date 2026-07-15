"use client";

import {
  ArrowRight,
  Banknote,
  Building2,
  CheckCircle2,
  Clock3,
  CreditCard,
  GraduationCap,
  History,
  Home,
  Landmark,
  Loader2,
  Lock,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { AcademyPaymentDetails } from "@/components/academy/academy-payment-details";
import { PageShell } from "@/components/layout/page-shell";
import { PaymentProofUpload } from "@/components/payments/payment-proof-upload";
import { useApp } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics/client";
import { apiFetch } from "@/lib/api/client";
import {
  buildCheckoutPlans,
  findCheckoutPlan,
  formatPaymentAmount,
  formatZwlEquivalent,
  getPlansForGroup,
  PAYMENT_PLAN_GROUPS,
  paymentStatusTone,
  planLabel,
  resolvePaymentMethods,
  type PaymentConfigResponse,
  type PaymentPlanGroupId,
} from "@/lib/payments/payments-page";
import { paymentStatusDisplay } from "@/lib/payments/status-display";
import type { Payment } from "@/lib/store/types";
import type { Listing } from "@/lib/types";
import { cn } from "@/lib/utils";

type PageTab = "checkout" | "history";

export function PaymentsPageClient() {
  const { user, showToast } = useApp();
  const searchParams = useSearchParams();
  const [config, setConfig] = useState<PaymentConfigResponse | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [contextListing, setContextListing] = useState<Listing | null>(null);
  const [activeTab, setActiveTab] = useState<PageTab>("checkout");
  const [planGroup, setPlanGroup] = useState<PaymentPlanGroupId>("listings");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [checkoutBusy, setCheckoutBusy] = useState(false);

  const statusParam = searchParams.get("status") ?? "";
  const selectedPaymentId = searchParams.get("id") ?? "";
  const planParam = searchParams.get("plan") ?? "";
  const listingId = searchParams.get("listingId") ?? "";

  const checkoutPlans = useMemo(() => buildCheckoutPlans(config?.plans), [config?.plans]);
  const paymentMethods = useMemo(() => resolvePaymentMethods(config), [config]);
  const manualMethods = paymentMethods.filter((method) => method.kind === "manual");
  const onlineMethods = paymentMethods.filter((method) => method.kind === "online");

  const refreshPayments = useCallback(() => {
    if (!user) return;
    void apiFetch<Payment[]>("/api/v1/payments/checkout").then((result) => {
      if (result.data) setPayments(result.data);
    });
  }, [user]);

  useEffect(() => {
    void apiFetch<PaymentConfigResponse>("/api/v1/payments/config").then((result) => {
      if (!result.data) return;
      setConfig(result.data);
      const firstManual = result.data.manualMethods[0]?.id;
      if (firstManual) setPaymentMethod(firstManual);
    });
  }, []);

  useEffect(() => {
    refreshPayments();
  }, [refreshPayments]);

  useEffect(() => {
    if (!listingId) {
      setContextListing(null);
      return;
    }
    void apiFetch<Listing>(`/api/v1/listings/${listingId}`).then((result) => {
      if (result.data) setContextListing(result.data);
    });
  }, [listingId]);

  useEffect(() => {
    if (!checkoutPlans.length) return;
    const preferred = findCheckoutPlan(checkoutPlans, planParam);
    if (preferred) {
      setSelectedPlanId(preferred.id);
      setPlanGroup(preferred.groupId);
      return;
    }
    if (!selectedPlanId) {
      const first = getPlansForGroup(checkoutPlans, planGroup)[0] ?? checkoutPlans[0];
      if (first) setSelectedPlanId(first.id);
    }
  }, [checkoutPlans, planParam, planGroup, selectedPlanId]);

  useEffect(() => {
    if (selectedPaymentId) setActiveTab("checkout");
  }, [selectedPaymentId]);

  const selectedPlan = findCheckoutPlan(checkoutPlans, selectedPlanId) ?? checkoutPlans[0] ?? null;
  const selectedPayment = payments.find((payment) => payment.id === selectedPaymentId);
  const currency = config?.currency ?? "USD";
  const groupPlans = getPlansForGroup(checkoutPlans, planGroup);
  const selectedGroup = PAYMENT_PLAN_GROUPS.find((group) => group.id === planGroup) ?? PAYMENT_PLAN_GROUPS[0];
  const zwlHint = selectedPlan ? formatZwlEquivalent(selectedPlan.price, config?.exchangeRateUsdToZwl) : null;
  const showProofStep =
    selectedPayment &&
    selectedPayment.manual &&
    selectedPayment.proofStatus !== "VERIFIED" &&
    selectedPayment.status !== "PAID";

  async function startCheckout() {
    if (!user) {
      showToast("Sign in to pay for HomeLink services.", "info");
      return;
    }
    if (!selectedPlan) return;

    setCheckoutBusy(true);
    trackEvent("payment_started", selectedPlan.id, { method: paymentMethod, listingId: listingId || "" });
    const result = await apiFetch<{ redirectUrl: string; message?: string }>("/api/v1/payments/checkout", {
      method: "POST",
      body: JSON.stringify({
        plan: selectedPlan.id,
        provider: paymentMethod,
        listingId: listingId || undefined,
      }),
    });
    setCheckoutBusy(false);

    if (result.error) {
      showToast(result.error.message ?? "Checkout failed.", "error");
      return;
    }

    if (result.data?.redirectUrl) {
      showToast(result.data.message ?? "Payment created. Complete the steps below.", "success");
      window.location.href = result.data.redirectUrl;
    }
  }

  return (
    <PageShell
      eyebrow="Payments"
      title="Secure HomeLink payments"
      description="Pay for listing upgrades, subscriptions, and marketing with a clear reference, Zimbabwe-friendly payment methods, and finance review before activation."
      highlights={[
        { label: "Currency", value: currency },
        { label: "Primary methods", value: "CBZ / ZIPIT / Cash" },
        { label: "Proof review", value: "Finance verified" },
      ]}
    >
      {statusParam && !selectedPaymentId && <StatusBanner status={statusParam} />}

      {planParam === "tenancy_payment" && (
        <TenancyNotice />
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        <TabButton active={activeTab === "checkout"} onClick={() => setActiveTab("checkout")}>
          <CreditCard className="size-4" />
          Checkout
        </TabButton>
        <TabButton active={activeTab === "history"} onClick={() => setActiveTab("history")}>
          <History className="size-4" />
          Payment history
          {payments.length > 0 && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
              {payments.length}
            </span>
          )}
        </TabButton>
      </div>

      <PaymentTrustStrip />

      {activeTab === "history" ? (
        !user ? (
          <GuestPaymentsGate variant="history" />
        ) : (
          <PaymentHistory payments={payments} currency={currency} onSelect={(id) => {
            window.location.href = `/payments?id=${id}`;
          }} />
        )
      ) : selectedPayment ? (
        <ActivePaymentPanel
          payment={selectedPayment}
          config={config}
          listing={contextListing}
          statusParam={statusParam}
          showProofStep={Boolean(showProofStep)}
          onProofUploaded={refreshPayments}
          showToast={showToast}
        />
      ) : !user ? (
        <GuestPaymentsGate />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            {contextListing && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                <p className="flex items-center gap-2 text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                  <Home className="size-4" />
                  Checkout linked to {contextListing.title}
                </p>
                <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">
                  {contextListing.suburb}, {contextListing.city} - your upgrade applies to this listing after payment approval.
                </p>
              </div>
            )}

            <section className="gpu-card rounded-lg border border-emerald-100 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)] dark:border-emerald-900/40 dark:bg-slate-900">
              <div className="rounded-t-lg border-b border-slate-100 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-xs font-semibold uppercase tracking-normal text-emerald-700 dark:text-emerald-400">
                  Select service
                </p>
                <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-ink dark:text-white">{selectedGroup.label}</h2>
                    <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">{selectedGroup.description}</p>
                  </div>
                  <p className="text-xs font-semibold text-slate-500">{groupPlans.length} option{groupPlans.length === 1 ? "" : "s"}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {PAYMENT_PLAN_GROUPS.map((group) => (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => {
                        setPlanGroup(group.id);
                        const first = getPlansForGroup(checkoutPlans, group.id)[0];
                        if (first) setSelectedPlanId(first.id);
                      }}
                      className={cn(
                        "rounded-lg px-3 py-2 text-sm font-semibold transition",
                        planGroup === group.id
                          ? "bg-emerald-700 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700",
                      )}
                    >
                      {group.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 p-4 sm:grid-cols-2">
                {groupPlans.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={cn(
                      "min-h-[190px] rounded-lg border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md",
                      selectedPlanId === plan.id
                        ? "border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-600/20 dark:border-emerald-500 dark:bg-emerald-950/20"
                        : "border-slate-200 bg-white hover:border-emerald-200 dark:border-slate-700 dark:bg-slate-900/50",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-ink dark:text-white">{plan.name}</p>
                        <p className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                          {formatPaymentAmount(currency, plan.price)}
                        </p>
                      </div>
                      {selectedPlanId === plan.id && <CheckCircle2 className="size-5 shrink-0 text-emerald-700" />}
                    </div>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{plan.description}</p>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {plan.features.slice(0, 2).map((feature) => (
                        <span key={feature} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {selectedPlan && (
              <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900/50">
                <p className="text-sm font-semibold text-ink dark:text-white">Included with {selectedPlan.name}</p>
                <ul className="mt-3 space-y-2">
                  {selectedPlan.features.map((feature) => (
                    <li key={feature} className="flex gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <RelatedPaymentsInfo />
          </div>

          <aside className="h-fit space-y-4 lg:sticky lg:top-6">
            {selectedPlan && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900/50">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Order summary</p>
                <p className="mt-2 text-xl font-bold text-ink dark:text-white">{selectedPlan.name}</p>
                <p className="mt-3 text-3xl font-bold text-emerald-700 dark:text-emerald-300">
                  {formatPaymentAmount(currency, selectedPlan.price)}
                </p>
                {zwlHint && <p className="mt-1 text-xs text-slate-500">{zwlHint}</p>}
                {selectedPlan.durationDays > 0 && (
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                    Active for {selectedPlan.durationDays} days after approval.
                  </p>
                )}
              </div>
            )}

            <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900/50">
              <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink dark:text-white">
                <Banknote className="size-4 text-emerald-700" />
                Payment method
              </p>
              <p className="mb-4 text-xs text-slate-500">Choose how you will pay for this HomeLink service.</p>

              {manualMethods.length > 0 && (
                <MethodGroup
                  title="Zimbabwe - manual"
                  hint="CBZ, ZIPIT, or cash. Upload proof after paying."
                  icon={Smartphone}
                >
                  {manualMethods.map((method) => (
                    <MethodOption
                      key={method.id}
                      id={method.id}
                      label={method.label}
                      selected={paymentMethod === method.id}
                      onSelect={() => setPaymentMethod(method.id)}
                    />
                  ))}
                </MethodGroup>
              )}

              {onlineMethods.length > 0 && (
                <MethodGroup title="Pay online" hint="Card or mobile money when live." icon={CreditCard} className="mt-4">
                  {onlineMethods.map((method) => (
                    <MethodOption
                      key={method.id}
                      id={method.id}
                      label={method.label}
                      selected={paymentMethod === method.id}
                      onSelect={() => setPaymentMethod(method.id)}
                    />
                  ))}
                </MethodGroup>
              )}

              {paymentMethods.length === 0 && (
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Payment methods are loading. Contact support@homelinkzim.co.zw if this persists.
                </p>
              )}
            </div>

            {selectedPlan && (
              <div className="rounded-lg border border-dashed border-slate-200 p-4 text-xs text-slate-500 dark:border-slate-700">
                <p className="font-semibold text-slate-700 dark:text-slate-300">After you create payment</p>
                <p className="mt-1 leading-relaxed">
                  HomeLink issues your reference and bank details on the next screen. You then pay and upload proof for finance review.
                </p>
              </div>
            )}

            <Button className="w-full py-3" disabled={checkoutBusy || !selectedPlan} onClick={() => void startCheckout()}>
              {checkoutBusy ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="mr-2 size-4" />}
              {selectedPlan ? `Create payment - ${formatPaymentAmount(currency, selectedPlan.price)}` : "Select a plan"}
            </Button>

            <p className="text-center text-xs text-slate-500">
              Step 1: create payment / Step 2: pay / Step 3: upload proof / Step 4: finance approval
            </p>
          </aside>
        </div>
      )}
    </PageShell>
  );
}

function ActivePaymentPanel({
  payment,
  config,
  listing,
  statusParam,
  showProofStep,
  onProofUploaded,
  showToast,
}: {
  payment: Payment;
  config: PaymentConfigResponse | null;
  listing: Listing | null;
  statusParam: string;
  showProofStep: boolean;
  onProofUploaded: () => void;
  showToast: (message: string, tone?: "error" | "success" | "info") => void;
}) {
  const reference = payment.referenceNumber ?? payment.id;
  const display = paymentStatusDisplay(payment);

  return (
    <div className="space-y-6">
      <StatusBanner status={statusParam || payment.status} reference={reference} payment={payment} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900/50">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            Active payment
          </p>
          <h2 className="mt-2 text-2xl font-bold text-ink dark:text-white">{planLabel(payment.plan)}</h2>
          {listing && (
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {listing.title} - {listing.suburb}, {listing.city}
            </p>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Metric label="Amount" value={formatPaymentAmount(payment.currency || config?.currency || "USD", payment.amount)} />
            <Metric label="Status" value={display.label} />
            <Metric label="Reference" value={reference} highlight />
          </div>

          <div
            className={cn(
              "mt-5 rounded-xl border p-4 text-sm",
              display.tone === "success" && "border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20",
              display.tone === "pending" && "border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20",
              display.tone === "error" && "border-rose-200 bg-rose-50 dark:border-rose-900/40 dark:bg-rose-950/20",
              display.tone === "neutral" && "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40",
            )}
          >
            <p className="font-semibold text-ink dark:text-white">{display.title}</p>
            <p className="mt-1 text-slate-600 dark:text-slate-400">{display.description}</p>
            {display.action && <p className="mt-2 font-medium text-ink dark:text-white">{display.action}</p>}
          </div>

          {showProofStep && (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
              <p className="font-semibold text-amber-900 dark:text-amber-100">Step 2 - Upload payment proof</p>
              <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
                Pay {formatPaymentAmount(payment.currency, payment.amount)} using reference <strong>{reference}</strong>, then upload your receipt or screenshot.
              </p>
              <PaymentProofUpload
                className="mt-4 w-full sm:w-auto"
                paymentId={payment.id}
                onUploaded={onProofUploaded}
                showToast={showToast}
              />
            </div>
          )}

          {payment.proofStatus === "UPLOADED" || payment.proofStatus === "VERIFIED" ? (
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-900/40">
              <p className="font-semibold text-ink dark:text-white">Proof submitted</p>
              <p className="mt-1 text-slate-600 dark:text-slate-400">
                {payment.proofStatus === "VERIFIED"
                  ? "Finance verified your payment."
                  : "Waiting for HomeLink finance to verify your proof."}
              </p>
            </div>
          ) : null}
        </section>

        <AcademyPaymentDetails
          config={config}
          paymentMethod={payment.method}
          amount={payment.amount}
          currency={payment.currency || config?.currency || "USD"}
          extraInstructions={`Include reference ${reference} in your transfer narration.`}
          variant="proof"
        />
      </div>
    </div>
  );
}

function PaymentHistory({
  payments,
  currency,
  onSelect,
}: {
  payments: Payment[];
  currency: string;
  onSelect: (id: string) => void;
}) {
  if (payments.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center dark:border-slate-700">
        <History className="mx-auto size-8 text-slate-400" />
        <p className="mt-3 font-semibold text-ink dark:text-white">No payments yet</p>
        <p className="mt-1 text-sm text-slate-500">
          Listing fees, featured boosts, and subscriptions you pay through HomeLink appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/50">
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {payments.map((payment) => {
          const display = paymentStatusDisplay(payment);
          return (
            <div key={payment.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-ink dark:text-white">{planLabel(payment.plan)}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {formatPaymentAmount(payment.currency || currency, payment.amount)} /{" "}
                  {new Date(payment.createdAt).toLocaleDateString("en-ZW", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Ref {payment.referenceNumber ?? payment.id}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusPill tone={display.tone} label={display.label} />
                <Button variant="secondary" className="h-9" onClick={() => onSelect(payment.id)}>
                  View
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GuestPaymentsGate({ variant = "checkout" }: { variant?: "checkout" | "history" }) {
  const isHistory = variant === "history";
  return (
    <div className="gpu-card rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <Lock className="mx-auto size-10 text-emerald-700" />
      <h2 className="mt-4 text-xl font-bold text-ink dark:text-white">
        {isHistory ? "Sign in to view payment history" : "Sign in to pay for HomeLink services"}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-400">
        {isHistory
          ? "Your platform fee payments and proof status are linked to your HomeLink account."
          : "Listing boosts, subscriptions, and marketing payments require a HomeLink account so finance can issue your reference and track proof."}
      </p>
      <Link href="/auth?next=/payments" className="mt-6 inline-flex">
        <Button className="h-10 px-6">Sign in to continue</Button>
      </Link>
    </div>
  );
}

function PaymentTrustStrip() {
  const items = [
    {
      icon: ReceiptText,
      label: "Unique payment reference",
      body: "Every checkout creates a traceable HomeLink reference for finance review.",
    },
    {
      icon: Landmark,
      label: "Zimbabwe payment rails",
      body: "CBZ, ZIPIT, cash deposit, and online gateways when configured.",
    },
    {
      icon: ShieldCheck,
      label: "Activation after verification",
      body: "Services activate after payment or proof is confirmed by HomeLink.",
    },
  ];

  return (
    <div className="mb-6 grid gap-3 md:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="gpu-card rounded-lg border border-emerald-100 bg-white p-4 shadow-sm dark:border-emerald-900/40 dark:bg-slate-900">
          <p className="flex items-center gap-2 text-sm font-bold text-ink dark:text-white">
            <item.icon className="size-4 text-emerald-700 dark:text-emerald-300" />
            {item.label}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{item.body}</p>
        </div>
      ))}
    </div>
  );
}

function RelatedPaymentsInfo() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <InfoCard
        icon={Building2}
        title="Rent & deposit"
        body="First-month rent and deposits are paid on the property listing page - not here. That creates a verified tenancy record for landlords and tenants."
        href="/rent"
        linkLabel="Browse rentals"
      />
      <InfoCard
        icon={GraduationCap}
        title="Academy courses"
        body="Course registration and toolkit purchases use the Academy checkout with the same CBZ, ZIPIT, and proof workflow."
        href="/academy"
        linkLabel="Go to Academy"
      />
    </div>
  );
}

function TenancyNotice() {
  return (
    <div className="mb-6 rounded-xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-900/40 dark:bg-sky-950/20">
      <p className="font-semibold text-sky-900 dark:text-sky-100">Rent payments happen on the listing</p>
      <p className="mt-1 text-sm text-sky-800 dark:text-sky-200">
        To pay rent or a deposit, open the property on HomeLink and use the tenancy payment option there. This page is for listing fees, boosts, and subscriptions.
      </p>
      <Link href="/rent" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-sky-800 dark:text-sky-200">
        Find a rental <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}

function StatusBanner({ status, reference, payment }: { status: string; reference?: string; payment?: Payment }) {
  const display = payment ? paymentStatusDisplay(payment) : null;
  const tone = display?.tone ?? paymentStatusTone(status);
  const copy = display?.description ??
    (tone === "success"
      ? "Payment received. Finance will confirm and activate your service."
      : tone === "error"
        ? "Payment could not be completed. Try again or contact support@homelinkzim.co.zw."
        : "Payment created. Pay using the details below and upload your proof.");

  return (
    <div
      className={cn(
        "mb-6 rounded-xl border p-4",
        tone === "success" && "border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20",
        tone === "error" && "border-rose-200 bg-rose-50 dark:border-rose-900/40 dark:bg-rose-950/20",
        tone === "pending" && "border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20",
        tone === "neutral" && "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40",
      )}
    >
      <p className="flex items-center gap-2 font-semibold text-ink dark:text-white">
        {tone === "success" ? <CheckCircle2 className="size-5 text-emerald-600" /> : <Clock3 className="size-5 text-amber-600" />}
        {display?.label ?? status.replace(/_/g, " ")}
      </p>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{copy}</p>
      {display?.action && <p className="mt-2 text-sm font-medium text-ink dark:text-white">{display.action}</p>}
      {reference && (
        <p className="mt-2 text-sm font-medium text-ink dark:text-white">
          Reference: <span className="font-mono">{reference}</span>
        </p>
      )}
    </div>
  );
}

function InfoCard({
  icon: Icon,
  title,
  body,
  href,
  linkLabel,
}: {
  icon: typeof Building2;
  title: string;
  body: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/50">
      <p className="flex items-center gap-2 font-semibold text-ink dark:text-white">
        <Icon className="size-4 text-emerald-600" />
        {title}
      </p>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{body}</p>
      <Link href={href} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
        {linkLabel} <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition",
        active
          ? "bg-emerald-700 text-white shadow-sm"
          : "border border-slate-200 bg-white text-slate-700 hover:border-emerald-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200",
      )}
    >
      {children}
    </button>
  );
}

function MethodGroup({
  title,
  hint,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  hint: string;
  icon: typeof CreditCard;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="flex items-center gap-2 text-sm font-semibold text-ink dark:text-white">
        <Icon className="size-4 text-emerald-600" />
        {title}
      </p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
      <div className="mt-2 space-y-2">{children}</div>
    </div>
  );
}

function MethodOption({
  id,
  label,
  selected,
  onSelect,
}: {
  id: string;
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition",
        selected
          ? "border-emerald-600 bg-emerald-50 text-emerald-950 dark:border-emerald-500 dark:bg-emerald-950/30 dark:text-emerald-100"
          : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200",
      )}
    >
      <span>{label}</span>
      {selected && <Sparkles className="size-4 text-emerald-600" />}
      <span className="sr-only">{id}</span>
    </button>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/40">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className={cn("mt-1 font-semibold text-ink dark:text-white", highlight && "font-mono text-sm")}>{value}</p>
    </div>
  );
}

function StatusPill({ tone, label }: { tone: ReturnType<typeof paymentStatusTone>; label: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-semibold capitalize",
        tone === "success" && "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
        tone === "pending" && "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
        tone === "error" && "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
        tone === "neutral" && "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
      )}
    >
      {label}
    </span>
  );
}
