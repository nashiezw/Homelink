import { requireAdminAsync } from "@/lib/admin/require-admin";
import { ok, problem } from "@/lib/api/response";
import { getAdminBlogDashboard, runAdminBlogAction } from "@/lib/blog/blog-repository";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdminAsync(request, "marketing:write");
  if (auth.error) return auth.error;
  try {
    return ok(await getAdminBlogDashboard());
  } catch (error) {
    console.error("Admin blog dashboard failed", error);
    return problem(500, "BLOG_ADMIN_UNAVAILABLE", "Blog management could not be loaded.");
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdminAsync(request, "marketing:write");
  if (auth.error) return auth.error;
  try {
    const body = await request.json();
    const result = await runAdminBlogAction(body, { id: auth.user.id, name: auth.user.name });
    if (!result) return problem(400, "INVALID_ACTION", "Unknown blog action.");
    revalidatePublicBlog();
    return ok(result);
  } catch (error) {
    console.error("Admin blog action failed", error);
    return problem(400, "BLOG_ACTION_FAILED", error instanceof Error ? error.message : "Blog action could not be completed.");
  }
}

function revalidatePublicBlog() {
  revalidatePath("/blog");
  revalidatePath("/blog/[slug]", "page");
  revalidatePath("/blog/author/[slug]", "page");
  revalidatePath("/blog/category/[slug]", "page");
  revalidatePath("/blog/digest");
  revalidatePath("/blog/hub/[slug]", "page");
  revalidatePath("/blog/questions");
  revalidatePath("/blog/series/[slug]", "page");
}
