import { ok, problem } from "@/lib/api/response";
import { getLibraryProductBySlug } from "@/lib/library/repository";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const product = await getLibraryProductBySlug(slug);
  if (!product) return problem(404, "PRODUCT_NOT_FOUND", "Library product not found.");
  return ok(product);
}
