"use client";

import { BookOpen, ExternalLink, FileQuestion, FileText, ImageIcon, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AdminPanel, AdminTabStrip, AdminStatusBadge } from "@/components/admin/ui/admin-ui";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/providers/app-provider";
import { apiFetch } from "@/lib/api/client";
import { AdminActionDialog, type AdminDialogConfig } from "@/components/admin/action-dialog";
import type { CmsBlogPost, CmsFaq, CmsMediaAsset } from "@/lib/admin/enterprise-types";
import type { LegalPage } from "@/lib/legal-pages/types";

type CmsContentData = {
  blogPosts: CmsBlogPost[];
  faqs: CmsFaq[];
  mediaAssets: CmsMediaAsset[];
  legalPages: LegalPage[];
};

export function CmsContentHub() {
  const { showToast } = useApp();
  const [data, setData] = useState<CmsContentData | null>(null);
  const [tab, setTab] = useState<"blog" | "faq" | "media" | "legal">("blog");
  const [newFaq, setNewFaq] = useState({ question: "", answer: "", category: "General" });
  const [dialog, setDialog] = useState<AdminDialogConfig | null>(null);

  const load = useCallback(async () => {
    const result = await apiFetch<CmsContentData>("/api/v1/admin/cms-content");
    if (result.data) setData(result.data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function action(act: string, payload: Record<string, unknown>) {
    const result = await apiFetch("/api/v1/admin/cms-content", {
      method: "PATCH",
      body: JSON.stringify({ action: act, ...payload }),
    });
    if (result.error) showToast(result.error.message ?? "Failed.", "error");
    else {
      showToast("Saved.");
      void load();
    }
  }

  function createPost() {
    setDialog({
      title: "Create blog post",
      message: "Add the real post details. It will be saved as a draft until you publish it.",
      tone: "info",
      confirmLabel: "Create draft",
      fields: [
        { name: "title", label: "Title", required: true },
        { name: "excerpt", label: "Excerpt", type: "textarea", required: true },
        { name: "body", label: "Body", type: "textarea", required: true },
      ],
      onConfirm: (values) =>
        action("upsert_blog", {
          post: { title: values.title, excerpt: values.excerpt, body: values.body, status: "draft" },
        }),
    });
  }

  function editPost(post: CmsBlogPost) {
    setDialog({
      title: "Edit blog post",
      message: "Update this article. Published posts update on the public site after saving.",
      tone: "info",
      confirmLabel: "Save post",
      fields: [
        { name: "title", label: "Title", defaultValue: post.title, required: true },
        { name: "excerpt", label: "Excerpt", type: "textarea", defaultValue: post.excerpt, required: true },
        { name: "body", label: "Body", type: "textarea", defaultValue: post.body, required: true },
      ],
      onConfirm: (values) =>
        action("upsert_blog", {
          post: { ...post, title: values.title, excerpt: values.excerpt, body: values.body },
        }),
    });
  }

  function confirmRemove(actionName: "remove_blog" | "remove_faq" | "remove_media", id: string, label: string) {
    setDialog({
      title: `Remove ${label}`,
      message: `This removes the ${label} from the CMS library. Continue only if it should no longer be available.`,
      tone: "warning",
      confirmLabel: "Remove",
      onConfirm: () => {
        const key = actionName === "remove_blog" ? "postId" : actionName === "remove_faq" ? "faqId" : "assetId";
        return action(actionName, { [key]: id });
      },
    });
  }

  function addMediaAsset() {
    setDialog({
      title: "Add media asset",
      message: "Register a real CMS asset URL and metadata. Use an uploaded asset URL or verified public path.",
      tone: "info",
      confirmLabel: "Add asset",
      fields: [
        { name: "name", label: "Asset name", required: true },
        { name: "url", label: "Asset URL", required: true, placeholder: "/images/example.jpg" },
        {
          name: "type",
          label: "Asset type",
          type: "select",
          defaultValue: "image",
          required: true,
          options: [
            { label: "Image", value: "image" },
            { label: "Video", value: "video" },
            { label: "Document", value: "document" },
          ],
        },
        { name: "sizeKb", label: "Size (KB)", type: "number", defaultValue: 100, required: true, min: 1 },
        { name: "tags", label: "Tags", placeholder: "homepage, hero, campaign" },
      ],
      onConfirm: (values) =>
        action("add_media", {
          asset: {
            name: values.name,
            url: values.url,
            type: values.type,
            sizeKb: Number(values.sizeKb),
            tags: values.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
          },
        }),
    });
  }

  function editLegalPage(page: LegalPage) {
    setDialog({
      title: `Edit ${page.id === "terms" ? "terms" : "privacy"} page`,
      message: "Update the public legal page. Published changes appear on the website after saving.",
      tone: "info",
      confirmLabel: "Save page",
      fields: [
        { name: "title", label: "Title", defaultValue: page.title, required: true },
        { name: "summary", label: "Summary", type: "textarea", defaultValue: page.summary, required: true },
        { name: "body", label: "Body", type: "textarea", defaultValue: page.body, required: true },
        { name: "effectiveDate", label: "Effective date", type: "date", defaultValue: page.effectiveDate, required: true },
        {
          name: "status",
          label: "Status",
          type: "select",
          defaultValue: page.status,
          required: true,
          options: [
            { label: "Published", value: "published" },
            { label: "Draft", value: "draft" },
          ],
        },
      ],
      onConfirm: (values) =>
        action("upsert_legal_page", {
          page: {
            ...page,
            title: values.title,
            summary: values.summary,
            body: values.body,
            effectiveDate: values.effectiveDate,
            status: values.status,
          },
        }),
    });
  }

  if (!data) return <p className="text-slate-400">Loading CMS content...</p>;

  return (
    <div className="space-y-6">
      <AdminActionDialog config={dialog} onClose={() => setDialog(null)} />
      <AdminTabStrip
        active={tab}
        onChange={(id) => setTab(id as typeof tab)}
        tabs={[
          { id: "blog", label: "Blog", count: data.blogPosts.length },
          { id: "faq", label: "FAQ", count: data.faqs.length },
          { id: "media", label: "Media library", count: data.mediaAssets.length },
          { id: "legal", label: "Legal", count: data.legalPages.length },
        ]}
      />

      {tab === "blog" && (
        <AdminPanel title="Blog posts" description="Publish guides and market insights without code">
          <div className="mb-4">
            <Button onClick={createPost}>
              <Plus className="size-4" /> New post
            </Button>
          </div>
          <div className="space-y-3">
            {data.blogPosts.map((post) => (
              <article key={post.id} className="rounded-xl border border-white/[0.06] bg-slate-950/50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex gap-3">
                    <BookOpen className="mt-1 size-5 text-cyan-400" />
                    <div>
                      <p className="font-semibold text-white">{post.title}</p>
                      <p className="text-xs text-slate-500">/{post.slug} · {post.author}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-400">{post.excerpt}</p>
                    </div>
                  </div>
                  <AdminStatusBadge status={post.status} variant={post.status === "published" ? "success" : "muted"} />
                </div>
                <div className="mt-3 flex gap-2">
                  <Button variant="secondary" onClick={() => editPost(post)}>Edit</Button>
                  {post.status === "draft" ? (
                    <Button variant="secondary" onClick={() => void action("upsert_blog", { post: { ...post, status: "published", publishedAt: new Date().toISOString() } })}>Publish</Button>
                  ) : (
                    <Button variant="secondary" onClick={() => void action("upsert_blog", { post: { ...post, status: "draft" } })}>Unpublish</Button>
                  )}
                  <Button variant="secondary" onClick={() => confirmRemove("remove_blog", post.id, "blog post")}>
                    <Trash2 className="size-4" /> Remove
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </AdminPanel>
      )}

      {tab === "faq" && (
        <AdminPanel title="FAQ management" description="Help centre content by category">
          <div className="mb-4 grid gap-2 sm:grid-cols-3">
            <input value={newFaq.question} onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })} placeholder="Question" className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white sm:col-span-3" />
            <textarea value={newFaq.answer} onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })} placeholder="Answer" rows={2} className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white sm:col-span-3" />
            <input value={newFaq.category} onChange={(e) => setNewFaq({ ...newFaq, category: e.target.value })} placeholder="Category" className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white sm:col-span-2" />
            <Button
              onClick={() => void action("upsert_faq", { faq: newFaq }).then(() => setNewFaq({ question: "", answer: "", category: "General" }))}
              disabled={!newFaq.question.trim() || !newFaq.answer.trim()}
            >
              <Plus className="size-4" /> Add FAQ
            </Button>
          </div>
          {data.faqs.map((faq) => (
            <div key={faq.id} className="mb-3 rounded-xl border border-white/[0.06] bg-slate-950/50 p-4">
              <div className="flex flex-wrap gap-2">
                <FileQuestion className="size-4 shrink-0 text-emerald-400" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-white">{faq.question}</p>
                  <p className="mt-1 text-sm text-slate-400">{faq.answer}</p>
                  <p className="mt-1 text-xs text-slate-600">{faq.category}</p>
                </div>
                <div className="ml-auto flex flex-wrap gap-2">
                  <AdminStatusBadge status={faq.published ? "published" : "draft"} variant={faq.published ? "success" : "muted"} />
                  <Button variant="secondary" onClick={() => void action("upsert_faq", { faq: { ...faq, published: !faq.published } })}>
                    {faq.published ? "Unpublish" : "Publish"}
                  </Button>
                  <Button variant="secondary" onClick={() => confirmRemove("remove_faq", faq.id, "FAQ")}>
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </AdminPanel>
      )}

      {tab === "media" && (
        <AdminPanel title="Media library" description="Images, videos, and documents for CMS">
          <Button
            className="mb-4"
            onClick={addMediaAsset}
          >
            <Plus className="size-4" /> Add asset
          </Button>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.mediaAssets.map((m) => (
              <div key={m.id} className="rounded-xl border border-white/[0.06] bg-slate-950/50 p-4">
                <ImageIcon className="mb-2 size-8 text-slate-500" />
                <p className="truncate font-medium text-white">{m.name}</p>
                <p className="text-xs text-slate-500">{m.type} · {m.sizeKb} KB</p>
                <p className="text-xs text-cyan-400 truncate">{m.url}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a href={m.url} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 px-3 text-xs text-slate-200 hover:bg-white/5">
                    <ExternalLink className="size-3.5" /> Open
                  </a>
                  <Button variant="secondary" onClick={() => confirmRemove("remove_media", m.id, "media asset")}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </AdminPanel>
      )}

      {tab === "legal" && (
        <AdminPanel title="Legal pages" description="Edit public Terms and Privacy pages">
          <div className="grid gap-3 md:grid-cols-2">
            {data.legalPages.map((page) => (
              <article key={page.id} className="rounded-xl border border-white/[0.06] bg-slate-950/50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 gap-3">
                    <FileText className="mt-1 size-5 shrink-0 text-emerald-400" />
                    <div className="min-w-0">
                      <p className="font-semibold text-white">{page.title}</p>
                      <p className="mt-1 text-xs text-slate-500">/{page.id} - effective {page.effectiveDate}</p>
                      <p className="mt-2 line-clamp-3 text-sm text-slate-400">{page.summary}</p>
                    </div>
                  </div>
                  <AdminStatusBadge status={page.status} variant={page.status === "published" ? "success" : "muted"} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => editLegalPage(page)}>Edit</Button>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      void action("upsert_legal_page", {
                        page: { ...page, status: page.status === "published" ? "draft" : "published" },
                      })
                    }
                  >
                    {page.status === "published" ? "Unpublish" : "Publish"}
                  </Button>
                  <a href={`/${page.id}`} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 px-3 text-xs text-slate-200 hover:bg-white/5">
                    <ExternalLink className="size-3.5" /> View
                  </a>
                </div>
              </article>
            ))}
          </div>
        </AdminPanel>
      )}
    </div>
  );
}
