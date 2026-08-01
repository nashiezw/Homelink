import { getWhatsAppHref } from "@/lib/settings/contact";

type FunnelRow = {
  name: string;
  target: string | null;
  metadata: unknown;
  visitorId: string;
  sessionId: string | null;
  path: string | null;
  userId: string | null;
  createdAt: Date;
};

type OrderRow = {
  id: string;
  orderNumber: string;
  status: string;
  total: unknown;
  currency: string;
  createdAt: Date;
  customerId: string;
  couponCode: string | null;
  refundedAt?: Date | null;
  items: Array<{ productId: string; title: string; quantity: number; total: unknown; productType: string }>;
  payment: { status: string | null; proofStatus: string | null; createdAt: Date; updatedAt: Date } | null;
  customer?: { email: string | null; name: string | null } | null;
};

type AbandonedRow = {
  id: string;
  email: string;
  subtotal: unknown;
  currency: string;
  reminderCount: number;
  reminderSentAt: Date | null;
  updatedAt: Date;
  items: unknown;
};

type ProductStock = {
  id: string;
  title: string;
  stock: number | null;
  lowStockThreshold: number | null;
  status: string;
};

type LiveVisitor = {
  visitorId: string;
  path: string;
  cartItemCount: number;
  cartValue: number;
  userId: string | null;
  productTitle: string;
};

type Meta = Record<string, unknown>;

function asMeta(value: unknown): Meta {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Meta) : {};
}

function metaStr(meta: Meta, ...keys: string[]) {
  for (const key of keys) {
    const value = meta[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function metaNum(meta: Meta, ...keys: string[]) {
  for (const key of keys) {
    const value = meta[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }
  return 0;
}

function hoursBetween(from: Date, to = new Date()) {
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / 3600000));
}

function topMap(map: Map<string, number>, limit = 12) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, value]) => ({ label: label.length > 48 ? `${label.slice(0, 48)}…` : label, value }));
}

function looksLikeProductId(value: string) {
  const v = value.trim();
  return /^c[a-z0-9]{20,}$/i.test(v) || (/^[a-z0-9_-]{16,}$/i.test(v) && !/\s/.test(v) && v === v.toLowerCase());
}

export function buildTopClassAnalytics(input: {
  days: number;
  funnels: FunnelRow[];
  orders: OrderRow[];
  abandoned: AbandonedRow[];
  catalog: ProductStock[];
  live: LiveVisitor[];
  pageViewsLast24h: number;
  pageViewsPrev7dDailyAvg: number;
  eventsLast24h: number;
  eventsPrev7dDailyAvg: number;
  whatsappNumber?: string;
  pendingProofs: number;
  todayRevenue: number;
  todayOrders: number;
}) {
  const {
    funnels,
    orders,
    abandoned,
    catalog,
    live,
    pageViewsLast24h,
    pageViewsPrev7dDailyAvg,
    eventsLast24h,
    eventsPrev7dDailyAvg,
    whatsappNumber,
    pendingProofs,
    todayRevenue,
    todayOrders,
  } = input;

  const pathFlows = new Map<string, number>();
  const sessionProducts = new Map<string, string[]>();
  const searchQueries = new Map<string, number>();
  const zeroSearches = new Map<string, number>();
  const experimentMap = new Map<string, { exposures: number; exposed: Set<string>; conversions: Set<string> }>();
  const visitorExperiments = new Map<string, Set<string>>();
  const visitorPurchased = new Set<string>();
  const visitorWhatsapp = new Set<string>();
  const visitorTouches = new Map<string, Array<{ channel: string; at: number }>>();
  const campaignMap = new Map<string, { visitors: Set<string>; purchases: number; revenue: number }>();
  const identityMap = new Map<string, { visitorId: string; userId: string; email: string; orders: number }>();
  const customerSpend = new Map<string, { email: string; revenue: number; orders: number; lastAt: number; firstAt: number }>();
  const catalogMap = new Map(catalog.map((row) => [row.id, row]));
  let rageClicks = 0;
  let uiErrors = 0;
  let sampleOpens = 0;
  let sampleAdds = 0;
  let sampleBuys = 0;
  let npsSum = 0;
  let npsCount = 0;
  let missingProductId = 0;
  let productishEvents = 0;
  const hourlyViews = Array.from({ length: 24 }, (_, hour) => ({ hour, views: 0, events: 0 }));
  const now = Date.now();
  const dayMs = 86400000;
  const chronological = [...funnels].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  function displayProductTitle(meta: Meta, target: string | null) {
    const productId = metaStr(meta, "productId", "id") || target || "";
    const metaTitle = metaStr(meta, "title", "productTitle");
    if (metaTitle && !looksLikeProductId(metaTitle)) return metaTitle;
    const catalogTitle = catalogMap.get(productId)?.title;
    if (catalogTitle) return catalogTitle;
    if (target && !looksLikeProductId(target)) return target;
    return "";
  }

  for (const event of chronological) {
    const meta = asMeta(event.metadata);
    const sessionId = event.sessionId || `v:${event.visitorId}`;
    const created = event.createdAt.getTime();
    const hour = new Date(event.createdAt).getHours();
    if (created >= now - dayMs) hourlyViews[hour].events += 1;

    if (
      event.name.startsWith("library_product") ||
      event.name.startsWith("library_cart") ||
      event.name === "library_sample_opened" ||
      event.name === "library_purchase_completed"
    ) {
      productishEvents += 1;
      if (!event.target && !metaStr(meta, "productId", "id")) missingProductId += 1;
    }

    if (event.name === "library_product_viewed") {
      const displayTitle = displayProductTitle(meta, event.target);
      if (displayTitle) {
        const list = sessionProducts.get(sessionId) ?? [];
        if (list[list.length - 1] !== displayTitle) {
          if (list.length) {
            const key = `${list[list.length - 1]} → ${displayTitle}`;
            pathFlows.set(key, (pathFlows.get(key) ?? 0) + 1);
          }
          list.push(displayTitle);
          if (list.length > 8) list.shift();
          sessionProducts.set(sessionId, list);
        }
      }
    }

    if (event.name === "library_search_submitted" || event.name === "search_submitted") {
      const q = metaStr(meta, "query", "q", "term") || event.target || "(empty)";
      searchQueries.set(q, (searchQueries.get(q) ?? 0) + 1);
      if (metaNum(meta, "resultCount", "results") === 0 || metaStr(meta, "zeroResults") === "true") {
        zeroSearches.set(q, (zeroSearches.get(q) ?? 0) + 1);
      }
    }

    if (event.name === "rage_click") rageClicks += 1;
    if (event.name === "ui_error" || event.name === "upload_failed") uiErrors += 1;
    if (event.name === "library_sample_opened") sampleOpens += 1;
    if (event.name === "library_cart_added" && metaStr(meta, "fromSample") === "true") sampleAdds += 1;
    if (event.name === "library_nps_submitted" || event.name === "library_review_submitted") {
      const score = metaNum(meta, "nps", "rating", "score");
      if (score > 0) {
        npsSum += score;
        npsCount += 1;
      }
    }

    if (event.name === "experiment_exposure") {
      const key = `${metaStr(meta, "experiment", "key") || "experiment"}::${metaStr(meta, "variant") || "control"}`;
      const row = experimentMap.get(key) ?? { exposures: 0, exposed: new Set<string>(), conversions: new Set<string>() };
      row.exposures += 1;
      row.exposed.add(event.visitorId);
      experimentMap.set(key, row);
      const set = visitorExperiments.get(event.visitorId) ?? new Set<string>();
      set.add(key);
      visitorExperiments.set(event.visitorId, set);
    }

    if (event.name === "library_purchase_completed") {
      visitorPurchased.add(event.visitorId);
      const exposedKeys = visitorExperiments.get(event.visitorId);
      if (exposedKeys) {
        for (const key of exposedKeys) {
          const row = experimentMap.get(key);
          if (row) row.conversions.add(event.visitorId);
        }
      } else {
        const experiment = metaStr(meta, "experiment");
        const variant = metaStr(meta, "variant");
        if (experiment && variant) {
          const key = `${experiment}::${variant}`;
          const row = experimentMap.get(key) ?? { exposures: 0, exposed: new Set<string>(), conversions: new Set<string>() };
          row.conversions.add(event.visitorId);
          experimentMap.set(key, row);
        }
      }
      const campaign = metaStr(meta, "utmCampaign", "campaign") || "organic";
      const camp = campaignMap.get(campaign) ?? { visitors: new Set<string>(), purchases: 0, revenue: 0 };
      camp.purchases += 1;
      camp.revenue += metaNum(meta, "total", "revenue");
      camp.visitors.add(event.visitorId);
      campaignMap.set(campaign, camp);
    }

    if (event.name === "whatsapp_click") visitorWhatsapp.add(event.visitorId);

    const channel =
      event.name === "whatsapp_click"
        ? "whatsapp"
        : metaStr(meta, "utmSource")
          ? `utm:${metaStr(meta, "utmSource")}`
          : event.name.startsWith("library_")
            ? "library"
            : "site";
    const touches = visitorTouches.get(event.visitorId) ?? [];
    touches.push({ channel, at: created });
    visitorTouches.set(event.visitorId, touches);

    if (event.name === "identity_stitched" && event.userId) {
      identityMap.set(event.visitorId, {
        visitorId: event.visitorId,
        userId: event.userId,
        email: metaStr(meta, "email"),
        orders: 0,
      });
    }
    if (event.userId && !identityMap.has(event.visitorId)) {
      identityMap.set(event.visitorId, {
        visitorId: event.visitorId,
        userId: event.userId,
        email: metaStr(meta, "email"),
        orders: 0,
      });
    }

    const utmCampaign = metaStr(meta, "utmCampaign");
    if (utmCampaign) {
      const camp = campaignMap.get(utmCampaign) ?? { visitors: new Set<string>(), purchases: 0, revenue: 0 };
      camp.visitors.add(event.visitorId);
      campaignMap.set(utmCampaign, camp);
    }
  }

  let refundTotal = 0;
  const revenueByTitle = new Map<string, { revenue: number; refunds: number }>();
  for (const order of orders) {
    const total = Number(order.total) || 0;
    const isPaid = order.status === "PAID" || order.status === "FULFILLED" || order.payment?.status === "PAID";
    const isRefunded = order.status === "REFUNDED" || Boolean(order.refundedAt);
    const email = order.customer?.email || order.customerId;
    const spend = customerSpend.get(order.customerId) ?? {
      email,
      revenue: 0,
      orders: 0,
      lastAt: order.createdAt.getTime(),
      firstAt: order.createdAt.getTime(),
    };
    if (isPaid && !isRefunded) {
      spend.revenue += total;
      spend.orders += 1;
      spend.lastAt = Math.max(spend.lastAt, order.createdAt.getTime());
      spend.firstAt = Math.min(spend.firstAt, order.createdAt.getTime());
      for (const item of order.items) {
        const row = revenueByTitle.get(item.title) ?? { revenue: 0, refunds: 0 };
        row.revenue += Number(item.total) || 0;
        revenueByTitle.set(item.title, row);
      }
    }
    if (isRefunded) {
      refundTotal += total;
      for (const item of order.items) {
        const row = revenueByTitle.get(item.title) ?? { revenue: 0, refunds: 0 };
        row.refunds += Number(item.total) || 0;
        revenueByTitle.set(item.title, row);
      }
    }
    customerSpend.set(order.customerId, spend);

    for (const [visitorId, identity] of identityMap) {
      if (identity.userId === order.customerId) {
        identity.orders += 1;
        if (!identity.email && email) identity.email = email;
        identityMap.set(visitorId, identity);
      }
    }
  }

  // Retention cohorts by purchase week
  const cohortMap = new Map<string, { size: Set<string>; d7: Set<string>; d30: Set<string> }>();
  const firstPurchase = new Map<string, number>();
  for (const order of orders) {
    if (!(order.status === "PAID" || order.status === "FULFILLED" || order.payment?.status === "PAID")) continue;
    const t = order.createdAt.getTime();
    if (!firstPurchase.has(order.customerId) || t < (firstPurchase.get(order.customerId) ?? t)) {
      firstPurchase.set(order.customerId, t);
    }
  }
  for (const [customerId, firstAt] of firstPurchase) {
    const week = new Date(firstAt);
    week.setHours(0, 0, 0, 0);
    week.setDate(week.getDate() - week.getDay());
    const key = week.toISOString().slice(0, 10);
    const row = cohortMap.get(key) ?? { size: new Set(), d7: new Set(), d30: new Set() };
    row.size.add(customerId);
    cohortMap.set(key, row);
  }
  for (const order of orders) {
    const firstAt = firstPurchase.get(order.customerId);
    if (!firstAt) continue;
    const delta = order.createdAt.getTime() - firstAt;
    const week = new Date(firstAt);
    week.setHours(0, 0, 0, 0);
    week.setDate(week.getDate() - week.getDay());
    const key = week.toISOString().slice(0, 10);
    const row = cohortMap.get(key);
    if (!row) continue;
    if (delta > 0 && delta <= 7 * dayMs) row.d7.add(order.customerId);
    if (delta > 0 && delta <= 30 * dayMs) row.d30.add(order.customerId);
  }

  const viewAdds = new Map<string, { title: string; views: number; adds: number }>();
  for (const event of funnels) {
    const meta = asMeta(event.metadata);
    const id = metaStr(meta, "productId") || event.target || "";
    const title = displayProductTitle(meta, event.target) || catalogMap.get(id)?.title || "Unknown product";
    if (!id || id === "cart") continue;
    const row = viewAdds.get(id) ?? { title, views: 0, adds: 0 };
    if ((!row.title || row.title === "Unknown product" || looksLikeProductId(row.title)) && title && title !== "Unknown product") {
      row.title = title;
    }
    if (event.name === "library_product_viewed") row.views += 1;
    if (event.name === "library_cart_added" || event.name === "library_bundle_added") row.adds += 1;
    viewAdds.set(id, row);
  }

  const inventoryDemand = [...viewAdds.entries()]
    .map(([productId, row]) => {
      const stockRow = catalogMap.get(productId);
      const stock = stockRow?.stock;
      const threshold = stockRow?.lowStockThreshold ?? 5;
      const status =
        stock == null ? "unknown" : stock <= 0 ? "out_of_stock" : stock <= threshold ? "low_stock" : "ok";
      return {
        productId,
        title: stockRow?.title || row.title,
        views: row.views,
        adds: row.adds,
        stock: stock ?? -1,
        status,
      };
    })
    .filter((row) => row.status !== "ok" || row.views >= 5)
    .sort((a, b) => b.views - a.views)
    .slice(0, 40);

  const abandonRescue = abandoned
    .map((row) => {
      const items = Array.isArray(row.items) ? row.items : [];
      const titles = items
        .slice(0, 4)
        .map((item) => (item && typeof item === "object" && "title" in item ? String((item as { title?: string }).title || "") : ""))
        .filter(Boolean);
      const value = Number(row.subtotal) || 0;
      const currency = row.currency || "USD";
      const message = `Hi — following up on your HouseLink Library bag (${currency} ${value.toFixed(2)}${titles.length ? `: ${titles.join(", ")}` : ""}). Happy to help you finish checkout.`;
      return {
        id: row.id,
        email: row.email,
        value,
        currency,
        idleHours: hoursBetween(row.updatedAt),
        reminderCount: row.reminderCount,
        itemCount: items.length,
        items: titles,
        whatsappUrl: whatsappNumber
          ? getWhatsAppHref(
              { whatsappNumber, whatsappLibraryNumber: whatsappNumber, whatsappPropertyNumber: whatsappNumber },
              { lane: "library", number: whatsappNumber, message },
            )
          : "",
      };
    })
    .sort((a, b) => b.value - a.value || b.idleHours - a.idleHours)
    .slice(0, 40);

  const fraud: Array<{ signal: string; detail: string; score: number }> = [];
  const rejectByVisitor = new Map<string, number>();
  const uploadFailByVisitor = new Map<string, number>();
  for (const event of funnels) {
    if (event.name === "upload_failed") {
      uploadFailByVisitor.set(event.visitorId, (uploadFailByVisitor.get(event.visitorId) ?? 0) + 1);
    }
  }
  for (const order of orders) {
    if (order.payment?.proofStatus === "REJECTED") {
      // approximate via customer
      rejectByVisitor.set(order.customerId, (rejectByVisitor.get(order.customerId) ?? 0) + 1);
    }
  }
  for (const [visitorId, count] of uploadFailByVisitor) {
    if (count >= 3) fraud.push({ signal: "repeat_upload_failures", detail: `${visitorId.slice(0, 12)}… failed uploads ×${count}`, score: Math.min(100, count * 20) });
  }
  for (const [customerId, count] of rejectByVisitor) {
    if (count >= 2) fraud.push({ signal: "repeat_proof_rejects", detail: `Customer ${customerId.slice(0, 10)}… rejects ×${count}`, score: Math.min(100, count * 30) });
  }
  const couponAbuse = new Map<string, number>();
  for (const order of orders) {
    if (order.couponCode) couponAbuse.set(order.couponCode, (couponAbuse.get(order.couponCode) ?? 0) + 1);
  }
  for (const [code, count] of couponAbuse) {
    if (count >= 8) fraud.push({ signal: "coupon_spike", detail: `Coupon ${code} used ${count}× in window`, score: Math.min(100, count * 8) });
  }

  const orderSlas = orders
    .map((order) => {
      const proofStatus = String(order.payment?.proofStatus || "").toUpperCase();
      const paymentStatus = String(order.payment?.status || "").toUpperCase();
      let stage = "awaiting_payment";
      let since = order.createdAt;
      if (proofStatus === "UPLOADED") {
        stage = "awaiting_approval";
        since = order.payment?.updatedAt || order.createdAt;
      } else if (paymentStatus === "PAID" || order.status === "PAID") {
        stage = order.status === "FULFILLED" ? "fulfilled" : "paid_fulfil";
        since = order.payment?.updatedAt || order.createdAt;
      } else if (proofStatus === "REJECTED") {
        stage = "proof_rejected";
        since = order.payment?.updatedAt || order.createdAt;
      }
      const hours = hoursBetween(since);
      const breached =
        (stage === "awaiting_approval" && hours >= 24) ||
        (stage === "awaiting_payment" && hours >= 48) ||
        (stage === "paid_fulfil" && hours >= 72);
      return { orderNumber: order.orderNumber, stage, hours, breached };
    })
    .filter((row) => row.stage !== "fulfilled")
    .sort((a, b) => Number(b.breached) - Number(a.breached) || b.hours - a.hours)
    .slice(0, 40);

  const ltvRfm = [...customerSpend.entries()]
    .map(([customerId, row]) => {
      const recencyDays = Math.max(0, Math.round((now - row.lastAt) / dayMs));
      const monetary = row.revenue;
      const frequency = row.orders;
      let segment = "hibernating";
      if (recencyDays <= 30 && frequency >= 2 && monetary >= 50) segment = "champions";
      else if (recencyDays <= 45 && frequency >= 1 && monetary >= 20) segment = "loyal";
      else if (recencyDays <= 60 && frequency === 1) segment = "promising";
      else if (recencyDays > 60 && monetary > 0) segment = "at_risk";
      return {
        customerId,
        email: row.email,
        revenue: Math.round(monetary * 100) / 100,
        orders: frequency,
        recencyDays,
        segment,
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 50);

  const segments = [
    {
      id: "viewed_no_purchase",
      name: "Viewed product, no purchase",
      description: "Product viewers in window who never purchased",
      count: new Set(
        funnels.filter((e) => e.name === "library_product_viewed" && !visitorPurchased.has(e.visitorId)).map((e) => e.visitorId),
      ).size,
    },
    {
      id: "added_no_purchase",
      name: "Added to bag, no purchase",
      description: "Cart adders who did not complete purchase",
      count: new Set(
        funnels
          .filter((e) => (e.name === "library_cart_added" || e.name === "library_bundle_added") && !visitorPurchased.has(e.visitorId))
          .map((e) => e.visitorId),
      ).size,
    },
    {
      id: "whatsapp_no_purchase",
      name: "WhatsApp clicked, no purchase",
      description: "Asked for help but did not buy yet",
      count: [...visitorWhatsapp].filter((id) => !visitorPurchased.has(id)).length,
    },
    {
      id: "high_value_open_bags",
      name: "High-value open bags (live)",
      description: "Live visitors with bag value ≥ USD 40",
      count: live.filter((row) => row.cartValue >= 40).length,
    },
    {
      id: "champions",
      name: "RFM champions",
      description: "Recent, frequent, high-spend Library buyers",
      count: ltvRfm.filter((row) => row.segment === "champions").length,
    },
  ];

  // Multi-touch attribution
  const firstTouch = new Map<string, number>();
  const lastTouch = new Map<string, number>();
  const linear = new Map<string, number>();
  let assistedRevenue = 0;
  let paidRevenue = 0;
  for (const order of orders) {
    if (!(order.status === "PAID" || order.status === "FULFILLED" || order.payment?.status === "PAID")) continue;
    if (order.status === "REFUNDED") continue;
    const total = Number(order.total) || 0;
    paidRevenue += total;
    // Find visitor via identity or customer events
    let visitorId = "";
    for (const [vid, identity] of identityMap) {
      if (identity.userId === order.customerId) visitorId = vid;
    }
    if (!visitorId) {
      const hit = funnels.find((e) => e.userId === order.customerId && e.name === "library_purchase_completed");
      visitorId = hit?.visitorId || "";
    }
    const touches = (visitorTouches.get(visitorId) || []).filter((t) => t.at <= order.createdAt.getTime());
    const channels = touches.length ? touches.map((t) => t.channel) : ["organic"];
    const first = channels[0];
    const last = channels[channels.length - 1];
    firstTouch.set(first, (firstTouch.get(first) ?? 0) + total);
    lastTouch.set(last, (lastTouch.get(last) ?? 0) + total);
    const unique = [...new Set(channels)];
    for (const channel of unique) {
      linear.set(channel, (linear.get(channel) ?? 0) + total / unique.length);
    }
    if (visitorWhatsapp.has(visitorId) || channels.includes("whatsapp")) assistedRevenue += total;
  }

  const waHref = whatsappNumber
    ? getWhatsAppHref(
        { whatsappNumber, whatsappLibraryNumber: whatsappNumber, whatsappPropertyNumber: whatsappNumber },
        {
          lane: "library",
          number: whatsappNumber,
          message: "HouseLink ops alert: please check Library Admin Analytics live board.",
        },
      )
    : "";

  const intervene = [
    live.filter((row) => row.path.includes("/library/checkout")).length >= 2
      ? {
          reason: "Multiple shoppers on checkout",
          count: live.filter((row) => row.path.includes("/library/checkout")).length,
          severity: "high" as const,
          whatsappUrl: waHref,
        }
      : null,
    live.filter((row) => row.cartValue >= 40).length
      ? {
          reason: "High-value open bags online",
          count: live.filter((row) => row.cartValue >= 40).length,
          severity: "medium" as const,
          whatsappUrl: waHref,
        }
      : null,
    pendingProofs > 0
      ? {
          reason: "Payment proofs awaiting approval",
          count: pendingProofs,
          severity: "high" as const,
          whatsappUrl: waHref,
        }
      : null,
    abandonRescue.filter((row) => row.value >= 30 && row.idleHours >= 6).length
      ? {
          reason: "High-value abandoned bags idle 6h+",
          count: abandonRescue.filter((row) => row.value >= 30 && row.idleHours >= 6).length,
          severity: "medium" as const,
          whatsappUrl: waHref,
        }
      : null,
  ].filter(Boolean) as Array<{ reason: string; count: number; severity: "high" | "medium"; whatsappUrl: string }>;

  const anomalies = [
    pageViewsPrev7dDailyAvg > 0 && pageViewsLast24h > pageViewsPrev7dDailyAvg * 2.2
      ? { metric: "page_views_24h", current: pageViewsLast24h, baseline: Math.round(pageViewsPrev7dDailyAvg), severity: "info" as const }
      : null,
    pageViewsPrev7dDailyAvg > 5 && pageViewsLast24h < pageViewsPrev7dDailyAvg * 0.35
      ? { metric: "page_views_drop_24h", current: pageViewsLast24h, baseline: Math.round(pageViewsPrev7dDailyAvg), severity: "warning" as const }
      : null,
    eventsPrev7dDailyAvg > 0 && eventsLast24h > eventsPrev7dDailyAvg * 2.5
      ? { metric: "events_spike_24h", current: eventsLast24h, baseline: Math.round(eventsPrev7dDailyAvg), severity: "info" as const }
      : null,
    rageClicks >= 15
      ? { metric: "rage_clicks", current: rageClicks, baseline: 5, severity: "warning" as const }
      : null,
  ].filter(Boolean) as Array<{ metric: string; current: number; baseline: number; severity: "info" | "warning" }>;

  const experiments = [...experimentMap.entries()].map(([key, row]) => {
    const [experiment, variant] = key.split("::");
    return {
      experiment,
      variant,
      exposures: row.exposures,
      conversions: row.conversions.size,
      rate: row.exposures ? Math.round((row.conversions.size / row.exposures) * 1000) / 10 : 0,
    };
  });

  // Sample funnel approximation: opens → later cart adds by same visitor → purchases
  const sampleVisitors = new Set(funnels.filter((e) => e.name === "library_sample_opened").map((e) => e.visitorId));
  for (const event of funnels) {
    if ((event.name === "library_cart_added" || event.name === "library_bundle_added") && sampleVisitors.has(event.visitorId)) {
      sampleAdds += 1;
    }
    if (event.name === "library_purchase_completed" && sampleVisitors.has(event.visitorId)) sampleBuys += 1;
  }

  const goals = [
    { id: "orders", name: "Paid Library orders", target: Math.max(10, todayOrders * 3 || 10), current: orders.filter((o) => o.status === "PAID" || o.status === "FULFILLED" || o.payment?.status === "PAID").length },
    { id: "wa_assisted", name: "WhatsApp-assisted revenue (USD)", target: 200, current: Math.round(assistedRevenue) },
    { id: "proof_sla", name: "Proofs pending under SLA", target: 0, current: orderSlas.filter((o) => o.stage === "awaiting_approval" && o.breached).length, invert: true },
    { id: "rescue", name: "Abandoned bags rescued contact queue", target: 5, current: abandonRescue.length },
  ].map((goal) => ({
    ...goal,
    pct: goal.invert
      ? goal.current === 0
        ? 100
        : Math.max(0, 100 - goal.current * 20)
      : Math.min(100, Math.round((goal.current / Math.max(1, goal.target)) * 100)),
  }));

  return {
    board: {
      todayRevenue: Math.round(todayRevenue * 100) / 100,
      todayOrders,
      online: live.length,
      openBags: live.filter((row) => row.cartItemCount > 0).length,
      pendingProofs,
      waClicks: visitorWhatsapp.size,
      assistedRevenue: Math.round(assistedRevenue * 100) / 100,
      refundTotal: Math.round(refundTotal * 100) / 100,
    },
    pathFlows: topMap(pathFlows, 20).map((row) => {
      const [from, to] = row.label.split(" → ");
      return { from: from || row.label, to: to || "", value: row.value };
    }),
    retentionCohorts: [...cohortMap.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .slice(0, 8)
      .map(([cohort, row]) => ({
        cohort,
        size: row.size.size,
        d7: row.size.size ? Math.round((row.d7.size / row.size.size) * 100) : 0,
        d30: row.size.size ? Math.round((row.d30.size / row.size.size) * 100) : 0,
      })),
    margins: [...revenueByTitle.entries()]
      .map(([title, row]) => ({
        title,
        revenue: Math.round(row.revenue * 100) / 100,
        refunds: Math.round(row.refunds * 100) / 100,
        net: Math.round((row.revenue - row.refunds) * 100) / 100,
      }))
      .sort((a, b) => b.net - a.net)
      .slice(0, 30),
    inventoryDemand,
    experiments,
    intervene,
    abandonRescue,
    fraud: fraud.sort((a, b) => b.score - a.score).slice(0, 30),
    orderSlas,
    identity: [...identityMap.values()].sort((a, b) => b.orders - a.orders).slice(0, 40),
    ltvRfm,
    segments,
    attribution: {
      firstTouch: topMap(firstTouch).map((row) => ({ ...row, value: Math.round(row.value * 100) / 100 })),
      lastTouch: topMap(lastTouch).map((row) => ({ ...row, value: Math.round(row.value * 100) / 100 })),
      linear: topMap(linear).map((row) => ({ ...row, value: Math.round(row.value * 100) / 100 })),
      assistedRevenue: Math.round(assistedRevenue * 100) / 100,
      assistedRate: paidRevenue ? Math.round((assistedRevenue / paidRevenue) * 100) : 0,
    },
    campaigns: [...campaignMap.entries()]
      .map(([campaign, row]) => ({
        campaign,
        visitors: row.visitors.size,
        purchases: row.purchases,
        revenue: Math.round(row.revenue * 100) / 100,
      }))
      .sort((a, b) => b.revenue - a.revenue || b.visitors - a.visitors)
      .slice(0, 30),
    rageClicks,
    uiErrors,
    search: {
      topQueries: topMap(searchQueries),
      zeroResults: topMap(zeroSearches),
    },
    sampleFunnel: [
      { label: "sample opened", value: sampleOpens },
      { label: "added after sample", value: sampleAdds },
      { label: "purchased after sample", value: sampleBuys },
    ],
    nps: { avg: npsCount ? Math.round((npsSum / npsCount) * 10) / 10 : 0, count: npsCount },
    dataQuality: {
      eventsLast24h,
      pageViewsLast24h,
      missingProductIdRate: productishEvents ? Math.round((missingProductId / productishEvents) * 100) : 0,
      notes: [
        "First-party visitor UUID only — no MAC / hardware fingerprinting.",
        "Opt-out and Do Not Track are honored in the browser tracker.",
        "Identity stitch links visitor → user after login/checkout (admin-only views).",
      ],
    },
    hourly: hourlyViews,
    anomalies,
    piiAudit: {
      fieldsStored: ["visitorId", "sessionId", "path", "utm", "deviceClass", "optional userId/email after stitch"],
      optOutSupported: true,
      dntSupported: true,
      macFingerprinting: false,
    },
    goals,
    compare: {
      pageViewsLast24h,
      pageViewsPrev7dDailyAvg: Math.round(pageViewsPrev7dDailyAvg),
      eventsLast24h,
      eventsPrev7dDailyAvg: Math.round(eventsPrev7dDailyAvg),
    },
  };
}

export type TopClassAnalytics = ReturnType<typeof buildTopClassAnalytics>;
