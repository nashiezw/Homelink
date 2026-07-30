import { problem } from "@/lib/api/response";
import { getPostgresPublicUserById, shouldUsePostgresAuth } from "@/lib/auth/postgres-auth";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { getLibraryInvoiceForUser, type LibraryShippingAddress } from "@/lib/library/repository";
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
  };
  const html = printableInvoiceHtml({
    invoiceNumber: invoice?.invoiceNumber ?? `HL-LIB-INV-${order.orderNumber}`,
    issuedAt: invoice?.issuedAt ? new Date(invoice.issuedAt).toISOString() : new Date().toISOString(),
    order,
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
  };
  taxTotal: number;
  subtotal: number;
  discountTotal: number;
}) {
  const rows = (input.order.items ?? []).map((item) => `
    <tr>
      <td>
        <strong>${escapeHtml(item.title)}</strong>
        ${item.productType ? `<div class="muted">${escapeHtml(item.productType.replace(/_/g, " "))}</div>` : ""}
      </td>
      <td>${escapeHtml(item.sku)}</td>
      <td>${item.quantity}</td>
      <td>${input.order.currency} ${item.unitPrice.toFixed(2)}</td>
      <td>${input.order.currency} ${item.total.toFixed(2)}</td>
    </tr>
  `).join("");
  const shipping = input.order.shipping;
  const shippingBlock = shipping
    ? `<section class="box">
        <h2>Ship to</h2>
        <p>${escapeHtml(shipping.name)}<br>${escapeHtml(shipping.phone)}<br>${escapeHtml(shipping.line1)}${shipping.line2 ? `<br>${escapeHtml(shipping.line2)}` : ""}<br>${escapeHtml(shipping.city)}${shipping.province ? `, ${escapeHtml(shipping.province)}` : ""}<br>${escapeHtml(shipping.country || "Zimbabwe")}</p>
        ${shipping.notes ? `<p class="muted">Notes: ${escapeHtml(shipping.notes)}</p>` : ""}
      </section>`
    : "";
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(input.invoiceNumber)}</title>
  <style>
    :root { color-scheme: light; }
    body { font-family: Georgia, "Times New Roman", serif; color: #0f172a; margin: 40px; background: #fff; }
    header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #0f172a; padding-bottom: 24px; margin-bottom: 24px; }
    h1 { margin: 0; font-size: 28px; letter-spacing: -0.02em; }
    h2 { margin: 0 0 8px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.08em; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; }
    th, td { border-bottom: 1px solid #e5e7eb; padding: 12px; text-align: left; vertical-align: top; }
    th { font-size: 12px; text-transform: uppercase; color: #64748b; font-family: Arial, sans-serif; }
    .totals { width: 280px; margin-left: auto; margin-top: 24px; }
    .totals div { display: flex; justify-content: space-between; padding: 6px 0; }
    .totals .grand { border-top: 2px solid #0f172a; margin-top: 8px; padding-top: 12px; font-size: 20px; font-weight: 700; }
    .muted { color: #64748b; font-size: 13px; }
    .box { margin-top: 24px; padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px; }
    @media print { body { margin: 16px; } .no-print { display: none; } }
  </style>
</head>
<body>
  <p class="no-print muted">Tip: use your browser Print dialog to save as PDF.</p>
  <header>
    <div>
      <h1>HouseLink Library</h1>
      <p class="muted">${escapeHtml(input.invoiceNumber)}</p>
    </div>
    <div>
      <p><strong>Order:</strong> ${escapeHtml(input.order.orderNumber)}</p>
      <p><strong>Issued:</strong> ${new Date(input.issuedAt).toLocaleDateString()}</p>
    </div>
  </header>
  <p><strong>Bill to:</strong> ${escapeHtml(input.order.customerName)}<br><span class="muted">${escapeHtml(input.order.customerEmail)}</span></p>
  ${shippingBlock}
  <table>
    <thead><tr><th>Item</th><th>SKU</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="totals">
    <div><span>Subtotal</span><span>${input.order.currency} ${input.subtotal.toFixed(2)}</span></div>
    ${input.discountTotal > 0 ? `<div><span>Discount</span><span>−${input.order.currency} ${input.discountTotal.toFixed(2)}</span></div>` : ""}
    ${input.taxTotal > 0 ? `<div><span>Tax</span><span>${input.order.currency} ${input.taxTotal.toFixed(2)}</span></div>` : ""}
    <div class="grand"><span>Total</span><span>${input.order.currency} ${input.order.total.toFixed(2)}</span></div>
  </div>
  <p class="muted" style="margin-top:32px">Thank you for supporting HouseLink Library. Digital access appears in My Library after payment confirmation. Printed orders are fulfilled separately.</p>
</body>
</html>`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char] ?? char));
}
