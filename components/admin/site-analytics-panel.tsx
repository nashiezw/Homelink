"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Activity,
  Check,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Eye,
  Filter,
  Mail,
  MapPin,
  MessageCircle,
  MousePointerClick,
  Phone,
  RefreshCw,
  Route,
  ShoppingBag,
  Target,
  UserRound,
} from "lucide-react";
import { apiFetch } from "@/lib/api/client";

type TopClassAnalytics = {
  board?: {
    todayRevenue?: number;
    todayOrders?: number;
    online?: number;
    openBags?: number;
    pendingProofs?: number;
    waClicks?: number;
    assistedRevenue?: number;
    refundTotal?: number;
  };
  pathFlows?: Array<{ from: string; to: string; value: number }>;
  retentionCohorts?: Array<{ cohort: string; size: number; d7: number; d30: number }>;
  margins?: Array<{ title: string; revenue: number; refunds: number; net: number }>;
  inventoryDemand?: Array<{ productId: string; title: string; views: number; adds: number; stock: number; status: string }>;
  experiments?: Array<{ experiment: string; variant: string; exposures: number; conversions: number; rate: number }>;
  intervene?: Array<{ reason: string; count: number; severity: "high" | "medium"; whatsappUrl: string }>;
  abandonRescue?: Array<{
    id: string;
    email: string;
    value: number;
    currency: string;
    idleHours: number;
    reminderCount: number;
    itemCount: number;
    items: string[];
    whatsappUrl?: string;
  }>;
  fraud?: Array<{ signal: string; detail: string; score: number }>;
  orderSlas?: Array<{ orderNumber: string; stage: string; hours: number; breached: boolean }>;
  identity?: Array<{ visitorId: string; userId: string; email: string; orders: number }>;
  ltvRfm?: Array<{ customerId: string; email: string; revenue: number; orders: number; recencyDays: number; segment: string }>;
  segments?: Array<{ id: string; name: string; description: string; count: number }>;
  attribution?: {
    firstTouch?: Array<{ label: string; value: number }>;
    lastTouch?: Array<{ label: string; value: number }>;
    linear?: Array<{ label: string; value: number }>;
    assistedRevenue?: number;
    assistedRate?: number;
  };
  campaigns?: Array<{ campaign: string; visitors: number; purchases: number; revenue: number }>;
  rageClicks?: number;
  uiErrors?: number;
  recentUiErrors?: Array<{ at: string; path: string; message: string; kind: string; visitorId: string }>;
  search?: {
    topQueries?: Array<{ label: string; value: number }>;
    zeroResults?: Array<{ label: string; value: number }>;
  };
  sampleFunnel?: Array<{ label: string; value: number }>;
  nps?: { avg?: number; count?: number };
  dataQuality?: {
    eventsLast24h?: number;
    pageViewsLast24h?: number;
    missingProductIdRate?: number;
    notes?: string[];
  };
  hourly?: Array<{ hour: number; views: number; events: number }>;
  anomalies?: Array<{ metric: string; current: number; baseline: number; severity: "info" | "warning" }>;
  piiAudit?: {
    fieldsStored?: string[];
    optOutSupported?: boolean;
    dntSupported?: boolean;
    macFingerprinting?: boolean;
  };
  goals?: Array<{ id: string; name: string; target: number; current: number; pct: number }>;
  compare?: {
    pageViewsLast24h?: number;
    pageViewsPrev7dDailyAvg?: number;
    eventsLast24h?: number;
    eventsPrev7dDailyAvg?: number;
  };
};

type AdvancedReport = {
  days: number;
  pageViews: number;
  uniqueVisitors: number;
  avgDurationSec: number;
  topPages: Array<{ label: string; value: number }>;
  devices: Array<{ label: string; value: number }>;
  referrers: Array<{ label: string; value: number }>;
  utmSources: Array<{ label: string; value: number }>;
  funnel: Array<{ label: string; value: number }>;
  funnelDropoff: Array<{ label: string; value: number; pctOfPrevious: number | null; pctOfFirst: number | null }>;
  whatsappSources: Array<{ label: string; value: number }>;
  channels: Array<{ label: string; value: number }>;
  proofSla: {
    pending: number;
    overdue: number;
    overduePct: number;
    medianWaitHours: number;
    stuck: Array<{ orderNumber: string; waitHours: number }>;
  };
  recentPaths: Array<{ path: string; minutes: number; deviceType: string; referrer: string; at: string }>;
  live: {
    online: number;
    libraryShoppers: number;
    onCheckout: number;
    openBags: number;
    bagValue: number;
    visitors: Array<{
      visitorId: string;
      path: string;
      title: string;
      deviceType: string;
      productTitle: string;
      cartItemCount: number;
      cartValue: number;
      cartCurrency: string;
      lastSeenAt: string;
      userId: string | null;
      identityLabel?: string;
      contactEmail?: string;
      contactPhone?: string;
      contactStatus?: string;
      currentPageLabel?: string;
      location?: string;
      source?: string;
      leadStatus?: { label: string; tone: string };
      journey?: Array<{ at: string; name: string; detail: string }>;
      debug?: { visitorId: string; sessionId: string; userId: string | null; rawPath: string };
    }>;
    alerts: string[];
  };
  products: Array<{
    productId: string;
    title: string;
    views: number;
    uniqueViewers: number;
    adds: number;
    removes: number;
    purchases: number;
    samples: number;
    addRate: number;
    purchaseRate: number;
    formats: Record<string, number>;
  }>;
  cartHeat: {
    mostAdded: Array<{ label: string; value: number }>;
    mostRemoved: Array<{ label: string; value: number }>;
  };
  cartActivity: Array<{
    at: string;
    name: string;
    title: string;
    visitorId: string;
    quantity: number;
    formatLabel: string;
    path: string;
  }>;
  journeys: Array<{
    sessionId: string;
    visitorId: string;
    userId: string | null;
    startedAt: string;
    endedAt?: string;
    durationMinutes?: number;
    steps: Array<{ at: string; name: string; detail: string }>;
    whatsappAssisted: boolean;
    purchased: boolean;
    deviceType?: string;
    source?: string;
    location?: string;
    landingPage?: string;
    currentPageLabel?: string;
    productTitle?: string;
    productPath?: string;
    identityLabel?: string;
    contactEmail?: string;
    contactPhone?: string;
    contactStatus?: string;
    leadStatus?: { label: string; tone: string };
    intentScore?: number;
    nextAction?: { label: string; detail: string; href?: string; kind: string };
    followUp?: { message: string; emailSubject: string; emailBody: string; whatsappHref?: string; mailtoHref?: string };
    summary?: string;
    filters?: string[];
    debug?: { visitorId: string; sessionId: string; userId: string | null; landingPath: string };
  }>;
  revenueByProduct: Array<{ label: string; value: number }>;
  revenueByFormat: Array<{ label: string; value: number }>;
  proofFunnel: Array<{ label: string; value: number }>;
  marketplace: Array<{ label: string; value: number }>;
  engagement: Array<{ label: string; value: number }>;
  cohorts: { newVisitors: number; returningVisitors: number; knownBuyersOnline: number };
  alerts: string[];
  topClass?: TopClassAnalytics;
};

type Journey = AdvancedReport["journeys"][number];
type JourneyStep = Journey["steps"][number];
type JourneyFilter = "all" | "high-intent" | "abandoned-checkout" | "exit-lead" | "sample-viewed" | "sample-downloaded" | "cart-activity" | "whatsapp" | "known-contact" | "anonymous";
type ProductConversionPlan = {
  productId: string;
  title: string;
  views: number;
  addRate: number;
  sampleRate: number;
  purchaseRate: number;
  diagnosis: string;
  action: string;
  journey: string[];
};

const journeyFilters: Array<{ id: JourneyFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "high-intent", label: "High intent" },
  { id: "abandoned-checkout", label: "Checkout abandoned" },
  { id: "exit-lead", label: "Exit lead" },
  { id: "sample-viewed", label: "Sample viewed" },
  { id: "sample-downloaded", label: "Sample downloaded" },
  { id: "cart-activity", label: "Cart activity" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "known-contact", label: "Known contact" },
  { id: "anonymous", label: "Anonymous" },
];

function formatStepName(name: string) {
  return name.replace(/^library_/, "").replaceAll("_", " ");
}

function describeJourneyStep(step: JourneyStep) {
  const name = journeyStepLabel(step.name);
  return step.detail ? `${name}: ${step.detail}` : name;
}

function journeyHeadline(journey: Journey) {
  return journey.leadStatus?.label || (journey.purchased ? "Order placed" : "Browsing session");
}

function journeyPreview(journey: Journey) {
  if (journey.summary) return journey.summary;
  return journey.steps
    .filter((step) => step.name !== "page_view" || step.detail)
    .slice(-3)
    .map(describeJourneyStep)
    .join(" -> ");
}

function journeyStepLabel(name: string) {
  if (name === "page_view") return "Viewed page";
  if (name === "library_product_viewed") return "Viewed product";
  if (name === "library_sample_opened") return "Opened sample";
  if (name === "library_sample_viewed") return "Viewed sample";
  if (name === "library_sample_downloaded") return "Downloaded sample";
  if (name === "library_exit_intent_shown") return "Exit help shown";
  if (name === "library_exit_intent_dismissed") return "Dismissed exit help";
  if (name === "library_exit_lead_captured") return "Exit details captured";
  if (name === "library_cart_added" || name === "library_bundle_added") return "Added to bag";
  if (name === "library_cart_removed") return "Removed from bag";
  if (name === "library_checkout_started") return "Started checkout";
  if (name === "library_purchase_completed") return "Placed order";
  if (name === "library_proof_uploaded") return "Uploaded proof";
  if (name === "whatsapp_click") return "Clicked WhatsApp";
  if (name === "experiment_exposure") return "Saw experiment";
  if (name === "library_scroll_depth") return "Scrolled product";
  return formatStepName(name);
}

function journeyStepIcon(name: string) {
  if (name === "page_view") return Eye;
  if (name === "library_cart_added" || name === "library_bundle_added" || name === "library_cart_removed") return ShoppingBag;
  if (name === "library_exit_lead_captured") return MessageCircle;
  if (name === "library_checkout_started" || name === "library_purchase_completed" || name === "library_proof_uploaded") return Target;
  if (name === "whatsapp_click") return MessageCircle;
  return MousePointerClick;
}

function journeyLeadClass(tone?: string) {
  if (tone === "hot") return "border-red-400/40 bg-red-500/10 text-red-100";
  if (tone === "warm") return "border-amber-400/40 bg-amber-500/10 text-amber-100";
  if (tone === "success") return "border-emerald-400/40 bg-emerald-500/10 text-emerald-100";
  if (tone === "info") return "border-sky-400/40 bg-sky-500/10 text-sky-100";
  return "border-white/10 bg-white/[0.04] text-slate-200";
}

type LiveVisitor = AdvancedReport["live"]["visitors"][number];

function leadStatusClass(tone?: string) {
  if (tone === "hot") return "border-red-400/40 bg-red-500/10 text-red-100";
  if (tone === "warm") return "border-amber-400/40 bg-amber-500/10 text-amber-100";
  if (tone === "success") return "border-emerald-400/40 bg-emerald-500/10 text-emerald-100";
  if (tone === "info") return "border-sky-400/40 bg-sky-500/10 text-sky-100";
  return "border-white/10 bg-white/[0.04] text-slate-200";
}

function shortTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function debugShort(value: string) {
  return value.length > 18 ? `${value.slice(0, 18)}...` : value;
}

function whatsappHref(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  return `https://wa.me/${digits}`;
}

type Tab =
  | "board"
  | "live"
  | "products"
  | "carts"
  | "journeys"
  | "revenue"
  | "overview"
  | "rescue"
  | "attribution"
  | "segments"
  | "quality"
  | "paths";

function BarList({ rows, color = "bg-emerald-500" }: { rows: Array<{ label: string; value: number }>; color?: string }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  if (!rows.length) return <p className="text-sm text-slate-400">No data in this period yet.</p>;
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={`${row.label}-${row.value}`}>
          <div className="mb-1 grid gap-1 text-xs text-slate-300 min-[460px]:flex min-[460px]:items-center min-[460px]:justify-between min-[460px]:gap-2">
            <span className="min-w-0 break-words font-medium">{row.label}</span>
            <span className="shrink-0 tabular-nums">{row.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(4, (row.value / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function pctChange(current: number, baseline: number) {
  if (!baseline) return baseline === 0 && current > 0 ? "+∞" : "—";
  const pct = Math.round(((current - baseline) / baseline) * 100);
  return pct >= 0 ? `+${pct}%` : `${pct}%`;
}

function productConversionDiagnosis(row: AdvancedReport["products"][number]): ProductConversionPlan | null {
  if (row.views < 10) return null;
  const sampleRate = row.views ? Math.round((row.samples / row.views) * 100) : 0;
  const purchaseRate = row.views ? Math.round((row.purchases / row.views) * 100) : 0;
  const lowAdds = row.addRate < 8;
  const lowSamples = sampleRate < 10;
  const checkoutFriction = row.adds >= 3 && row.purchases === 0;
  if (!lowAdds && !lowSamples && !checkoutFriction) return null;

  const diagnosis = checkoutFriction
    ? "People are interested enough to add it, but the decision is breaking around checkout, payment proof, or final confidence."
    : lowSamples
      ? "People are viewing the product but not sampling it enough, so they may not be seeing enough proof of value before deciding."
      : "People are reading the page but not feeling a strong enough reason to put it in the bag.";
  const action = checkoutFriction
    ? "Use live chat and WhatsApp follow-up around payment help, proof upload, and delivery reassurance. Make the checkout promise very clear."
    : lowSamples
      ? "Move the sample CTA higher, label exactly what is inside, and position it as 'Preview the pages before you buy'."
      : "Strengthen the above-the-fold offer: who it is for, what problem it solves, what they receive immediately, and why buying now is low-risk.";

  return {
    productId: row.productId,
    title: row.title,
    views: row.views,
    addRate: row.addRate,
    sampleRate,
    purchaseRate,
    diagnosis,
    action,
    journey: [
      "Visitor lands on the product and instantly sees who it is for.",
      "Page proves value with outcomes, sample pages, and what is included.",
      "Visitor chooses digital or print with clear delivery/payment expectations.",
      "Visitor adds to bag or starts checkout.",
      "If they hesitate, live chat sends a helpful product-specific nudge.",
    ],
  };
}

export function SiteAnalyticsPanel() {
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState<Tab>("board");
  const [report, setReport] = useState<AdvancedReport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedJourney, setSelectedJourney] = useState<string | null>(null);
  const [journeyFilter, setJourneyFilter] = useState<JourneyFilter>("all");
  const [copiedJourneyMessage, setCopiedJourneyMessage] = useState(false);
  const loadingRef = useRef(false);

  const tc = report?.topClass;
  const allJourneys = useMemo(() => report?.journeys ?? [], [report?.journeys]);
  const filteredJourneys = useMemo(
    () => allJourneys.filter((journey) => journeyFilter === "all" || journey.filters?.includes(journeyFilter)),
    [allJourneys, journeyFilter],
  );
  const selectedJourneyRow = filteredJourneys.find((row) => row.sessionId === selectedJourney) ?? filteredJourneys[0] ?? null;
  const journeyStats = useMemo(
    () => ({
      highIntent: allJourneys.filter((row) => row.filters?.includes("high-intent")).length,
      checkout: allJourneys.filter((row) => row.filters?.includes("abandoned-checkout")).length,
      known: allJourneys.filter((row) => row.filters?.includes("known-contact")).length,
      phone: allJourneys.filter((row) => row.contactPhone).length,
    }),
    [allJourneys],
  );
  const productConversionPlans = useMemo(
    () => (report?.products ?? []).map(productConversionDiagnosis).filter((row): row is ProductConversionPlan => Boolean(row)).slice(0, 6),
    [report?.products],
  );

  async function load() {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    const result = await apiFetch<AdvancedReport>(`/api/v1/admin/site-analytics?days=${days}`);
    loadingRef.current = false;
    setLoading(false);
    if (result.error || !result.data) {
      setError(result.error?.message || "Could not load advanced analytics.");
      return;
    }
    setError("");
    setReport(result.data);
  }

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible" && (tab === "live" || tab === "board")) void load();
    }, 300000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, tab]);

  useEffect(() => {
    if (!selectedJourneyRow) {
      setSelectedJourney(null);
      return;
    }
    if (selectedJourney !== selectedJourneyRow.sessionId) setSelectedJourney(selectedJourneyRow.sessionId);
  }, [selectedJourney, selectedJourneyRow]);

  async function copyJourneyMessage(journey: Journey) {
    const message = journey.followUp?.message;
    if (!message) return;
    await navigator.clipboard?.writeText(message).catch(() => null);
    setCopiedJourneyMessage(true);
    window.setTimeout(() => setCopiedJourneyMessage(false), 1800);
  }

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "board", label: "Board" },
    { id: "live", label: "Live now" },
    { id: "products", label: "Products" },
    { id: "carts", label: "Carts" },
    { id: "journeys", label: "Journeys" },
    { id: "revenue", label: "Revenue & proof" },
    { id: "overview", label: "Overview" },
    { id: "rescue", label: "Rescue" },
    { id: "attribution", label: "Attribution" },
    { id: "segments", label: "Segments" },
    { id: "quality", label: "Quality" },
    { id: "paths", label: "Paths" },
  ];

  return (
    <div className="grid min-w-0 max-w-full gap-4 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:gap-5 sm:p-5">
      <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Advanced site analytics</h3>
          <p className="mt-1 max-w-3xl text-xs text-slate-400">
            Live presence, product performance, cart add/remove, session journeys, revenue attribution, and proof SLA — first-party only.
          </p>
        </div>
        <div className="grid w-full grid-cols-1 gap-2 min-[420px]:grid-cols-3 xl:w-auto">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="h-9 min-w-0 rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-white"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex h-9 min-w-0 items-center justify-center gap-2 rounded-lg border border-white/10 px-3 text-sm font-semibold text-slate-200 hover:bg-white/5"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <a
            href={`/api/v1/admin/site-analytics/export?days=${days}`}
            className="inline-flex h-9 min-w-0 items-center justify-center gap-2 rounded-lg border border-white/10 px-3 text-sm font-semibold text-slate-200 hover:bg-white/5"
          >
            <Download className="size-4" />
            Export CSV
          </a>
        </div>
      </div>

      <div className="-mx-3 overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
        <div className="flex w-max gap-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${
              tab === item.id ? "bg-emerald-500/20 text-emerald-200" : "border border-white/10 text-slate-400 hover:bg-white/5"
            }`}
          >
            {item.label}
          </button>
        ))}
        </div>
      </div>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      {(report?.alerts?.length || report?.live.alerts?.length) ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100">
          <p className="font-semibold uppercase tracking-wide">Alerts</p>
          <ul className="mt-2 space-y-1">
            {[...(report?.live.alerts ?? []), ...(report?.alerts ?? [])].slice(0, 8).map((alert) => (
              <li key={alert}>• {alert}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {tab === "board" && (
        <div className="grid gap-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <BigMetric label="Today revenue" value={tc?.board?.todayRevenue != null ? `USD ${tc.board.todayRevenue.toFixed(2)}` : "—"} />
            <BigMetric label="Today orders" value={tc?.board?.todayOrders ?? "—"} />
            <BigMetric label="Online now" value={tc?.board?.online ?? report?.live.online ?? "—"} accent="text-emerald-300" />
            <BigMetric label="Open bags" value={tc?.board?.openBags ?? report?.live.openBags ?? "—"} />
            <BigMetric label="Pending proofs" value={tc?.board?.pendingProofs ?? report?.proofSla.pending ?? "—"} accent="text-amber-300" />
            <BigMetric label="WhatsApp clicks" value={tc?.board?.waClicks ?? "—"} accent="text-[#25D366]" />
            <BigMetric
              label="Assisted revenue"
              value={tc?.board?.assistedRevenue != null ? `USD ${tc.board.assistedRevenue.toFixed(2)}` : "—"}
            />
            <BigMetric label="Refunds total" value={tc?.board?.refundTotal != null ? `USD ${tc.board.refundTotal.toFixed(2)}` : "—"} accent="text-red-300" />
          </div>

          {(tc?.intervene?.length ?? 0) > 0 && (
            <Panel title="Intervene now">
              <div className="grid gap-2 sm:grid-cols-2">
                {tc!.intervene!.map((alert) => (
                  <div
                    key={alert.reason}
                    className={`rounded-xl border px-4 py-3 ${
                      alert.severity === "high" ? "border-red-500/40 bg-red-500/10" : "border-amber-500/40 bg-amber-500/10"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-white">{alert.reason}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          Count: {alert.count} · {alert.severity}
                        </p>
                      </div>
                      {alert.whatsappUrl ? (
                        <a
                          href={alert.whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#25D366]/40 bg-[#25D366]/10 px-2 py-1 text-xs font-semibold text-[#25D366] hover:bg-[#25D366]/20"
                        >
                          WhatsApp
                          <ExternalLink className="size-3" />
                        </a>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          <div className="grid gap-5 xl:grid-cols-2">
            <Panel title="Goals">
              {(tc?.goals ?? []).length ? (
                <div className="space-y-3">
                  {tc!.goals!.map((goal) => (
                    <div key={goal.id}>
                      <div className="mb-1 grid gap-1 text-xs min-[520px]:flex min-[520px]:items-center min-[520px]:justify-between min-[520px]:gap-2">
                        <span className="min-w-0 break-words font-medium text-slate-200">{goal.name}</span>
                        <span className="break-words tabular-nums text-slate-400 min-[520px]:shrink-0">
                          {goal.current} / {goal.target} ({goal.pct}%)
                        </span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${Math.min(100, goal.pct)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No goals configured yet.</p>
              )}
            </Panel>

            <Panel title="Anomalies">
              {(tc?.anomalies ?? []).length ? (
                <div className="space-y-2">
                  {tc!.anomalies!.map((row) => (
                    <div
                      key={row.metric}
                      className={`rounded-lg border px-3 py-2 text-xs ${
                        row.severity === "warning" ? "border-amber-500/30 bg-amber-500/10" : "border-sky-500/30 bg-sky-500/10"
                      }`}
                    >
                      <p className="font-semibold text-white">{row.metric.replaceAll("_", " ")}</p>
                      <p className="mt-1 text-slate-400">
                        Current {row.current} vs baseline {row.baseline} · {row.severity}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No anomalies detected.</p>
              )}
            </Panel>
          </div>

          <Panel title="24h vs 7-day daily average">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <CompareMetric
                label="Page views (24h)"
                current={tc?.compare?.pageViewsLast24h ?? 0}
                baseline={tc?.compare?.pageViewsPrev7dDailyAvg ?? 0}
              />
              <CompareMetric
                label="Events (24h)"
                current={tc?.compare?.eventsLast24h ?? 0}
                baseline={tc?.compare?.eventsPrev7dDailyAvg ?? 0}
              />
            </div>
          </Panel>
        </div>
      )}

      {tab === "live" && (
        <div className="grid gap-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Metric label="Online now" value={report?.live.online ?? "—"} />
            <Metric label="Library shoppers" value={report?.live.libraryShoppers ?? "—"} />
            <Metric label="On checkout" value={report?.live.onCheckout ?? "—"} />
            <Metric label="Open bags" value={report?.live.openBags ?? "—"} />
            <Metric label="Open bag value" value={report ? `USD ${report.live.bagValue.toFixed(2)}` : "—"} />
          </div>
          <Panel title="Live visitor journeys (last 5 minutes)">
            <div className="max-h-[34rem] space-y-3 overflow-y-auto text-xs text-slate-300">
              {(report?.live.visitors ?? []).length ? (
                report!.live.visitors.map((row: LiveVisitor) => (
                  <article key={`${row.visitorId}-${row.lastSeenAt}`} className="min-w-0 rounded-lg border border-white/10 bg-black/20 px-3 py-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${leadStatusClass(row.leadStatus?.tone)}`}>
                            {row.leadStatus?.label ?? "Browsing"}
                          </span>
                          <span className="text-[11px] uppercase tracking-wide text-slate-500">
                            {row.deviceType}
                            {row.userId ? " · signed in" : " · guest"}
                          </span>
                        </div>
                        <h4 className="mt-2 break-words text-sm font-semibold text-white">{row.identityLabel || "Guest visitor"}</h4>
                        <p className="mt-1 break-words text-slate-300">{row.currentPageLabel || row.title || row.path}</p>
                      </div>
                      <div className="grid gap-1 text-left text-slate-500 lg:text-right">
                        <span>Last seen {shortTime(row.lastSeenAt)}</span>
                        <span>Bag: {row.cartItemCount} · {row.cartCurrency} {row.cartValue.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2 md:grid-cols-3">
                      <LiveFact icon={<UserRound className="size-3.5" />} label="Contact" value={row.contactStatus || "Anonymous"} />
                      <LiveFact icon={<MapPin className="size-3.5" />} label="Location" value={row.location || "Location unavailable"} />
                      <LiveFact label="Source" value={row.source || "Direct / unknown"} />
                    </div>

                    {(row.contactEmail || row.contactPhone) && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {row.contactPhone ? (
                          <a
                            href={whatsappHref(row.contactPhone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#25D366]/40 bg-[#25D366]/10 px-2 py-1 text-xs font-semibold text-[#25D366] hover:bg-[#25D366]/20"
                          >
                            <Phone className="size-3.5" />
                            WhatsApp
                          </a>
                        ) : null}
                        {row.contactEmail ? (
                          <a
                            href={`mailto:${row.contactEmail}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2 py-1 text-xs font-semibold text-slate-200 hover:bg-white/5"
                          >
                            <Mail className="size-3.5" />
                            Email
                          </a>
                        ) : null}
                      </div>
                    )}

                    <div className="mt-3 border-t border-white/10 pt-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Recent journey</p>
                      {(row.journey ?? []).length ? (
                        <ol className="mt-2 grid gap-2">
                          {row.journey!.map((step, index) => (
                            <li key={`${step.at}-${step.name}-${index}`} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-2">
                              <span className="tabular-nums text-slate-500">{shortTime(step.at)}</span>
                              <span className="min-w-0 break-words">
                                <span className="font-semibold text-slate-100">{step.name}</span>
                                {step.detail ? <span className="text-slate-400"> · {step.detail}</span> : null}
                              </span>
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p className="mt-2 text-slate-500">Waiting for more journey activity.</p>
                      )}
                    </div>

                    <details className="mt-3 border-t border-white/10 pt-3">
                      <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-wide text-slate-500 hover:text-slate-300">
                        Debug details
                      </summary>
                      <dl className="mt-2 grid gap-1 text-[11px] text-slate-500">
                        <div className="min-w-0 break-all">Visitor: {debugShort(row.debug?.visitorId ?? row.visitorId)}</div>
                        <div className="min-w-0 break-all">Session: {debugShort(row.debug?.sessionId ?? "")}</div>
                        <div className="min-w-0 break-all">Path: {row.debug?.rawPath ?? row.path}</div>
                      </dl>
                    </details>
                  </article>
                ))
              ) : (
                <p className="text-slate-400">No live visitors in the last 5 minutes.</p>
              )}
            </div>
          </Panel>
        </div>
      )}

      {tab === "products" && (
        <div className="grid gap-5">
          <Panel
            title="Conversion journey"
            icon={Target}
            action={<span className="text-xs text-slate-500">{productConversionPlans.length ? "Needs attention" : "Healthy"}</span>}
          >
            {productConversionPlans.length ? (
              <div className="grid gap-3 xl:grid-cols-2">
                {productConversionPlans.map((row) => (
                  <article key={`conversion-${row.productId}`} className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="break-words font-semibold text-white">{row.title}</p>
                        <p className="mt-1 text-xs text-amber-100/80">
                          {row.views} views · {row.addRate}% add-to-bag · {row.sampleRate}% sample · {row.purchaseRate}% purchase
                        </p>
                      </div>
                      <span className="w-fit shrink-0 rounded-full border border-amber-300/30 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-100">
                        Rescue
                      </span>
                    </div>
                    <p className="mt-3 leading-6 text-slate-200">{row.diagnosis}</p>
                    <p className="mt-2 font-semibold leading-6 text-amber-100">{row.action}</p>
                    <ol className="mt-3 grid gap-1.5 border-t border-white/10 pt-3 text-xs leading-5 text-slate-300">
                      {row.journey.map((step, index) => (
                        <li key={`${row.productId}-step-${index}`} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-2">
                          <span className="text-amber-200">{index + 1}</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No high-view product conversion gaps detected in this period.</p>
            )}
          </Panel>

          <div className="grid gap-3 md:hidden">
            {(report?.products ?? []).length ? (
              report!.products.map((row) => (
                <MobileRecord key={row.productId} title={row.title}>
                  <MobileFacts
                    rows={[
                      ["Views", row.views],
                      ["Uniques", row.uniqueViewers],
                      ["Adds", row.adds],
                      ["Removes", row.removes],
                      ["Purchases", row.purchases],
                      ["Add rate", `${row.addRate}%`],
                      ["Buy rate", `${row.purchaseRate}%`],
                      ["Samples", row.samples],
                    ]}
                  />
                </MobileRecord>
              ))
            ) : (
              <p className="text-sm text-slate-400">Product views and cart events will appear as shoppers browse Library titles.</p>
            )}
          </div>
        </div>
      )}

      {tab === "products" && (
        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full text-left text-xs text-slate-300">
            <thead className="border-b border-white/10 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2 pr-3">Product</th>
                <th className="py-2 pr-3">Views</th>
                <th className="py-2 pr-3">Uniques</th>
                <th className="py-2 pr-3">Adds</th>
                <th className="py-2 pr-3">Removes</th>
                <th className="py-2 pr-3">Purchases</th>
                <th className="py-2 pr-3">Add %</th>
                <th className="py-2 pr-3">Buy %</th>
                <th className="py-2">Samples</th>
              </tr>
            </thead>
            <tbody>
              {(report?.products ?? []).length ? (
                report!.products.map((row) => (
                  <tr key={row.productId} className="border-b border-white/5">
                    <td className="max-w-[16rem] truncate py-2 pr-3 font-semibold text-white" title={row.title}>
                      {row.title}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">{row.views}</td>
                    <td className="py-2 pr-3 tabular-nums">{row.uniqueViewers}</td>
                    <td className="py-2 pr-3 tabular-nums text-emerald-300">{row.adds}</td>
                    <td className="py-2 pr-3 tabular-nums text-amber-300">{row.removes}</td>
                    <td className="py-2 pr-3 tabular-nums">{row.purchases}</td>
                    <td className="py-2 pr-3 tabular-nums">{row.addRate}%</td>
                    <td className="py-2 pr-3 tabular-nums">{row.purchaseRate}%</td>
                    <td className="py-2 tabular-nums">{row.samples}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-4 text-slate-400">
                    Product views and cart events will appear as shoppers browse Library titles.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "carts" && (
        <div className="grid gap-5 xl:grid-cols-2">
          <Panel title="Most added">
            <BarList rows={report?.cartHeat.mostAdded ?? []} />
          </Panel>
          <Panel title="Most removed">
            <BarList rows={report?.cartHeat.mostRemoved ?? []} color="bg-amber-500" />
          </Panel>
          <Panel title="Recent cart activity">
            <div className="max-h-80 space-y-2 overflow-y-auto text-xs">
              {(report?.cartActivity ?? []).length ? (
                report!.cartActivity.map((row, index) => (
                  <div key={`${row.at}-${row.title}-${index}`} className="min-w-0 rounded-lg border border-white/10 px-3 py-2 text-slate-300">
                    <p className="break-words font-semibold text-white">
                      {row.name.replace(/^library_/, "").replaceAll("_", " ")} · {row.title}
                    </p>
                    <p className="mt-1 break-words text-slate-500">
                      qty {row.quantity} · {row.formatLabel} · {new Date(row.at).toLocaleString()}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-slate-400">No cart activity yet.</p>
              )}
            </div>
          </Panel>
          <Panel title="Live open bags">
            <div className="max-h-80 space-y-2 overflow-y-auto text-xs">
              {(report?.live.visitors ?? [])
                .filter((row) => row.cartItemCount > 0)
                .map((row) => (
                  <div key={`bag-${row.visitorId}`} className="min-w-0 rounded-lg border border-white/10 px-3 py-2 text-slate-300">
                    <p className="break-words font-semibold text-white">
                      {row.cartItemCount} items · {row.cartCurrency} {row.cartValue.toFixed(2)}
                    </p>
                    <p className="mt-1 break-all text-slate-500">{row.path}</p>
                  </div>
                ))}
              {!report?.live.visitors.some((row) => row.cartItemCount > 0) ? (
                <p className="text-slate-400">No open bags online right now.</p>
              ) : null}
            </div>
          </Panel>
        </div>
      )}

      {tab === "journeys" && (
        <div className="grid gap-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="High-intent journeys" value={journeyStats.highIntent} accent="text-red-300" />
            <Metric label="Checkout follow-ups" value={journeyStats.checkout} accent="text-amber-300" />
            <Metric label="Known contacts" value={journeyStats.known} />
            <Metric label="Phone captured" value={journeyStats.phone} />
          </div>

          <Panel
            title="Journey filters"
            icon={Filter}
            action={<span className="text-xs text-slate-500">{filteredJourneys.length} of {allJourneys.length}</span>}
          >
            <div className="flex flex-wrap gap-2">
              {journeyFilters.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setJourneyFilter(filter.id)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                    journeyFilter === filter.id
                      ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100"
                      : "border-white/10 text-slate-300 hover:bg-white/5"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </Panel>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
            <Panel title="Visitor journeys" icon={Route}>
              <div className="max-h-[34rem] space-y-3 overflow-y-auto pr-1 text-xs">
                {filteredJourneys.map((journey) => (
                  <button
                    key={journey.sessionId}
                    type="button"
                    onClick={() => {
                      setSelectedJourney(journey.sessionId);
                      setCopiedJourneyMessage(false);
                    }}
                    className={`block w-full rounded-xl border p-3 text-left transition ${
                      selectedJourneyRow?.sessionId === journey.sessionId ? "border-emerald-400/50 bg-emerald-500/10" : "border-white/10 hover:bg-white/5"
                    }`}
                  >
                    <div className="flex flex-col gap-2 min-[520px]:flex-row min-[520px]:items-start min-[520px]:justify-between">
                      <div className="min-w-0">
                        <p className="break-words font-semibold text-white">{journey.identityLabel || "Guest visitor"}</p>
                        <p className="mt-1 break-words text-slate-400">{journeyPreview(journey) || journeyHeadline(journey)}</p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${journeyLeadClass(journey.leadStatus?.tone)}`}>
                        {journey.leadStatus?.label || journeyHeadline(journey)}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 text-slate-400 min-[520px]:grid-cols-2">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <MapPin className="size-3.5 shrink-0" />
                        <span className="truncate">{journey.location || "Location unavailable"}</span>
                      </span>
                      <span className="flex min-w-0 items-center gap-1.5">
                        <ExternalLink className="size-3.5 shrink-0" />
                        <span className="truncate">{journey.source || "Direct / unknown"}</span>
                      </span>
                      <span className="flex min-w-0 items-center gap-1.5">
                        <Clock className="size-3.5 shrink-0" />
                        <span className="truncate">{shortTime(journey.endedAt || journey.startedAt)} · {journey.durationMinutes ?? 0} min</span>
                      </span>
                      <span className="flex min-w-0 items-center gap-1.5">
                        <Target className="size-3.5 shrink-0" />
                        <span className="truncate">Intent {journey.intentScore ?? 0}/100</span>
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] text-slate-500">{journey.contactStatus || "Anonymous"}</p>
                  </button>
                ))}
                {!filteredJourneys.length ? (
                  <p className="text-slate-400">No journeys match this filter yet.</p>
                ) : null}
              </div>
            </Panel>

            <Panel title="Selected journey" icon={Activity}>
              {selectedJourneyRow ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white">{selectedJourneyRow.identityLabel || "Guest visitor"}</p>
                        <p className="mt-2 break-words text-sm leading-6 text-slate-300">{selectedJourneyRow.summary || journeyPreview(selectedJourneyRow)}</p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide ${journeyLeadClass(selectedJourneyRow.leadStatus?.tone)}`}>
                        {selectedJourneyRow.leadStatus?.label || "Browsing"}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-2 text-xs text-slate-400 sm:grid-cols-2 xl:grid-cols-3">
                      <JourneyFact icon={UserRound} label="Visitor" value={selectedJourneyRow.userId ? "Registered user" : "Guest / anonymous"} />
                      <JourneyFact icon={Phone} label="Phone" value={selectedJourneyRow.contactPhone || "Not captured"} />
                      <JourneyFact icon={Mail} label="Email" value={selectedJourneyRow.contactEmail || "Not captured"} />
                      <JourneyFact icon={MapPin} label="Location" value={selectedJourneyRow.location || "Unavailable"} />
                      <JourneyFact icon={ExternalLink} label="Source" value={selectedJourneyRow.source || "Direct / unknown"} />
                      <JourneyFact icon={Eye} label="Current page" value={selectedJourneyRow.currentPageLabel || selectedJourneyRow.landingPage || "Unknown"} />
                    </div>
                  </div>

                  {selectedJourneyRow.nextAction ? (
                    <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-xs font-bold uppercase tracking-wide text-emerald-200">Next best action</p>
                          <p className="mt-1 font-semibold text-white">{selectedJourneyRow.nextAction.label}</p>
                          <p className="mt-1 text-sm leading-6 text-slate-300">{selectedJourneyRow.nextAction.detail}</p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          {selectedJourneyRow.followUp?.whatsappHref ? (
                            <a
                              href={selectedJourneyRow.followUp.whatsappHref}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-400"
                            >
                              <MessageCircle className="size-4" />
                              WhatsApp
                            </a>
                          ) : null}
                          {selectedJourneyRow.followUp?.mailtoHref ? (
                            <a
                              href={selectedJourneyRow.followUp.mailtoHref}
                              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-100 hover:bg-white/5"
                            >
                              <Mail className="size-4" />
                              Email
                            </a>
                          ) : null}
                          {selectedJourneyRow.followUp?.message ? (
                            <button
                              type="button"
                              onClick={() => void copyJourneyMessage(selectedJourneyRow)}
                              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-100 hover:bg-white/5"
                            >
                              {copiedJourneyMessage ? <Check className="size-4 text-emerald-300" /> : <Copy className="size-4" />}
                              {copiedJourneyMessage ? "Copied" : "Copy message"}
                            </button>
                          ) : null}
                        </div>
                      </div>
                      {selectedJourneyRow.followUp?.message ? (
                        <div className="mt-4 rounded-lg border border-white/10 bg-slate-950/60 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Prepared follow-up message</p>
                          <p className="mt-2 whitespace-pre-line text-xs leading-6 text-slate-300">{selectedJourneyRow.followUp.message}</p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1 text-xs text-slate-300">
                    {selectedJourneyRow.steps.map((step, index) => {
                      const Icon = journeyStepIcon(step.name);
                      return (
                        <div key={`${step.at}-${index}`} className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-3">
                          <div className="flex flex-col items-center">
                            <span className="grid size-7 place-items-center rounded-full border border-white/10 bg-slate-950 text-emerald-200">
                              <Icon className="size-3.5" />
                            </span>
                            {index < selectedJourneyRow.steps.length - 1 ? <span className="mt-2 h-full min-h-5 w-px bg-white/10" /> : null}
                          </div>
                          <div className="min-w-0 rounded-lg border border-white/10 px-3 py-2">
                            <div className="flex flex-col gap-1 min-[520px]:flex-row min-[520px]:items-center min-[520px]:justify-between">
                              <p className="font-semibold text-white">{journeyStepLabel(step.name)}</p>
                              <span className="text-[11px] text-slate-500">{new Date(step.at).toLocaleString()}</span>
                            </div>
                            <p className="mt-1 break-words text-slate-400">{step.detail || "-"}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400">Select a journey.</p>
              )}
            </Panel>
          </div>
        </div>
      )}

      {tab === "revenue" && (
        <div className="grid gap-5 xl:grid-cols-2">
          <Panel title="Revenue by product">
            <BarList rows={report?.revenueByProduct ?? []} />
          </Panel>
          <Panel title="Revenue by format">
            <BarList rows={report?.revenueByFormat ?? []} color="bg-cyan-500" />
          </Panel>
          <Panel title="Proof funnel">
            <BarList rows={report?.proofFunnel ?? []} color="bg-amber-500" />
          </Panel>
          <Panel title="Marketplace engagement">
            <BarList rows={report?.marketplace ?? []} color="bg-violet-500" />
          </Panel>
          <div className="grid gap-3 sm:grid-cols-2 xl:col-span-2 xl:grid-cols-4">
            <Metric label="Proofs pending" value={report?.proofSla.pending ?? "—"} />
            <Metric label="Overdue 24h+" value={report?.proofSla.overdue ?? "—"} />
            <Metric label="Median wait (h)" value={report?.proofSla.medianWaitHours ?? "—"} />
            <Metric label="Known buyers online" value={report?.cohorts.knownBuyersOnline ?? "—"} />
          </div>
        </div>
      )}

      {tab === "overview" && (
        <div className="grid gap-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Page views" value={report?.pageViews ?? "—"} />
            <Metric label="Unique visitors" value={report?.uniqueVisitors ?? "—"} />
            <Metric label="Avg time / page" value={report ? `${report.avgDurationSec}s` : "—"} />
            <Metric label="New / returning" value={report ? `${report.cohorts.newVisitors} / ${report.cohorts.returningVisitors}` : "—"} />
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            <Panel title="Library funnel drop-off">
              {(report?.funnelDropoff ?? []).length ? (
                <div className="space-y-2">
                  {report!.funnelDropoff.map((row) => (
                    <div key={row.label} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300">
                      <div className="grid gap-1 min-[460px]:flex min-[460px]:items-center min-[460px]:justify-between min-[460px]:gap-2">
                        <span className="break-words font-semibold text-white">{row.label}</span>
                        <span className="shrink-0 tabular-nums">{row.value}</span>
                      </div>
                      <p className="mt-1 text-slate-500">
                        {row.pctOfPrevious != null ? `${row.pctOfPrevious}% of previous · ` : ""}
                        {row.pctOfFirst != null ? `${row.pctOfFirst}% of first step` : "—"}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No funnel data yet.</p>
              )}
            </Panel>
            <Panel title="WhatsApp sources">
              <BarList rows={report?.whatsappSources ?? []} color="bg-[#25D366]" />
            </Panel>
            <Panel title="Engagement depth">
              <BarList rows={report?.engagement ?? []} color="bg-sky-500" />
            </Panel>
            <Panel title="Top pages">
              <BarList rows={report?.topPages ?? []} />
            </Panel>
            <Panel title="Devices">
              <BarList rows={report?.devices ?? []} color="bg-violet-500" />
            </Panel>
            <Panel title="UTM sources">
              <BarList rows={report?.utmSources ?? []} color="bg-rose-500" />
            </Panel>
          </div>
        </div>
      )}

      {tab === "rescue" && (
        <div className="grid gap-5">
          <Panel title="Abandoned cart rescue queue">
            <div className="grid gap-3 md:hidden">
              {(tc?.abandonRescue ?? []).length ? (
                tc!.abandonRescue!.map((row) => (
                  <MobileRecord key={row.id} title={row.email || "Unknown customer"}>
                    <MobileFacts
                      rows={[
                        ["Value", `${row.currency} ${row.value.toFixed(2)}`],
                        ["Idle", `${row.idleHours}h`],
                        ["Reminders", row.reminderCount],
                        ["Items", row.itemCount],
                      ]}
                    />
                    <p className="mt-3 break-words text-xs text-slate-400">{row.items.length ? row.items.join(", ") : "No products listed"}</p>
                    {row.whatsappUrl ? (
                      <a
                        href={row.whatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#25D366] hover:underline"
                      >
                        WhatsApp <ExternalLink className="size-3" />
                      </a>
                    ) : null}
                  </MobileRecord>
                ))
              ) : (
                <p className="text-sm text-slate-400">No abandoned carts in the rescue queue.</p>
              )}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-left text-xs text-slate-300">
                <thead className="border-b border-white/10 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2 pr-3">Email</th>
                    <th className="py-2 pr-3">Value</th>
                    <th className="py-2 pr-3">Idle (h)</th>
                    <th className="py-2 pr-3">Reminders</th>
                    <th className="py-2 pr-3">Items</th>
                    <th className="py-2 pr-3">Products</th>
                    <th className="py-2">Rescue</th>
                  </tr>
                </thead>
                <tbody>
                  {(tc?.abandonRescue ?? []).length ? (
                    tc!.abandonRescue!.map((row) => (
                      <tr key={row.id} className="border-b border-white/5">
                        <td className="py-2 pr-3 font-medium text-white">{row.email || "—"}</td>
                        <td className="py-2 pr-3 tabular-nums">
                          {row.currency} {row.value.toFixed(2)}
                        </td>
                        <td className="py-2 pr-3 tabular-nums text-amber-300">{row.idleHours}</td>
                        <td className="py-2 pr-3 tabular-nums">{row.reminderCount}</td>
                        <td className="py-2 pr-3 tabular-nums">{row.itemCount}</td>
                        <td className="max-w-[14rem] truncate py-2 pr-3 text-slate-400" title={row.items.join(", ")}>
                          {row.items.length ? row.items.join(", ") : "—"}
                        </td>
                        <td className="py-2">
                          {row.whatsappUrl ? (
                            <a
                              href={row.whatsappUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 font-semibold text-[#25D366] hover:underline"
                            >
                              WhatsApp <ExternalLink className="size-3" />
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-4 text-slate-400">
                        No abandoned carts in the rescue queue.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>

          <div className="grid gap-5 xl:grid-cols-2">
            <Panel title="Order SLAs">
              <div className="grid max-h-80 gap-3 overflow-y-auto md:hidden">
                {(tc?.orderSlas ?? []).length ? (
                  tc!.orderSlas!.map((row) => (
                    <MobileRecord key={row.orderNumber} title={row.orderNumber}>
                      <MobileFacts
                        rows={[
                          ["Stage", row.stage.replaceAll("_", " ")],
                          ["Hours", row.hours],
                          ["SLA", row.breached ? "Breached" : "OK"],
                        ]}
                      />
                    </MobileRecord>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">No open order SLAs.</p>
                )}
              </div>
              <div className="hidden max-h-80 overflow-y-auto md:block">
                <table className="min-w-full text-left text-xs text-slate-300">
                  <thead className="border-b border-white/10 text-[11px] uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="py-2 pr-3">Order</th>
                      <th className="py-2 pr-3">Stage</th>
                      <th className="py-2 pr-3">Hours</th>
                      <th className="py-2">SLA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(tc?.orderSlas ?? []).length ? (
                      tc!.orderSlas!.map((row) => (
                        <tr
                          key={row.orderNumber}
                          className={`border-b border-white/5 ${row.breached ? "bg-red-500/10" : ""}`}
                        >
                          <td className="py-2 pr-3 font-medium text-white">{row.orderNumber}</td>
                          <td className="py-2 pr-3">{row.stage.replaceAll("_", " ")}</td>
                          <td className="py-2 pr-3 tabular-nums">{row.hours}</td>
                          <td className={`py-2 font-semibold ${row.breached ? "text-red-300" : "text-emerald-300"}`}>
                            {row.breached ? "Breached" : "OK"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-4 text-slate-400">
                          No open order SLAs.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>

            <Panel title="Fraud signals">
              {(tc?.fraud ?? []).length ? (
                <div className="max-h-80 space-y-2 overflow-y-auto">
                  {tc!.fraud!.map((row) => (
                    <div key={`${row.signal}-${row.detail}`} className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs">
                      <div className="grid gap-1 min-[460px]:flex min-[460px]:items-center min-[460px]:justify-between min-[460px]:gap-2">
                        <p className="break-words font-semibold text-white">{row.signal.replaceAll("_", " ")}</p>
                        <span className="shrink-0 tabular-nums text-red-300">score {row.score}</span>
                      </div>
                      <p className="mt-1 break-words text-slate-400">{row.detail}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No fraud signals detected.</p>
              )}
            </Panel>
          </div>
        </div>
      )}

      {tab === "attribution" && (
        <div className="grid gap-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Metric
              label="Assisted revenue"
              value={tc?.attribution?.assistedRevenue != null ? `USD ${tc.attribution.assistedRevenue.toFixed(2)}` : "—"}
            />
            <Metric label="Assisted rate" value={tc?.attribution?.assistedRate != null ? `${tc.attribution.assistedRate}%` : "—"} />
          </div>
          <div className="grid gap-5 xl:grid-cols-3">
            <Panel title="First touch">
              <BarList rows={tc?.attribution?.firstTouch ?? []} color="bg-cyan-500" />
            </Panel>
            <Panel title="Last touch">
              <BarList rows={tc?.attribution?.lastTouch ?? []} color="bg-violet-500" />
            </Panel>
            <Panel title="Linear">
              <BarList rows={tc?.attribution?.linear ?? []} color="bg-rose-500" />
            </Panel>
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            <Panel title="Campaigns">
              <div className="grid gap-3 md:hidden">
                {(tc?.campaigns ?? []).length ? (
                  tc!.campaigns!.map((row) => (
                    <MobileRecord key={row.campaign} title={row.campaign}>
                      <MobileFacts
                        rows={[
                          ["Visitors", row.visitors],
                          ["Purchases", row.purchases],
                          ["Revenue", `USD ${row.revenue.toFixed(2)}`],
                        ]}
                      />
                    </MobileRecord>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">No campaign attribution data yet.</p>
                )}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full text-left text-xs text-slate-300">
                  <thead className="border-b border-white/10 text-[11px] uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="py-2 pr-3">Campaign</th>
                      <th className="py-2 pr-3">Visitors</th>
                      <th className="py-2 pr-3">Purchases</th>
                      <th className="py-2">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(tc?.campaigns ?? []).length ? (
                      tc!.campaigns!.map((row) => (
                        <tr key={row.campaign} className="border-b border-white/5">
                          <td className="py-2 pr-3 font-medium text-white">{row.campaign}</td>
                          <td className="py-2 pr-3 tabular-nums">{row.visitors}</td>
                          <td className="py-2 pr-3 tabular-nums">{row.purchases}</td>
                          <td className="py-2 tabular-nums">USD {row.revenue.toFixed(2)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-4 text-slate-400">
                          No campaign attribution data yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>
            <Panel title="Identity stitch">
              <div className="grid max-h-80 gap-3 overflow-y-auto md:hidden">
                {(tc?.identity ?? []).length ? (
                  tc!.identity!.map((row) => (
                    <MobileRecord key={row.visitorId} title={row.email || "Known visitor"}>
                      <MobileFacts
                        rows={[
                          ["Visitor", `${row.visitorId.slice(0, 12)}...`],
                          ["User", `${row.userId.slice(0, 12)}...`],
                          ["Orders", row.orders],
                        ]}
                      />
                    </MobileRecord>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">No identity stitches recorded yet.</p>
                )}
              </div>
              <div className="hidden max-h-80 overflow-y-auto md:block">
                <table className="min-w-full text-left text-xs text-slate-300">
                  <thead className="border-b border-white/10 text-[11px] uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="py-2 pr-3">Visitor</th>
                      <th className="py-2 pr-3">User</th>
                      <th className="py-2 pr-3">Email</th>
                      <th className="py-2">Orders</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(tc?.identity ?? []).length ? (
                      tc!.identity!.map((row) => (
                        <tr key={row.visitorId} className="border-b border-white/5">
                          <td className="py-2 pr-3 font-mono text-[10px] text-slate-400">{row.visitorId.slice(0, 12)}…</td>
                          <td className="py-2 pr-3 font-mono text-[10px] text-slate-400">{row.userId.slice(0, 12)}…</td>
                          <td className="py-2 pr-3">{row.email || "—"}</td>
                          <td className="py-2 tabular-nums">{row.orders}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-4 text-slate-400">
                          No identity stitches recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        </div>
      )}

      {tab === "segments" && (
        <div className="grid gap-5">
          <Panel title="Audience segments">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {(tc?.segments ?? []).length ? (
                tc!.segments!.map((seg) => (
                  <div key={seg.id} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                    <p className="text-2xl font-bold tabular-nums text-emerald-300">{seg.count}</p>
                    <p className="mt-1 text-sm font-semibold text-white">{seg.name}</p>
                    <p className="mt-1 text-xs text-slate-400">{seg.description}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">No segments computed yet.</p>
              )}
            </div>
          </Panel>

          <Panel title="LTV / RFM">
            <div className="grid gap-3 md:hidden">
              {(tc?.ltvRfm ?? []).length ? (
                tc!.ltvRfm!.map((row) => (
                  <MobileRecord key={row.customerId} title={row.email || row.customerId.slice(0, 10)}>
                    <MobileFacts
                      rows={[
                        ["Revenue", `USD ${row.revenue.toFixed(2)}`],
                        ["Orders", row.orders],
                        ["Recency", `${row.recencyDays}d`],
                        ["Segment", row.segment.replaceAll("_", " ")],
                      ]}
                    />
                  </MobileRecord>
                ))
              ) : (
                <p className="text-sm text-slate-400">No customer RFM data yet.</p>
              )}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-left text-xs text-slate-300">
                <thead className="border-b border-white/10 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2 pr-3">Email</th>
                    <th className="py-2 pr-3">Revenue</th>
                    <th className="py-2 pr-3">Orders</th>
                    <th className="py-2 pr-3">Recency (d)</th>
                    <th className="py-2">Segment</th>
                  </tr>
                </thead>
                <tbody>
                  {(tc?.ltvRfm ?? []).length ? (
                    tc!.ltvRfm!.map((row) => (
                      <tr key={row.customerId} className="border-b border-white/5">
                        <td className="py-2 pr-3 font-medium text-white">{row.email || row.customerId.slice(0, 10)}</td>
                        <td className="py-2 pr-3 tabular-nums">USD {row.revenue.toFixed(2)}</td>
                        <td className="py-2 pr-3 tabular-nums">{row.orders}</td>
                        <td className="py-2 pr-3 tabular-nums">{row.recencyDays}</td>
                        <td className="py-2">
                          <SegmentBadge segment={row.segment} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-4 text-slate-400">
                        No customer RFM data yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>

          <div className="grid gap-5 xl:grid-cols-2">
            <Panel title="Retention cohorts">
              <div className="grid gap-3 md:hidden">
                {(tc?.retentionCohorts ?? []).length ? (
                  tc!.retentionCohorts!.map((row) => (
                    <MobileRecord key={row.cohort} title={row.cohort}>
                      <MobileFacts
                        rows={[
                          ["Size", row.size],
                          ["D7", `${row.d7}%`],
                          ["D30", `${row.d30}%`],
                        ]}
                      />
                    </MobileRecord>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">No retention cohorts yet.</p>
                )}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full text-left text-xs text-slate-300">
                  <thead className="border-b border-white/10 text-[11px] uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="py-2 pr-3">Cohort week</th>
                      <th className="py-2 pr-3">Size</th>
                      <th className="py-2 pr-3">D7 %</th>
                      <th className="py-2">D30 %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(tc?.retentionCohorts ?? []).length ? (
                      tc!.retentionCohorts!.map((row) => (
                        <tr key={row.cohort} className="border-b border-white/5">
                          <td className="py-2 pr-3 font-medium text-white">{row.cohort}</td>
                          <td className="py-2 pr-3 tabular-nums">{row.size}</td>
                          <td className="py-2 pr-3 tabular-nums text-emerald-300">{row.d7}%</td>
                          <td className="py-2 tabular-nums text-cyan-300">{row.d30}%</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-4 text-slate-400">
                          No retention cohorts yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>

            <Panel title="Experiments">
              <div className="grid gap-3 md:hidden">
                {(tc?.experiments ?? []).length ? (
                  tc!.experiments!.map((row) => (
                    <MobileRecord key={`${row.experiment}-${row.variant}`} title={row.experiment}>
                      <MobileFacts
                        rows={[
                          ["Variant", row.variant],
                          ["Exposures", row.exposures],
                          ["Conv.", row.conversions],
                          ["Rate", `${row.rate}%`],
                        ]}
                      />
                    </MobileRecord>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">No experiment exposures recorded.</p>
                )}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full text-left text-xs text-slate-300">
                  <thead className="border-b border-white/10 text-[11px] uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="py-2 pr-3">Experiment</th>
                      <th className="py-2 pr-3">Variant</th>
                      <th className="py-2 pr-3">Exposures</th>
                      <th className="py-2 pr-3">Conv.</th>
                      <th className="py-2">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(tc?.experiments ?? []).length ? (
                      tc!.experiments!.map((row) => (
                        <tr key={`${row.experiment}-${row.variant}`} className="border-b border-white/5">
                          <td className="py-2 pr-3 font-medium text-white">{row.experiment}</td>
                          <td className="py-2 pr-3">{row.variant}</td>
                          <td className="py-2 pr-3 tabular-nums">{row.exposures}</td>
                          <td className="py-2 pr-3 tabular-nums">{row.conversions}</td>
                          <td className="py-2 tabular-nums">{row.rate}%</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-4 text-slate-400">
                          No experiment exposures recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>

          <Panel title="Inventory demand">
            <div className="grid gap-3 md:hidden">
              {(tc?.inventoryDemand ?? []).length ? (
                tc!.inventoryDemand!.map((row) => (
                  <MobileRecord key={row.productId} title={row.title}>
                    <MobileFacts
                      rows={[
                        ["Views", row.views],
                        ["Adds", row.adds],
                        ["Stock", row.stock >= 0 ? row.stock : "-"],
                        ["Status", row.status.replaceAll("_", " ")],
                      ]}
                    />
                  </MobileRecord>
                ))
              ) : (
                <p className="text-sm text-slate-400">No inventory demand signals yet.</p>
              )}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-left text-xs text-slate-300">
                <thead className="border-b border-white/10 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2 pr-3">Product</th>
                    <th className="py-2 pr-3">Views</th>
                    <th className="py-2 pr-3">Adds</th>
                    <th className="py-2 pr-3">Stock</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(tc?.inventoryDemand ?? []).length ? (
                    tc!.inventoryDemand!.map((row) => (
                      <tr key={row.productId} className="border-b border-white/5">
                        <td className="max-w-[14rem] truncate py-2 pr-3 font-medium text-white" title={row.title}>
                          {row.title}
                        </td>
                        <td className="py-2 pr-3 tabular-nums">{row.views}</td>
                        <td className="py-2 pr-3 tabular-nums">{row.adds}</td>
                        <td className="py-2 pr-3 tabular-nums">{row.stock >= 0 ? row.stock : "—"}</td>
                        <td className="py-2">
                          <InventoryStatus status={row.status} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-4 text-slate-400">
                        No inventory demand signals yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}

      {tab === "quality" && (
        <div className="grid gap-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Events (24h)" value={tc?.dataQuality?.eventsLast24h ?? "—"} />
            <Metric label="Page views (24h)" value={tc?.dataQuality?.pageViewsLast24h ?? "—"} />
            <Metric label="Missing product ID %" value={tc?.dataQuality?.missingProductIdRate != null ? `${tc.dataQuality.missingProductIdRate}%` : "—"} />
            <Metric label="Rage clicks" value={tc?.rageClicks ?? "—"} accent="text-amber-300" />
            <Metric label="UI errors" value={tc?.uiErrors ?? "—"} accent="text-red-300" />
            <Metric label="NPS avg" value={tc?.nps?.avg ?? "—"} />
            <Metric label="NPS responses" value={tc?.nps?.count ?? "—"} />
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <Panel title="Recent UI errors">
              {(tc?.recentUiErrors ?? []).length ? (
                <div className="max-h-72 space-y-2 overflow-y-auto text-xs">
                  {tc!.recentUiErrors!.map((row, index) => (
                    <div key={`${row.at}-${row.visitorId}-${index}`} className="min-w-0 rounded-lg border border-red-500/25 bg-red-500/5 px-3 py-2">
                      <div className="flex flex-col gap-1 min-[520px]:flex-row min-[520px]:items-start min-[520px]:justify-between">
                        <p className="break-words font-semibold text-red-100">{row.message}</p>
                        <span className="shrink-0 text-[10px] uppercase tracking-wide text-red-300">{row.kind}</span>
                      </div>
                      <p className="mt-1 break-all text-slate-400">{row.path}</p>
                      <p className="mt-1 break-words text-slate-500">
                        {new Date(row.at).toLocaleString()} - visitor {row.visitorId.slice(0, 12)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No UI error details recorded in this period.</p>
              )}
            </Panel>

            <Panel title="Data quality notes">
              {(tc?.dataQuality?.notes ?? []).length ? (
                <ul className="space-y-1 text-xs text-slate-300">
                  {tc!.dataQuality!.notes!.map((note) => (
                    <li key={note}>• {note}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-400">No data quality notes.</p>
              )}
            </Panel>

            <Panel title="PII audit">
              <div className="space-y-2 text-xs text-slate-300">
                <p>
                  <span className="text-slate-500">Fields stored:</span>{" "}
                  {(tc?.piiAudit?.fieldsStored ?? []).join(", ") || "—"}
                </p>
                <p>
                  <span className="text-slate-500">Opt-out supported:</span>{" "}
                  {tc?.piiAudit?.optOutSupported ? "Yes" : "No"}
                </p>
                <p>
                  <span className="text-slate-500">DNT supported:</span> {tc?.piiAudit?.dntSupported ? "Yes" : "No"}
                </p>
                <p>
                  <span className="text-slate-500">MAC fingerprinting:</span>{" "}
                  {tc?.piiAudit?.macFingerprinting ? "Yes" : "No"}
                </p>
              </div>
            </Panel>

            <Panel title="Top search queries">
              <BarList rows={tc?.search?.topQueries ?? []} color="bg-sky-500" />
            </Panel>
            <Panel title="Zero-result searches">
              <BarList rows={tc?.search?.zeroResults ?? []} color="bg-amber-500" />
            </Panel>

            <Panel title="Sample funnel">
              <BarList rows={tc?.sampleFunnel ?? []} color="bg-violet-500" />
            </Panel>

            <Panel title="Hourly activity (last 24h)">
              {(tc?.hourly ?? []).some((h) => h.views > 0 || h.events > 0) ? (
                <div className="max-h-64 space-y-1 overflow-y-auto text-xs text-slate-300">
                  {tc!.hourly!.map((row) =>
                    row.views > 0 || row.events > 0 ? (
                      <div key={row.hour} className="grid gap-1 rounded border border-white/5 px-2 py-1 min-[460px]:flex min-[460px]:items-center min-[460px]:justify-between">
                        <span className="tabular-nums text-slate-400">{String(row.hour).padStart(2, "0")}:00</span>
                        <span className="break-words">
                          {row.views} views · {row.events} events
                        </span>
                      </div>
                    ) : null,
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No hourly activity in the last 24 hours.</p>
              )}
            </Panel>
          </div>
        </div>
      )}

      {tab === "paths" && (
        <div className="grid gap-5 xl:grid-cols-2">
          <Panel title="Product path flows">
            {(tc?.pathFlows ?? []).length ? (
              <div className="max-h-[28rem] space-y-2 overflow-y-auto text-xs">
                {tc!.pathFlows!.map((row, i) => (
                  <div key={`${row.from}-${row.to}-${i}`} className="grid gap-2 rounded-lg border border-white/10 px-3 py-2 min-[520px]:flex min-[520px]:items-center min-[520px]:justify-between">
                    <span className="min-w-0 break-words text-slate-300">
                      <span className="font-medium text-white">{row.from}</span>
                      <span className="mx-2 text-slate-500">→</span>
                      <span className="font-medium text-emerald-300">{row.to || "—"}</span>
                    </span>
                    <span className="shrink-0 tabular-nums font-semibold text-white">{row.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No product path flows recorded yet.</p>
            )}
          </Panel>

          <Panel title="Margins by title">
            <div className="grid gap-3 md:hidden">
              {(tc?.margins ?? []).length ? (
                tc!.margins!.map((row) => (
                  <MobileRecord key={row.title} title={row.title}>
                    <MobileFacts
                      rows={[
                        ["Revenue", `USD ${row.revenue.toFixed(2)}`],
                        ["Refunds", `USD ${row.refunds.toFixed(2)}`],
                        ["Net", `USD ${row.net.toFixed(2)}`],
                      ]}
                    />
                  </MobileRecord>
                ))
              ) : (
                <p className="text-sm text-slate-400">No margin data yet.</p>
              )}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-left text-xs text-slate-300">
                <thead className="border-b border-white/10 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2 pr-3">Title</th>
                    <th className="py-2 pr-3">Revenue</th>
                    <th className="py-2 pr-3">Refunds</th>
                    <th className="py-2">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {(tc?.margins ?? []).length ? (
                    tc!.margins!.map((row) => (
                      <tr key={row.title} className="border-b border-white/5">
                        <td className="max-w-[12rem] truncate py-2 pr-3 font-medium text-white" title={row.title}>
                          {row.title}
                        </td>
                        <td className="py-2 pr-3 tabular-nums">USD {row.revenue.toFixed(2)}</td>
                        <td className="py-2 pr-3 tabular-nums text-red-300">USD {row.refunds.toFixed(2)}</td>
                        <td className="py-2 tabular-nums font-semibold text-emerald-300">USD {row.net.toFixed(2)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-4 text-slate-400">
                        No margin data yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-black/20 px-3 py-3">
      <p className="break-words text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 break-words text-xl font-bold tabular-nums ${accent ?? "text-white"}`}>{value}</p>
    </div>
  );
}

function LiveFact({ icon, label, value }: { icon?: ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-white/5 bg-white/[0.03] px-2.5 py-2">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
        {icon}
        {label}
      </p>
      <p className="mt-1 break-words text-xs font-semibold text-slate-200">{value}</p>
    </div>
  );
}

function JourneyFact({ icon: Icon, label, value }: { icon: typeof UserRound; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-white/5 bg-white/[0.03] px-2.5 py-2">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
        <Icon className="size-3.5" />
        {label}
      </p>
      <p className="mt-1 break-words text-xs font-semibold text-slate-200">{value}</p>
    </div>
  );
}

function BigMetric({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-black/30 px-4 py-4">
      <p className="break-words text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-2 break-words text-3xl font-bold tabular-nums sm:text-4xl ${accent ?? "text-white"}`}>{value}</p>
    </div>
  );
}

function CompareMetric({ label, current, baseline }: { label: string; current: number; baseline: number }) {
  const change = pctChange(current, baseline);
  const up = baseline > 0 && current > baseline;
  const down = baseline > 0 && current < baseline;
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-black/20 px-3 py-3">
      <p className="break-words text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-white">{current}</p>
      <p className="mt-1 text-xs text-slate-500">
        7d avg {baseline}{" "}
        <span className={up ? "text-emerald-300" : down ? "text-red-300" : "text-slate-400"}>({change})</span>
      </p>
    </div>
  );
}

function MobileRecord({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="min-w-0 rounded-xl border border-white/10 bg-black/20 px-3 py-3">
      <h4 className="break-words text-sm font-semibold text-white">{title}</h4>
      <div className="mt-3">{children}</div>
    </article>
  );
}

function MobileFacts({ rows }: { rows: Array<[string, string | number]> }) {
  return (
    <dl className="grid grid-cols-2 gap-2 text-xs min-[460px]:grid-cols-4">
      {rows.map(([label, value]) => (
        <div key={label} className="min-w-0 rounded-lg border border-white/5 bg-white/[0.03] px-2 py-2">
          <dt className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
          <dd className="mt-1 break-words font-semibold tabular-nums text-slate-100">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function SegmentBadge({ segment }: { segment: string }) {
  const colors: Record<string, string> = {
    champions: "bg-emerald-500/20 text-emerald-200",
    loyal: "bg-cyan-500/20 text-cyan-200",
    promising: "bg-violet-500/20 text-violet-200",
    at_risk: "bg-amber-500/20 text-amber-200",
    hibernating: "bg-slate-500/20 text-slate-300",
  };
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase ${colors[segment] ?? colors.hibernating}`}>
      {segment.replaceAll("_", " ")}
    </span>
  );
}

function InventoryStatus({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ok: "text-emerald-300",
    low_stock: "text-amber-300",
    out_of_stock: "text-red-300",
    unknown: "text-slate-400",
  };
  return <span className={`text-[10px] font-bold uppercase ${colors[status] ?? "text-slate-400"}`}>{status.replaceAll("_", " ")}</span>;
}

function Panel({ title, icon: Icon, action, children }: { title: string; icon?: typeof UserRound; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-3">
        <h4 className="flex min-w-0 items-center gap-2 break-words text-sm font-semibold uppercase tracking-wider text-slate-300">
          {Icon ? <Icon className="size-4 shrink-0 text-emerald-300" /> : null}
          {title}
        </h4>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}
