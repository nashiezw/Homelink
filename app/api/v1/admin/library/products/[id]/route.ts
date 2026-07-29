import { requireAdmin, requireAdminAsync } from "@/lib/admin/require-admin";
import { ok, problem } from "@/lib/api/response";
import { isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import { softDeleteLibraryProducts, updateLibraryProduct } from "@/lib/library/repository";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = isPostgresStoreEnabled() ? await requireAdminAsync(request) : requireAdmin(request);
  if (auth.error || !auth.user) return auth.error ?? problem(401, "UNAUTHORIZED", "Admin required.");
  const { id } = await context.params;
  const body = await request.json();
  const product = await updateLibraryProduct(id, body, auth.user.id);
  if (!product) return problem(404, "PRODUCT_NOT_FOUND", "Product not found.");
  return ok({ product });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = isPostgresStoreEnabled() ? await requireAdminAsync(request) : requireAdmin(request);
  if (auth.error || !auth.user) return auth.error ?? problem(401, "UNAUTHORIZED", "Admin required.");
  const { id } = await context.params;
  const count = await softDeleteLibraryProducts([id], auth.user.id);
  if (!count) return problem(404, "PRODUCT_NOT_FOUND", "Product not found.");
  return ok({ count });
}
