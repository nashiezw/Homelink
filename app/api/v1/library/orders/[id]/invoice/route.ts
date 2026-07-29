import { problem } from "@/lib/api/response";
import { getPostgresPublicUserById, shouldUsePostgresAuth } from "@/lib/auth/postgres-auth";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { getLibraryInvoiceForUser } from "@/lib/library/repository";
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

  const invoice = result.invoice as { invoiceNumber?: string; issuedAt?: Date | string; taxTotal?: unknown } | null;
  const order = result.order;
  const html = printableInvoiceHtml({
    invoiceNumber: invoice?.invoiceNumber ?? `HL-LIB-INV-${order.orderNumber}`,
    issuedAt: invoice?.issuedAt ? new Date(invoice.issuedAt).toISOString() : new Date(order.createdAt).toISOString(),
    order,
    taxTotal: Number(invoice?.taxTotal ?? 0),
  });

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${invoice?.invoiceNumber ?? order.orderNumber}.html"`,
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
    items?: Array<{ title: string; sku: string; quantity: number; unitPrice: number; total: number }>;
  };
  taxTotal: number;
}) {
  const rows = (input.order.items ?? []).map((item) => `
    <tr>
      <td>${escapeHtml(item.title)}</td>
      <td>${escapeHtml(item.sku)}</td>
      <td>${item.quantity}</td>
      <td>${input.order.currency} ${item.unitPrice.toFixed(2)}</td>
      <td>${input.order.currency} ${item.total.toFixed(2)}</td>
    </tr>
  `).join("");
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(input.invoiceNumber)}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #0f172a; margin: 40px; }
    header { display: flex; justify-content: space-between; border-bottom: 1px solid #d1d5db; padding-bottom: 24px; margin-bottom: 24px; }
    h1 { margin: 0; font-size: 28px; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; }
    th, td { border-bottom: 1px solid #e5e7eb; padding: 12px; text-align: left; }
    th { font-size: 12px; text-transform: uppercase; color: #64748b; }
    .total { text-align: right; margin-top: 24px; font-size: 20px; font-weight: 700; }
    .muted { color: #64748b; }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>HouseLink Library Invoice</h1>
      <p class="muted">${escapeHtml(input.invoiceNumber)}</p>
    </div>
    <div>
      <p><strong>Order:</strong> ${escapeHtml(input.order.orderNumber)}</p>
      <p><strong>Issued:</strong> ${new Date(input.issuedAt).toLocaleDateString()}</p>
    </div>
  </header>
  <p><strong>Customer:</strong> ${escapeHtml(input.order.customerName)}<br><span class="muted">${escapeHtml(input.order.customerEmail)}</span></p>
  <table>
    <thead><tr><th>Item</th><th>SKU</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <p class="total">Total: ${input.order.currency} ${input.order.total.toFixed(2)}</p>
  <p class="muted">Tax included/charged: ${input.order.currency} ${input.taxTotal.toFixed(2)}</p>
</body>
</html>`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char] ?? char));
}
