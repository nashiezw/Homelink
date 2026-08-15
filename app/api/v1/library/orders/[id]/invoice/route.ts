import { problem } from "@/lib/api/response";
import { getPostgresPublicUserById, shouldUsePostgresAuth } from "@/lib/auth/postgres-auth";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { getLibraryInvoiceForUser, type LibraryShippingAddress } from "@/lib/library/repository";
import { getProductionPaymentSettings, shouldUsePostgresPayments } from "@/lib/payments/postgres-payment-repository";
import { formatBankDetailLabel } from "@/lib/payments/public-payment-config";
import type { ManualPaymentMethodConfig, PaymentSettings } from "@/lib/settings/types";
import { getStore } from "@/lib/store/app-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to download this Library invoice.");
  const user = shouldUsePostgresAuth() ? await getPostgresPublicUserById(userId) : getStore().getUserById(userId);
  const { id } = await context.params;
  const result = await getLibraryInvoiceForUser(id, userId, user?.roles);
  if (!result) return problem(404, "INVOICE_NOT_FOUND", "Library invoice not found.");
  if (result === "FORBIDDEN") return problem(403, "ACCESS_DENIED", "You do not have access to this invoice.");

  const invoice = result.invoice as {
    invoiceNumber?: string;
    issuedAt?: Date | string;
    taxTotal?: unknown;
    subtotal?: unknown;
    discountTotal?: unknown;
  } | null;
  const order = result.order as {
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    currency: string;
    total: number;
    subtotal?: number;
    discountTotal?: number;
    shipping?: LibraryShippingAddress | null;
    items?: Array<{ title: string; sku: string; quantity: number; unitPrice: number; total: number; productType?: string }>;
    payment?: {
      id?: string;
      status?: string;
      provider?: string | null;
      method?: string | null;
      manual?: boolean | null;
      proofStatus?: string | null;
      referenceNumber?: string | null;
      metadata?: Record<string, unknown> | null;
    } | null;
  };
  const paymentSettings = await getInvoicePaymentSettings();
  const html = printableInvoiceHtml({
    invoiceNumber: invoice?.invoiceNumber ?? `HL-LIB-INV-${order.orderNumber}`,
    issuedAt: invoice?.issuedAt ? new Date(invoice.issuedAt).toISOString() : new Date().toISOString(),
    order,
    paymentDetails: resolveInvoicePaymentDetails(order, paymentSettings),
    taxTotal: Number(invoice?.taxTotal ?? 0),
    subtotal: Number(invoice?.subtotal ?? order.subtotal ?? order.total),
    discountTotal: Number(invoice?.discountTotal ?? order.discountTotal ?? 0),
  });

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="${invoice?.invoiceNumber ?? order.orderNumber}.html"`,
      "Cache-Control": "private, no-store",
    },
  });
}

function printableInvoiceHtml(input: {
  invoiceNumber: string;
  issuedAt: string;
  order: {
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    currency: string;
    total: number;
    shipping?: LibraryShippingAddress | null;
    items?: Array<{ title: string; sku: string; quantity: number; unitPrice: number; total: number; productType?: string }>;
    payment?: {
      id?: string;
      status?: string;
      provider?: string | null;
      method?: string | null;
      manual?: boolean | null;
      proofStatus?: string | null;
      referenceNumber?: string | null;
    } | null;
  };
  paymentDetails: InvoicePaymentDetails;
  taxTotal: number;
  subtotal: number;
  discountTotal: number;
}) {
  const issuedDate = new Date(input.issuedAt);
  const formattedIssuedDate = Number.isFinite(issuedDate.getTime())
    ? issuedDate.toLocaleDateString("en-ZW", { year: "numeric", month: "short", day: "numeric" })
    : "Today";
  const money = (value: number) => `${escapeHtml(input.order.currency)} ${Number(value || 0).toFixed(2)}`;
  const rows = (input.order.items ?? []).map((item) => `
    <tr>
      <td class="item-cell">
        <strong>${escapeHtml(item.title)}</strong>
        ${item.productType ? `<span>${escapeHtml(item.productType.replace(/_/g, " "))}</span>` : ""}
      </td>
      <td class="mono">${escapeHtml(item.sku)}</td>
      <td class="numeric">${item.quantity}</td>
      <td class="numeric">${money(item.unitPrice)}</td>
      <td class="numeric strong">${money(item.total)}</td>
    </tr>
  `).join("");
  const shipping = input.order.shipping;
  const shippingBlock = shipping
    ? `<section class="address-card">
        <p class="section-label">Ship to</p>
        <p class="address-name">${escapeHtml(shipping.name)}</p>
        <p>${escapeHtml(shipping.phone)}<br>${escapeHtml(shipping.line1)}${shipping.line2 ? `<br>${escapeHtml(shipping.line2)}` : ""}<br>${escapeHtml(shipping.city)}${shipping.province ? `, ${escapeHtml(shipping.province)}` : ""}<br>${escapeHtml(shipping.country || "Zimbabwe")}</p>
        ${shipping.notes ? `<p class="note">Notes: ${escapeHtml(shipping.notes)}</p>` : ""}
      </section>`
    : "";
  const discountRow = input.discountTotal > 0 ? `<div><span>Discount</span><strong>- ${money(input.discountTotal)}</strong></div>` : "";
  const taxRow = input.taxTotal > 0 ? `<div><span>Tax</span><strong>${money(input.taxTotal)}</strong></div>` : "";
  const emptyRows = rows || `<tr><td colspan="5" class="empty">No invoice items were found for this order.</td></tr>`;
  const paymentDetailsBlock = renderPaymentDetails(input.paymentDetails);

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(input.invoiceNumber)}</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #e8edf3;
      color: #0f172a;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 14px;
      line-height: 1.5;
    }
    .toolbar {
      display: flex;
      justify-content: center;
      padding: 18px;
      color: #475569;
      font-size: 13px;
    }
    .toolbar button {
      border: 0;
      border-radius: 999px;
      background: #009f73;
      color: #fff;
      font-weight: 700;
      margin-left: 12px;
      padding: 10px 16px;
      cursor: pointer;
      box-shadow: 0 10px 24px rgba(0, 159, 115, 0.24);
    }
    .page {
      width: min(100%, 960px);
      min-height: 1180px;
      margin: 0 auto 32px;
      background: #fff;
      border: 1px solid #d9e2ec;
      box-shadow: 0 24px 80px rgba(15, 23, 42, 0.14);
    }
    .hero {
      position: relative;
      overflow: hidden;
      padding: 38px 44px 34px;
      background: linear-gradient(135deg, #06213f 0%, #07395c 58%, #009f73 100%);
      color: #fff;
    }
    .hero:after {
      content: "";
      position: absolute;
      right: -120px;
      top: -150px;
      width: 360px;
      height: 360px;
      border: 44px solid rgba(255, 255, 255, 0.1);
      border-radius: 50%;
    }
    .hero-grid {
      position: relative;
      z-index: 1;
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 32px;
      align-items: start;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .logo-card {
      display: grid;
      place-items: center;
      width: 168px;
      min-height: 64px;
      border-radius: 14px;
      background: #fff;
      padding: 10px 14px;
      box-shadow: 0 14px 28px rgba(0, 0, 0, 0.18);
    }
    .logo-card img { max-width: 100%; height: auto; display: block; }
    .brand-title p { margin: 2px 0 0; color: rgba(255, 255, 255, 0.76); font-size: 12px; text-transform: uppercase; letter-spacing: 0.14em; }
    h1 { margin: 0; font-size: 36px; line-height: 1; letter-spacing: 0; }
    .invoice-meta {
      min-width: 250px;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.22);
      padding: 18px;
      backdrop-filter: blur(10px);
    }
    .meta-row { display: flex; justify-content: space-between; gap: 18px; padding: 6px 0; }
    .meta-row span { color: rgba(255, 255, 255, 0.72); font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; }
    .meta-row strong { text-align: right; }
    .content { padding: 38px 44px 32px; }
    .summary-strip {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-top: -66px;
      position: relative;
      z-index: 2;
    }
    .summary-card {
      min-height: 96px;
      border-radius: 14px;
      border: 1px solid #dbe4ee;
      background: #fff;
      padding: 16px;
      box-shadow: 0 14px 36px rgba(15, 23, 42, 0.12);
    }
    .summary-card span, .section-label {
      display: block;
      color: #64748b;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .summary-card strong { display: block; margin-top: 6px; font-size: 18px; }
    .summary-card p { margin: 4px 0 0; color: #475569; font-size: 13px; }
    .addresses {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
      margin-top: 28px;
    }
    .address-card {
      min-height: 152px;
      border-radius: 14px;
      border: 1px solid #dbe4ee;
      background: #f8fafc;
      padding: 18px;
    }
    .address-card p { margin: 8px 0 0; color: #334155; }
    .address-name { color: #0f172a !important; font-size: 16px; font-weight: 800; }
    .note {
      border-left: 3px solid #009f73;
      padding-left: 10px;
      color: #64748b !important;
      font-size: 12px;
    }
    table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin-top: 30px;
      overflow: hidden;
      border: 1px solid #dbe4ee;
      border-radius: 14px;
    }
    thead th {
      background: #f1f5f9;
      color: #475569;
      font-size: 11px;
      letter-spacing: 0.12em;
      padding: 14px 16px;
      text-align: left;
      text-transform: uppercase;
    }
    tbody td {
      border-top: 1px solid #e2e8f0;
      padding: 18px 16px;
      vertical-align: top;
    }
    .item-cell strong { display: block; font-size: 15px; line-height: 1.35; }
    .item-cell span {
      display: inline-block;
      margin-top: 7px;
      border-radius: 999px;
      background: #e6f7f1;
      color: #007d5a;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.08em;
      padding: 4px 8px;
      text-transform: uppercase;
    }
    .mono { color: #334155; font-family: "Courier New", monospace; font-size: 12px; }
    .numeric { text-align: right; white-space: nowrap; }
    .strong { font-weight: 800; }
    .empty { color: #64748b; text-align: center; }
    .payment-panel {
      display: grid;
      grid-template-columns: 1fr 320px;
      gap: 28px;
      align-items: start;
      margin-top: 28px;
    }
    .message {
      border-radius: 14px;
      background: #eefbf6;
      border: 1px solid #b9ead8;
      color: #0f513f;
      padding: 18px;
    }
    .message strong { display: block; margin-bottom: 4px; }
    .payment-details {
      margin-top: 28px;
      border-radius: 14px;
      border: 1px solid #dbe4ee;
      background: #f8fafc;
      padding: 20px;
    }
    .payment-details h2 {
      margin: 0;
      color: #0f172a;
      font-size: 16px;
    }
    .payment-details .lead {
      margin: 6px 0 0;
      color: #475569;
      font-size: 13px;
    }
    .payment-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin-top: 16px;
    }
    .payment-field {
      min-width: 0;
      border-radius: 12px;
      background: #fff;
      border: 1px solid #e2e8f0;
      padding: 12px;
    }
    .payment-field span {
      display: block;
      color: #64748b;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }
    .payment-field strong {
      display: block;
      margin-top: 5px;
      overflow-wrap: anywhere;
      color: #0f172a;
    }
    .instructions {
      margin-top: 14px;
      border-left: 4px solid #009f73;
      padding: 4px 0 4px 12px;
      color: #334155;
      white-space: pre-line;
    }
    .proof-note {
      margin: 14px 0 0;
      color: #0f513f;
      font-size: 12px;
      font-weight: 700;
    }
    .totals {
      border-radius: 14px;
      border: 1px solid #dbe4ee;
      background: #fff;
      padding: 18px;
    }
    .totals div {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 9px 0;
      color: #475569;
    }
    .totals strong { color: #0f172a; }
    .totals .grand {
      margin-top: 10px;
      padding-top: 16px;
      border-top: 2px solid #06213f;
      color: #0f172a;
      font-size: 20px;
      font-weight: 900;
    }
    .footer {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      margin-top: 42px;
      border-top: 1px solid #e2e8f0;
      padding-top: 22px;
      color: #64748b;
      font-size: 12px;
    }
    .footer strong { color: #0f172a; }
    @media (max-width: 720px) {
      .page { min-height: auto; margin-bottom: 0; border: 0; }
      .hero, .content { padding-left: 22px; padding-right: 22px; }
      .hero-grid, .addresses, .payment-panel, .summary-strip { grid-template-columns: 1fr; }
      .payment-grid { grid-template-columns: 1fr; }
      .summary-strip { margin-top: -40px; }
      .invoice-meta { min-width: 0; }
      .numeric { text-align: left; }
      table { display: block; overflow-x: auto; }
      .footer { flex-direction: column; }
    }
    @page { margin: 14mm; }
    @media print {
      body { background: #fff; }
      .toolbar { display: none; }
      .page { width: 100%; min-height: auto; margin: 0; border: 0; box-shadow: none; }
      .hero { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .summary-card, .address-card, table, .message, .totals { break-inside: avoid; box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <span>Printable HouseLink Library invoice</span>
    <button type="button" onclick="window.print()">Print or Save PDF</button>
  </div>
  <main class="page">
    <section class="hero">
      <div class="hero-grid">
        <div>
          <div class="brand">
            <div class="logo-card">
              <img src="/brand/houselink-full-lockup.png" alt="HouseLink Zimbabwe" />
            </div>
            <div class="brand-title">
              <h1>Invoice</h1>
              <p>HouseLink Library</p>
            </div>
          </div>
        </div>
        <aside class="invoice-meta">
          <div class="meta-row"><span>Invoice</span><strong>${escapeHtml(input.invoiceNumber)}</strong></div>
          <div class="meta-row"><span>Order</span><strong>${escapeHtml(input.order.orderNumber)}</strong></div>
          <div class="meta-row"><span>Issued</span><strong>${escapeHtml(formattedIssuedDate)}</strong></div>
        </aside>
      </div>
    </section>

    <section class="content">
      <div class="summary-strip">
        <div class="summary-card">
          <span>Billed to</span>
          <strong>${escapeHtml(input.order.customerName)}</strong>
          <p>${escapeHtml(input.order.customerEmail)}</p>
        </div>
        <div class="summary-card">
          <span>Amount due</span>
          <strong>${money(input.order.total)}</strong>
          <p>${escapeHtml(input.paymentDetails.reference ? `Use ref ${input.paymentDetails.reference}` : "Library order total")}</p>
        </div>
        <div class="summary-card">
          <span>Payment</span>
          <strong>${escapeHtml(input.paymentDetails.statusLabel)}</strong>
          <p>${escapeHtml(input.paymentDetails.methodLabel)}</p>
        </div>
      </div>

      <div class="addresses">
        <section class="address-card">
          <p class="section-label">Bill to</p>
          <p class="address-name">${escapeHtml(input.order.customerName)}</p>
          <p>${escapeHtml(input.order.customerEmail)}</p>
        </section>
        ${shippingBlock || `<section class="address-card">
          <p class="section-label">Delivery</p>
          <p class="address-name">Digital delivery</p>
          <p>Digital access appears in My Library after payment confirmation.</p>
        </section>`}
      </div>

      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>SKU</th>
            <th class="numeric">Qty</th>
            <th class="numeric">Unit</th>
            <th class="numeric">Total</th>
          </tr>
        </thead>
        <tbody>${emptyRows}</tbody>
      </table>

      ${paymentDetailsBlock}

      <section class="payment-panel">
        <div class="message">
          <strong>Thank you for supporting HouseLink Library.</strong>
          <span>Digital products are delivered through My Library. Printed books are fulfilled separately after payment confirmation.</span>
        </div>
        <div class="totals">
          <div><span>Subtotal</span><strong>${money(input.subtotal)}</strong></div>
          ${discountRow}
          ${taxRow}
          <div class="grand"><span>Total</span><strong>${money(input.order.total)}</strong></div>
        </div>
      </section>

      <footer class="footer">
        <div>
          <strong>HouseLink Zimbabwe</strong><br>
          Property resources, books, manuals, forms and digital tools.
        </div>
        <div>
          Invoice generated for ${escapeHtml(input.order.customerEmail)}.
        </div>
      </footer>
    </section>
  </main>
</body>
</html>`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char] ?? char));
}

async function getInvoicePaymentSettings() {
  if (shouldUsePostgresPayments()) return getProductionPaymentSettings().catch(() => null);
  return getStore().getPaymentSettings();
}

type InvoicePaymentDetails = {
  methodLabel: string;
  statusLabel: string;
  reference: string;
  instructions?: string;
  fields: Array<{ label: string; value: string }>;
  requiresProof: boolean;
};

function resolveInvoicePaymentDetails(
  order: {
    orderNumber: string;
    payment?: {
      id?: string;
      status?: string;
      provider?: string | null;
      method?: string | null;
      manual?: boolean | null;
      proofStatus?: string | null;
      referenceNumber?: string | null;
    } | null;
  },
  settings: PaymentSettings | null,
): InvoicePaymentDetails {
  const payment = order.payment;
  const methodId = (payment?.method || payment?.provider || "").toLowerCase();
  const manualMethod = settings?.manualMethods.find((method) => method.id.toLowerCase() === methodId && method.enabled)
    ?? settings?.manualMethods.find((method) => methodId.includes(method.id.toLowerCase()) && method.enabled)
    ?? null;
  const gateway = settings?.gateways.find((item) => item.id.toLowerCase() === methodId);
  const reference = payment?.referenceNumber || payment?.id || order.orderNumber;
  const fields = manualMethod ? manualMethodFields(manualMethod) : [];

  if (!fields.length && payment?.manual && settings?.bankDetails) {
    for (const [key, value] of Object.entries(settings.bankDetails)) {
      if (value) fields.push({ label: formatBankDetailLabel(key), value: String(value) });
    }
  }

  return {
    methodLabel: manualMethod?.label || gateway?.label || formatMethodLabel(methodId || payment?.provider || "Payment method"),
    statusLabel: formatMethodLabel(payment?.status || "Invoice issued"),
    reference,
    instructions: manualMethod?.instructions,
    fields,
    requiresProof: Boolean(manualMethod?.requiresProof || payment?.manual),
  };
}

function manualMethodFields(method: ManualPaymentMethodConfig) {
  const fields: Array<{ label: string; value: string }> = [];
  if (method.accountName) fields.push({ label: "Account name", value: method.accountName });
  if (method.accountNumber) fields.push({ label: "Account number", value: method.accountNumber });
  if (method.bankName) fields.push({ label: "Bank", value: method.bankName });
  if (method.branch) fields.push({ label: "Branch", value: method.branch });
  if (method.phoneNumber) fields.push({ label: "Phone", value: method.phoneNumber });
  return fields;
}

function renderPaymentDetails(details: InvoicePaymentDetails) {
  const fields = [
    { label: "Payment method", value: details.methodLabel },
    { label: "Payment status", value: details.statusLabel },
    ...(details.reference ? [{ label: "Payment reference", value: details.reference }] : []),
    ...details.fields,
  ];
  const fieldHtml = fields.map((field) => `
    <div class="payment-field">
      <span>${escapeHtml(field.label)}</span>
      <strong>${escapeHtml(field.value)}</strong>
    </div>
  `).join("");
  return `<section class="payment-details">
    <h2>Payment details</h2>
    <p class="lead">Use these details for this invoice. Always include the payment reference so finance can match the payment to the order.</p>
    <div class="payment-grid">${fieldHtml}</div>
    ${details.instructions ? `<p class="instructions">${escapeHtml(details.instructions)}</p>` : ""}
    ${details.requiresProof ? `<p class="proof-note">After payment, upload proof from your order page or My Library order details.</p>` : ""}
  </section>`;
}

function formatMethodLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
