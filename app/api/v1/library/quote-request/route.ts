import { created, problem } from "@/lib/api/response";
import { createLibraryBulkQuoteRequest } from "@/lib/library/repository";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: {
    productId?: string;
    email?: string;
    name?: string;
    phone?: string;
    company?: string;
    quantity?: number;
    formatType?: string;
    message?: string;
  };
  try {
    body = await request.json();
  } catch {
    return problem(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const quantity = Math.floor(Number(body.quantity) || 0);
  if (!body.email?.trim() || !body.email.includes("@")) {
    return problem(400, "INVALID_EMAIL", "A valid email is required.");
  }
  if (quantity < 1) {
    return problem(400, "INVALID_QUANTITY", "Quantity must be at least 1.");
  }

  const row = await createLibraryBulkQuoteRequest({
    productId: body.productId,
    email: body.email,
    name: body.name,
    phone: body.phone,
    company: body.company,
    quantity,
    formatType: body.formatType,
    message: body.message,
  });
  if (!row) return problem(500, "QUOTE_FAILED", "Could not submit your quote request.");
  return created({ id: row.id, status: "NEW" });
}
