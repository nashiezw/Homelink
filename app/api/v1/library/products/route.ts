import { ok } from "@/lib/api/response";
import { listLibraryProducts } from "@/lib/library/repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const products = await listLibraryProducts({
    q: searchParams.get("q") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    author: searchParams.get("author") ?? undefined,
    type: searchParams.get("type") ?? undefined,
    difficulty: searchParams.get("difficulty") ?? undefined,
  });
  return ok(products);
}
