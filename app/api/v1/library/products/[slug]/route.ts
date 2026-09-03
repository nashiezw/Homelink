import { ok, problem } from "@/lib/api/response";
import { getLibraryProductBySlug, recordLibraryProductView } from "@/lib/library/repository";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const product = await getLibraryProductBySlug(slug);
  if (!product) return problem(404, "PRODUCT_NOT_FOUND", "Library product not found.");
  return ok(product);
}

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const body = await request.json().catch(() => ({}));
  if (body?.action !== "view") return problem(400, "INVALID_LIBRARY_PRODUCT_ACTION", "Unsupported product action.");
  const result = await recordLibraryProductView(slug);
  if (!result) return ok({ tracked: false });
  return ok({ tracked: true, viewCount: result.viewCount });
}
