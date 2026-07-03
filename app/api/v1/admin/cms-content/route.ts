import { requireAdmin } from "@/lib/admin/require-admin";
import { ok, problem } from "@/lib/api/response";
import { getStore } from "@/lib/store/app-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = requireAdmin(request, "marketing:write");
  if (auth.error) return auth.error;

  const store = getStore();
  return ok({
    blogPosts: store.listBlogPosts(),
    faqs: store.listCmsFaqs(),
    mediaAssets: store.listMediaAssets(),
  });
}

export async function PATCH(request: Request) {
  const auth = requireAdmin(request, "marketing:write");
  if (auth.error) return auth.error;

  const body = await request.json();
  const store = getStore();
  const { action } = body as { action?: string };

  switch (action) {
    case "upsert_blog": {
      const post = body.post as { title?: string; excerpt?: string; body?: string } | undefined;
      if (!post?.title?.trim()) return problem(400, "TITLE_REQUIRED", "Blog title is required.");
      if (!post.excerpt?.trim()) return problem(400, "EXCERPT_REQUIRED", "Blog excerpt is required.");
      if (!post.body?.trim()) return problem(400, "BODY_REQUIRED", "Blog body is required.");
      return ok({ post: store.upsertBlogPost(body.post) });
    }
    case "remove_blog": {
      const post = store.removeBlogPost(body.postId);
      if (!post) return problem(404, "NOT_FOUND", "Blog post not found.");
      return ok({ post });
    }
    case "upsert_faq": {
      const faq = body.faq as { question?: string; answer?: string } | undefined;
      if (!faq?.question?.trim()) return problem(400, "QUESTION_REQUIRED", "FAQ question is required.");
      if (!faq.answer?.trim()) return problem(400, "ANSWER_REQUIRED", "FAQ answer is required.");
      return ok({ faq: store.upsertCmsFaq(body.faq) });
    }
    case "remove_faq": {
      const faq = store.removeCmsFaq(body.faqId);
      if (!faq) return problem(404, "NOT_FOUND", "FAQ not found.");
      return ok({ faq });
    }
    case "add_media": {
      const asset = body.asset as { name?: string; url?: string; type?: string; sizeKb?: number } | undefined;
      if (!asset?.name?.trim()) return problem(400, "NAME_REQUIRED", "Asset name is required.");
      if (!asset.url?.trim()) return problem(400, "URL_REQUIRED", "Asset URL is required.");
      if (!["image", "video", "document"].includes(asset.type ?? "")) return problem(400, "INVALID_TYPE", "Asset type is not supported.");
      if (!Number.isFinite(Number(asset.sizeKb)) || Number(asset.sizeKb) < 1) return problem(400, "INVALID_SIZE", "Asset size must be at least 1 KB.");
      return ok({ asset: store.addMediaAsset(body.asset) });
    }
    case "remove_media": {
      const asset = store.removeMediaAsset(body.assetId);
      if (!asset) return problem(404, "NOT_FOUND", "Media asset not found.");
      return ok({ asset });
    }
    default:
      return problem(400, "INVALID_ACTION", "Unknown action.");
  }
}
