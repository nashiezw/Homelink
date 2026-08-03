"use client";

import { Archive, BarChart3, CheckCircle2, Copy, Edit, Eye, FileText, Filter, ImagePlus, Layers, MessageSquare, Plus, ShieldCheck, ThumbsDown, ThumbsUp, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AdminDataTable, AdminDrawer, AdminSearchInput, AdminStatPill, AdminStatusBadge, AdminTabStrip } from "@/components/admin/ui/admin-ui";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/providers/app-provider";
import { apiFetch } from "@/lib/api/client";

type BlogData = {
  posts: BlogPost[];
  categories: BlogCategory[];
  authors: BlogAuthor[];
  tags: BlogTag[];
  layouts: Array<{ id: string; label: string; description: string }>;
  stats: {
    totalArticles: number;
    totalPublished: number;
    totalDrafts: number;
    totalScheduled: number;
    totalViews: number;
    averageReadingTime: number;
    mostViewed: BlogPost[];
    recentArticles: BlogPost[];
    popularCategories: Array<{ id: string; name: string; count: number }>;
    activity: Array<{ id: string; title: string; status: string; updatedAt: string }>;
    topDownloads: Array<{ id: string; label: string; url: string; count: number }>;
    mostSearchedKeywords: Array<{ query: string; _count: { query: number } }>;
    commentQueue: number;
    approvedComments: number;
    helpfulVotes: number;
    needsWorkVotes: number;
    readerQuestions: number;
    newReaderQuestions: number;
  };
  comments: BlogComment[];
  feedback: BlogFeedback[];
  readerQuestions: BlogReaderQuestion[];
  contentGaps: BlogContentGap[];
  hubs: Array<{ slug: string; title: string; city: string; category: string; description: string }>;
  series: Array<{ slug: string; title: string; description: string; category: string; posts: readonly string[] }>;
  suggestions: {
    services: Array<{ label: string; url: string }>;
    posts: Array<{ title: string; url: string }>;
    categories: Array<{ title: string; url: string }>;
    listings: Array<{ id: string; title: string; slug: string; city: string; suburb: string; price: unknown; currency: string; bedrooms: number; propertyType: string; media: Array<{ url: string }> }>;
  };
};

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  status: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "UNPUBLISHED" | "ARCHIVED";
  layout: string;
  categoryId?: string | null;
  authorId?: string | null;
  featuredImageUrl?: string | null;
  featuredImageAlt?: string | null;
  socialImageUrl?: string | null;
  contentBlocks: BlogBlock[];
  seoTitle?: string | null;
  metaDescription?: string | null;
  focusKeyword?: string | null;
  secondaryKeywords: string[];
  canonicalUrl?: string | null;
  noIndex: boolean;
  featured: boolean;
  popular: boolean;
  readTimeMinutes: number;
  viewCount: number;
  scheduledAt?: string | null;
  publishedAt?: string | null;
  updatedAt: string;
  category?: BlogCategory | null;
  author?: BlogAuthor | null;
  tags: BlogTag[];
};

type BlogCategory = { id: string; name: string; slug: string; description?: string | null; imageUrl?: string | null; seoTitle?: string | null; metaDescription?: string | null; sortOrder: number; active: boolean };
type BlogAuthor = { id: string; name: string; slug: string; role?: string | null; bio?: string | null; avatarUrl?: string | null; email?: string | null; active: boolean };
type BlogTag = { id: string; name: string; slug: string; description?: string | null; active: boolean };
type BlogBlock = Record<string, any> & { type: string };
type BlogComment = { id: string; postId: string; parentId?: string | null; authorName: string; authorEmail?: string | null; body: string; status: "PENDING" | "APPROVED" | "REJECTED" | "SPAM"; createdAt: string; post?: { title: string; slug: string }; parent?: { authorName: string; body: string } | null };
type BlogFeedback = { id: string; postId: string; vote: "HELPFUL" | "NEEDS_WORK"; note?: string | null; createdAt: string; post?: { title: string; slug: string } };
type BlogReaderQuestion = { id: string; postId?: string | null; name: string; email?: string | null; city?: string | null; question: string; status: "NEW" | "PLANNED" | "ANSWERED" | "ARCHIVED"; adminNote?: string | null; articleSlug?: string | null; createdAt: string; post?: { title: string; slug: string } | null };
type BlogContentGap = { id: string; title: string; slug: string; category: string; words: number; headings: number; downloads: number; helpfulVotes: number; needsWorkVotes: number; readerQuestions: number; issues: string[]; score: number };

const statuses = ["DRAFT", "SCHEDULED", "PUBLISHED", "UNPUBLISHED", "ARCHIVED"] as const;
const blockTypes = ["paragraph", "heading", "list", "image", "gallery", "video", "quote", "info", "table", "download", "button", "propertyCard", "dynamicProperty", "cta"] as const;
const internalLinks = [
  ["/search", "Search properties"],
  ["/rent/harare", "Rental listings"],
  ["/property-for-sale/harare", "Properties for sale"],
  ["/property-management", "Property management"],
  ["/become-agent", "Agent registration"],
  ["/academy", "HouseLink Academy"],
  ["/contact", "Contact / WhatsApp"],
  ["/blog/category/moving-and-relocation", "Moving services resources"],
] as const;

export function BlogManagementHub() {
  const { showToast } = useApp();
  const [data, setData] = useState<BlogData | null>(null);
  const [tab, setTab] = useState<"articles" | "editor" | "comments" | "questions" | "gaps" | "collections" | "categories" | "authors" | "tags" | "layouts" | "analytics" | "ai">("articles");
  const [query, setQuery] = useState("");
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [authorFilter, setAuthorFilter] = useState<string>("ALL");
  const [categoryEdit, setCategoryEdit] = useState<BlogCategory | null>(null);
  const [authorEdit, setAuthorEdit] = useState<BlogAuthor | null>(null);
  const [tagEdit, setTagEdit] = useState<BlogTag | null>(null);
  const [commentEdit, setCommentEdit] = useState<BlogComment | null>(null);
  const [questionEdit, setQuestionEdit] = useState<BlogReaderQuestion | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const result = await apiFetch<BlogData>("/api/v1/admin/blog");
    if (result.data) setData(result.data);
    else showToast(result.error?.message ?? "Blog management could not load.", "error");
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function action(body: Record<string, unknown>, success: string) {
    setBusy(true);
    const result = await apiFetch("/api/v1/admin/blog", { method: "PATCH", body: JSON.stringify(body) });
    setBusy(false);
    if (result.error) {
      showToast(result.error.message, "error");
      return false;
    }
    showToast(success);
    setSelectedPost(null);
    setCategoryEdit(null);
    setAuthorEdit(null);
    setTagEdit(null);
    setCommentEdit(null);
    setQuestionEdit(null);
    setSelectedIds([]);
    await load();
    return true;
  }

  if (!data) return <p className="text-slate-400">Loading Blog Management...</p>;

  const posts = data.posts
    .filter((post) => `${post.title} ${post.excerpt} ${post.slug} ${post.category?.name ?? ""} ${post.author?.name ?? ""} ${post.tags.map((tag) => tag.name).join(" ")}`.toLowerCase().includes(query.toLowerCase()))
    .filter((post) => statusFilter === "ALL" || post.status === statusFilter)
    .filter((post) => categoryFilter === "ALL" || post.categoryId === categoryFilter)
    .filter((post) => authorFilter === "ALL" || post.authorId === authorFilter);
  const tagUsage = countUsage(data.posts.flatMap((post) => post.tags.map((tag) => tag.id)));
  const categoryUsage = countUsage(data.posts.map((post) => post.categoryId).filter(Boolean) as string[]);
  const authorUsage = countUsage(data.posts.map((post) => post.authorId).filter(Boolean) as string[]);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatPill label="Published" value={data.stats.totalPublished} tone="success" />
        <AdminStatPill label="Drafts" value={data.stats.totalDrafts} tone="warning" />
        <AdminStatPill label="Article views" value={data.stats.totalViews} tone="info" />
        <AdminStatPill label="Reader questions" value={data.stats.newReaderQuestions} tone="warning" />
      </div>

      <AdminTabStrip
        active={tab}
        onChange={(id) => setTab(id as typeof tab)}
        tabs={[
          { id: "articles", label: "Articles", count: data.posts.length },
          { id: "editor", label: "New Article" },
          { id: "comments", label: "Comments", count: data.stats.commentQueue },
          { id: "questions", label: "Questions", count: data.stats.newReaderQuestions },
          { id: "gaps", label: "Content Gaps", count: data.contentGaps.length },
          { id: "collections", label: "Hubs & Series" },
          { id: "categories", label: "Categories", count: data.categories.length },
          { id: "authors", label: "Authors", count: data.authors.length },
          { id: "tags", label: "Tags", count: data.tags.length },
          { id: "layouts", label: "Layouts", count: data.layouts.length },
          { id: "analytics", label: "Analytics" },
          { id: "ai", label: "AI Assist" },
        ]}
      />

      {tab === "articles" && (
        <section className="rounded-xl border border-white/10 bg-slate-900/60">
          <div className="space-y-3 border-b border-white/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <AdminSearchInput value={query} onChange={setQuery} placeholder="Search articles, authors, categories, tags..." className="sm:max-w-md" />
              <Button onClick={() => { setSelectedPost(createBlankPost(data)); setTab("editor"); }}><Plus className="size-4" /> New article</Button>
            </div>
            <div className="grid gap-2 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto] lg:items-end">
              <Select label="Status filter" value={statusFilter} options={["ALL", ...statuses]} onChange={setStatusFilter} />
              <Select label="Category filter" value={categoryFilter} options={["ALL", ...data.categories.map((category) => category.id)]} labels={{ ALL: "All categories", ...Object.fromEntries(data.categories.map((category) => [category.id, category.name])) }} onChange={setCategoryFilter} />
              <Select label="Author filter" value={authorFilter} options={["ALL", ...data.authors.map((author) => author.id)]} labels={{ ALL: "All authors", ...Object.fromEntries(data.authors.map((author) => [author.id, author.name])) }} onChange={setAuthorFilter} />
              <Button variant="secondary" onClick={() => { setQuery(""); setStatusFilter("ALL"); setCategoryFilter("ALL"); setAuthorFilter("ALL"); setSelectedIds([]); }}>
                <Filter className="size-4" /> Reset
              </Button>
            </div>
            {selectedIds.length ? (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
                <span className="text-sm font-semibold text-emerald-100">{selectedIds.length} selected</span>
                <Button variant="secondary" onClick={() => void action({ action: "bulk_posts", postIds: selectedIds, status: "PUBLISHED" }, "Selected articles published.")}>Publish</Button>
                <Button variant="secondary" onClick={() => void action({ action: "bulk_posts", postIds: selectedIds, status: "DRAFT" }, "Selected articles moved to draft.")}>Draft</Button>
                <Button variant="secondary" onClick={() => void action({ action: "bulk_posts", postIds: selectedIds, status: "ARCHIVED" }, "Selected articles archived.")}>Archive</Button>
                <Button variant="secondary" onClick={() => {
                  if (window.confirm(`Delete ${selectedIds.length} selected article(s)? This cannot be undone.`)) void action({ action: "bulk_posts", operation: "delete", postIds: selectedIds }, "Selected articles deleted.");
                }}><Trash2 className="size-4" /> Delete</Button>
              </div>
            ) : null}
          </div>
          <AdminDataTable
            rows={posts}
            columns={[
              {
                key: "select",
                header: "Select",
                render: (post) => (
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(post.id)}
                    onChange={(event) => setSelectedIds((current) => event.target.checked ? Array.from(new Set([...current, post.id])) : current.filter((id) => id !== post.id))}
                    aria-label={`Select ${post.title}`}
                  />
                ),
              },
              { key: "article", header: "Article", render: (post) => <ArticleCell post={post} /> },
              { key: "status", header: "Status", render: (post) => <AdminStatusBadge status={post.status} variant={post.status === "PUBLISHED" ? "success" : post.status === "SCHEDULED" ? "info" : post.status === "ARCHIVED" ? "muted" : "warning"} /> },
              { key: "layout", header: "Layout", render: (post) => layoutLabel(data, post.layout) },
              { key: "views", header: "Views", render: (post) => post.viewCount },
              {
                key: "actions",
                header: "Actions",
                render: (post) => (
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/blog/${post.slug}`} target="_blank" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 text-xs font-semibold text-slate-300 hover:bg-white/10"><Eye className="size-3.5" /> Preview</Link>
                    <Button variant="secondary" onClick={() => { setSelectedPost(post); setTab("editor"); }}><Edit className="size-4" /> Edit</Button>
                    <Button variant="secondary" onClick={() => void action({ action: "duplicate_post", postId: post.id }, "Article duplicated.")}><Copy className="size-4" /> Duplicate</Button>
                    <StatusButton post={post} action={action} />
                    <Button variant="secondary" onClick={() => {
                      if (window.confirm(`Delete ${post.title}? This permanently removes the article.`)) void action({ action: "delete_post", postId: post.id }, "Article deleted.");
                    }}><Trash2 className="size-4" /> Delete</Button>
                  </div>
                ),
              },
            ]}
          />
        </section>
      )}

      {tab === "editor" && (
        <ArticleEditor
          busy={busy}
          data={data}
          post={selectedPost ?? createBlankPost(data)}
          onSave={(post) => action({ action: "save_post", post }, post.status === "PUBLISHED" ? "Article published." : "Article saved.")}
        />
      )}

      {tab === "comments" && (
        <BlogCommentsModeration
          comments={data.comments}
          feedback={data.feedback}
          stats={data.stats}
          onAction={action}
          onEdit={setCommentEdit}
        />
      )}

      {tab === "questions" && (
        <ReaderQuestionsPanel questions={data.readerQuestions} posts={data.posts} categories={data.categories} authors={data.authors} onAction={action} onEdit={setQuestionEdit} />
      )}

      {tab === "gaps" && (
        <ContentGapsPanel gaps={data.contentGaps} posts={data.posts} onEdit={(post) => { setSelectedPost(post); setTab("editor"); }} />
      )}

      {tab === "collections" && (
        <BlogCollectionsPanel hubs={data.hubs} series={data.series} />
      )}

      {tab === "categories" && (
        <TaxonomyPanel
          title="Blog categories"
          description="Create, edit, reorder, and retire SEO-friendly category pages."
          rows={data.categories}
          usage={categoryUsage}
          mergeTargets={data.categories}
          onNew={() => setCategoryEdit({ id: "", name: "", slug: "", description: "", imageUrl: "", seoTitle: "", metaDescription: "", sortOrder: data.categories.length, active: true })}
          onEdit={setCategoryEdit}
          onDelete={(row) => action({ action: "delete_category", categoryId: row.id }, "Category archived.")}
          onMerge={(source, targetId) => action({ action: "merge_category", sourceId: source.id, targetId }, "Category merged.")}
        />
      )}

      {tab === "authors" && (
        <TaxonomyPanel title="Authors" description="Manage article bylines and author information." rows={data.authors} usage={authorUsage} onNew={() => setAuthorEdit({ id: "", name: "", slug: "", role: "", bio: "", avatarUrl: "", email: "", active: true })} onEdit={setAuthorEdit} onDelete={(row) => action({ action: "delete_author", authorId: row.id }, "Author archived.")} />
      )}

      {tab === "tags" && (
        <TaxonomyPanel title="Tags" description="Manage article tags for search and internal discovery." rows={data.tags} usage={tagUsage} mergeTargets={data.tags} onNew={() => setTagEdit({ id: "", name: "", slug: "", description: "", active: true })} onEdit={setTagEdit} onDelete={(row) => action({ action: "delete_tag", tagId: row.id }, "Tag archived.")} onMerge={(source, targetId) => action({ action: "merge_tag", sourceId: source.id, targetId }, "Tag merged.")} />
      )}

      {tab === "layouts" && (
        <section className="grid gap-4 md:grid-cols-2">
          {data.layouts.map((layout) => (
            <article key={layout.id} className="rounded-xl border border-white/10 bg-slate-900/60 p-5">
              <FileText className="size-6 text-emerald-400" />
              <h3 className="mt-4 font-semibold text-white">{layout.label}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{layout.description}</p>
              <p className="mt-3 text-xs text-slate-500">Design controlled globally by HouseLink. Admins choose layout, not per-post styling.</p>
            </article>
          ))}
        </section>
      )}

      {tab === "analytics" && (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <AdminStatPill label="Total articles" value={data.stats.totalArticles} />
              <AdminStatPill label="Scheduled" value={data.stats.totalScheduled} tone="info" />
              <AdminStatPill label="Avg read time" value={`${data.stats.averageReadingTime} min`} />
              <AdminStatPill label="Downloads" value={data.stats.topDownloads.reduce((sum, item) => sum + item.count, 0)} tone="success" />
              <AdminStatPill label="Search terms" value={data.stats.mostSearchedKeywords.length} tone="warning" />
            </div>
          </div>
          <AnalyticsCard title="Most viewed" rows={data.stats.mostViewed.map((post) => [post.title, `${post.viewCount} views`])} />
          <AnalyticsCard title="Recent articles" rows={data.stats.recentArticles.map((post) => [post.title, post.status])} />
          <AnalyticsCard title="Popular categories" rows={data.stats.popularCategories.map((cat) => [cat.name, `${cat.count} articles`])} />
          <AnalyticsCard title="Publishing activity" rows={data.stats.activity.map((item) => [item.title, `${item.status} - ${new Date(item.updatedAt).toLocaleDateString("en-ZW")}`])} />
          <AnalyticsCard title="Download counts" rows={data.stats.topDownloads.map((item) => [item.label, `${item.count} downloads`])} />
          <AnalyticsCard title="Internal search terms" rows={data.stats.mostSearchedKeywords.map((item) => [item.query, `${item._count.query} searches`])} />
          <AnalyticsCard title="GA/Search Console readiness" rows={[["Traffic sources", "Ready for GA integration"], ["Top landing pages", "Ready for analytics import"], ["Search Console", "Ready for query import"]]} />
        </section>
      )}

      {tab === "ai" && <AiAssistantPanel data={data} post={selectedPost ?? data.posts[0] ?? createBlankPost(data)} />}

      <CategoryDrawer busy={busy} category={categoryEdit} onClose={() => setCategoryEdit(null)} onSave={(category) => action({ action: "save_category", category }, "Category saved.")} />
      <AuthorDrawer busy={busy} author={authorEdit} onClose={() => setAuthorEdit(null)} onSave={(author) => action({ action: "save_author", author }, "Author saved.")} />
      <TagDrawer busy={busy} tag={tagEdit} onClose={() => setTagEdit(null)} onSave={(tag) => action({ action: "save_tag", tag }, "Tag saved.")} />
      <CommentDrawer busy={busy} comment={commentEdit} onClose={() => setCommentEdit(null)} onSave={(comment) => action({ action: "update_comment", commentId: comment.id, authorName: comment.authorName, authorEmail: comment.authorEmail, body: comment.body, status: comment.status }, "Comment updated.")} onReply={(comment, body) => action({ action: "reply_comment", commentId: comment.id, body }, "Reply published.")} />
      <QuestionDrawer busy={busy} question={questionEdit} posts={data.posts} onClose={() => setQuestionEdit(null)} onSave={(question) => action({ action: "review_reader_question", questionId: question.id, status: question.status, adminNote: question.adminNote, articleSlug: question.articleSlug }, "Question updated.")} />
    </div>
  );
}

function ArticleEditor({ post, data, busy, onSave }: { post: BlogPost; data: BlogData; busy: boolean; onSave: (post: BlogPost) => Promise<unknown> }) {
  const [form, setForm] = useState(post);
  const [preview, setPreview] = useState(true);
  useEffect(() => setForm(post), [post]);
  useEffect(() => {
    if (!form.id && (form.title || form.excerpt || (form.contentBlocks ?? []).some((block) => block.text))) {
      window.localStorage.setItem("houselink_blog_autosave", JSON.stringify({ ...form, updatedAt: new Date().toISOString() }));
    }
  }, [form]);
  const quality = articleQuality(form);
  return (
    <section className="rounded-xl border border-white/10 bg-slate-900/60 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">{form.id ? "Edit article" : "Create article"}</h2>
          <p className="mt-1 text-sm text-slate-400">Content is managed here; article design is controlled by the selected global layout. Drafts autosave locally while you work.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setPreview((current) => !current)}><Eye className="size-4" /> {preview ? "Hide preview" : "Show preview"}</Button>
          <Button disabled={busy || quality.blocking.length > 0} onClick={() => onSave(form)}><CheckCircle2 className="size-4" /> Save</Button>
        </div>
      </div>
      {quality.blocking.length ? (
        <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-100">
          <p className="font-semibold">Publish checklist needs attention</p>
          <div className="mt-2 flex flex-wrap gap-1">{quality.blocking.map((item) => <span key={item} className="rounded-full bg-amber-400/10 px-2 py-1 text-xs font-semibold text-amber-100">{item}</span>)}</div>
        </div>
      ) : null}

      <div className={preview ? "mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem_24rem]" : "mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]"}>
        <div className="space-y-4">
          <Field label="Title" value={form.title} onChange={(title) => setForm({ ...form, title, slug: form.slug || slugify(title) })} />
          <Field label="URL slug" value={form.slug} onChange={(slug) => setForm({ ...form, slug: slugify(slug) })} />
          <Area label="Excerpt" value={form.excerpt} onChange={(excerpt) => setForm({ ...form, excerpt })} />
          <BlockEditor blocks={form.contentBlocks ?? []} suggestions={data.suggestions} onChange={(contentBlocks) => setForm({ ...form, contentBlocks })} />
        </div>
        <aside className="space-y-4">
          <Select label="Status" value={form.status} options={[...statuses]} onChange={(status) => setForm({ ...form, status: status as BlogPost["status"], publishedAt: status === "PUBLISHED" ? new Date().toISOString() : form.publishedAt })} />
          <Select label="Layout" value={form.layout} options={data.layouts.map((layout) => layout.id)} labels={Object.fromEntries(data.layouts.map((layout) => [layout.id, layout.label]))} onChange={(layout) => setForm({ ...form, layout })} />
          <Select label="Category" value={form.categoryId ?? ""} options={["", ...data.categories.map((category) => category.id)]} labels={Object.fromEntries(data.categories.map((category) => [category.id, category.name]))} onChange={(categoryId) => setForm({ ...form, categoryId })} />
          <Select label="Author" value={form.authorId ?? ""} options={["", ...data.authors.map((author) => author.id)]} labels={Object.fromEntries(data.authors.map((author) => [author.id, author.name]))} onChange={(authorId) => setForm({ ...form, authorId })} />
          <Field label="Tags" value={form.tags.map((tag) => tag.name).join(", ")} onChange={(tags) => setForm({ ...form, tags: tags.split(",").map((name) => ({ id: name.trim(), name: name.trim(), slug: slugify(name), active: true })).filter((tag) => tag.name) })} />
          <CoverImagePanel form={form} onChange={setForm} />
          <Field label="SEO title" value={form.seoTitle ?? ""} onChange={(seoTitle) => setForm({ ...form, seoTitle })} />
          <Area label="Meta description" value={form.metaDescription ?? ""} onChange={(metaDescription) => setForm({ ...form, metaDescription })} />
          <Field label="Focus keyword" value={form.focusKeyword ?? ""} onChange={(focusKeyword) => setForm({ ...form, focusKeyword })} />
          <Field label="Secondary keywords" value={form.secondaryKeywords.join(", ")} onChange={(secondaryKeywords) => setForm({ ...form, secondaryKeywords: secondaryKeywords.split(",").map((v) => v.trim()).filter(Boolean) })} />
          <Field label="Canonical URL" value={form.canonicalUrl ?? ""} onChange={(canonicalUrl) => setForm({ ...form, canonicalUrl })} />
          <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> Featured article</label>
          <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={form.popular} onChange={(e) => setForm({ ...form, popular: e.target.checked })} /> Popular article</label>
          <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={form.noIndex} onChange={(e) => setForm({ ...form, noIndex: e.target.checked })} /> No-index</label>
          {form.status === "SCHEDULED" ? <Field label="Scheduled at" type="datetime-local" value={toDateTimeLocal(form.scheduledAt)} onChange={(scheduledAt) => setForm({ ...form, scheduledAt })} /> : null}
          <div className="rounded-lg border border-white/10 bg-slate-950/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Internal links</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {internalLinks.map(([href, label]) => <button key={href} type="button" onClick={() => navigator.clipboard?.writeText(href)} className="rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-300 hover:bg-white/10">{label}</button>)}
            </div>
          </div>
          <EditorQualityPanel post={form} suggestions={data.suggestions} onInsert={(block) => setForm({ ...form, contentBlocks: [...(form.contentBlocks ?? []), block] })} />
        </aside>
        {preview ? <ArticlePreview post={form} data={data} quality={quality} /> : null}
      </div>
    </section>
  );
}

function CoverImagePanel({ form, onChange }: { form: BlogPost; onChange: (post: BlogPost) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { showToast } = useApp();
  const coverUrl = form.featuredImageUrl?.trim();
  const socialUrl = form.socialImageUrl?.trim();

  async function upload(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    const dataUrl = await readFile(file);
    const result = await apiFetch<{ url: string; size: number }>("/api/v1/uploads", { method: "POST", body: JSON.stringify({ dataUrl, kind: "image", folder: "blog" }) });
    setUploading(false);
    if (result.data) {
      onChange({
        ...form,
        featuredImageUrl: result.data.url,
        featuredImageAlt: form.featuredImageAlt || form.title || file.name.replace(/\.[^.]+$/, ""),
        socialImageUrl: form.socialImageUrl || result.data.url,
      });
      showToast("Cover image uploaded.", "success");
    } else {
      showToast(result.error?.message ?? "Image upload failed.", "error");
    }
  }

  return (
    <section className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Cover image</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">Used on blog cards, article hero, and social sharing.</p>
        </div>
        <span className={coverUrl ? "rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-semibold text-emerald-200" : "rounded-full bg-amber-500/15 px-2 py-1 text-xs font-semibold text-amber-200"}>
          {coverUrl ? "Set" : "Missing"}
        </span>
      </div>

      <div className="mt-3 overflow-hidden rounded-lg border border-white/10 bg-slate-900">
        {coverUrl ? (
          <div
            role="img"
            aria-label={form.featuredImageAlt || form.title || "Blog cover preview"}
            className="aspect-[16/9] bg-cover bg-center"
            style={{ backgroundImage: `url("${coverUrl.replace(/"/g, "%22")}")` }}
          />
        ) : (
          <div className="grid aspect-[16/9] place-items-center p-5 text-center">
            <ImagePlus className="mx-auto size-8 text-slate-600" />
            <p className="mt-2 text-sm font-semibold text-slate-300">Upload a distinctive article cover</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">Avoid repeating the same image across multiple articles.</p>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" disabled={uploading} onClick={() => inputRef.current?.click()}>
          <Upload className="size-4" />
          {coverUrl ? "Replace cover" : "Upload cover"}
        </Button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(event) => void upload(event.target.files)} />
        {coverUrl ? (
          <Button variant="secondary" onClick={() => onChange({ ...form, featuredImageUrl: "", socialImageUrl: socialUrl === coverUrl ? "" : form.socialImageUrl })}>
            <Trash2 className="size-4" />
            Remove
          </Button>
        ) : null}
      </div>

      <div className="mt-3 space-y-3">
        <Field label="Cover image URL" value={form.featuredImageUrl ?? ""} onChange={(featuredImageUrl) => onChange({ ...form, featuredImageUrl, socialImageUrl: form.socialImageUrl || featuredImageUrl })} />
        <Field label="Cover alt text" value={form.featuredImageAlt ?? ""} onChange={(featuredImageAlt) => onChange({ ...form, featuredImageAlt })} />
        <Field label="Social share image URL" value={form.socialImageUrl ?? ""} onChange={(socialImageUrl) => onChange({ ...form, socialImageUrl })} />
        {coverUrl && socialUrl !== coverUrl ? (
          <button type="button" onClick={() => onChange({ ...form, socialImageUrl: coverUrl })} className="text-xs font-semibold text-emerald-300 hover:text-emerald-200">
            Use cover image for social sharing
          </button>
        ) : null}
      </div>
    </section>
  );
}

function ArticlePreview({ post, data, quality }: { post: BlogPost; data: BlogData; quality: ReturnType<typeof articleQuality> }) {
  const category = data.categories.find((item) => item.id === post.categoryId);
  const author = data.authors.find((item) => item.id === post.authorId);
  const blocks = post.contentBlocks ?? [];
  return (
    <aside className="space-y-4">
      <section className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Live article preview</p>
        <div className="mt-3 overflow-hidden rounded-lg border border-white/10 bg-slate-900">
          {post.featuredImageUrl ? <div className="aspect-[16/9] bg-cover bg-center" style={{ backgroundImage: `url("${post.featuredImageUrl.replace(/"/g, "%22")}")` }} /> : <div className="grid aspect-[16/9] place-items-center text-sm text-slate-500">No cover image</div>}
          <div className="p-4">
            <p className="text-xs font-semibold uppercase text-emerald-300">{category?.name ?? "Uncategorised"}</p>
            <h3 className="mt-2 text-xl font-bold text-white">{post.title || "Untitled article"}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">{post.excerpt || "Article excerpt will appear here."}</p>
            <p className="mt-3 text-xs text-slate-500">{author?.name ?? "No author"} - {post.readTimeMinutes || estimateReadingMinutes(blocksToPreviewText(blocks))} min read - {post.status}</p>
          </div>
        </div>
      </section>
      <section className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Quality score</p>
        <div className="mt-3 flex items-center gap-3">
          <span className={quality.score >= 85 ? "text-3xl font-bold text-emerald-300" : quality.score >= 65 ? "text-3xl font-bold text-amber-300" : "text-3xl font-bold text-red-300"}>{quality.score}</span>
          <span className="text-sm text-slate-400">/ 100 editorial readiness</span>
        </div>
        <div className="mt-3 space-y-2">
          {quality.items.map((item) => <p key={item.label} className={item.ok ? "text-xs text-emerald-300" : "text-xs text-amber-300"}>{item.ok ? "OK" : "Fix"} - {item.label}</p>)}
        </div>
      </section>
      <section className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Block outline</p>
        <div className="mt-3 space-y-2">
          {blocks.map((block, index) => <p key={index} className="rounded-lg bg-white/5 px-3 py-2 text-xs text-slate-300">{index + 1}. {block.type}{block.text ? ` - ${String(block.text).slice(0, 70)}` : ""}</p>)}
        </div>
      </section>
    </aside>
  );
}

function BlockEditor({ blocks, suggestions, onChange }: { blocks: BlogBlock[]; suggestions: BlogData["suggestions"]; onChange: (blocks: BlogBlock[]) => void }) {
  function update(index: number, next: BlogBlock) {
    onChange(blocks.map((block, i) => i === index ? next : block));
  }
  function add(type: string) {
    onChange([...blocks, defaultBlock(type)]);
  }
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-semibold text-white">Content blocks</p>
        <select onChange={(event) => { add(event.target.value); event.target.value = ""; }} className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white">
          <option value="">Add block</option>
          {blockTypes.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
      </div>
      <div className="mt-4 space-y-3">
        {blocks.map((block, index) => (
          <div key={index} className="rounded-lg border border-white/10 bg-slate-900/70 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="rounded-full bg-white/5 px-2 py-1 text-xs font-semibold text-slate-300">{block.type}</span>
              <div className="flex flex-wrap gap-1">
                <Button variant="secondary" onClick={() => onChange(moveItem(blocks, index, index - 1))} disabled={index === 0}>Up</Button>
                <Button variant="secondary" onClick={() => onChange(moveItem(blocks, index, index + 1))} disabled={index === blocks.length - 1}>Down</Button>
                <Button variant="secondary" onClick={() => onChange([...blocks.slice(0, index + 1), { ...block }, ...blocks.slice(index + 1)])}><Copy className="size-4" /></Button>
                <Button variant="secondary" onClick={() => onChange(blocks.filter((_, i) => i !== index))}><Trash2 className="size-4" /></Button>
              </div>
            </div>
            <BlockFields block={block} onChange={(next) => update(index, next)} />
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-emerald-200">One-click internal inserts</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {suggestions.services.map((item) => <button key={item.url} type="button" onClick={() => onChange([...blocks, { type: "button", label: item.label, url: item.url }])} className="rounded-lg bg-white/10 px-2 py-1 text-xs font-semibold text-white hover:bg-white/15">{item.label}</button>)}
        </div>
      </div>
    </div>
  );
}

function BlockFields({ block, onChange }: { block: BlogBlock; onChange: (block: BlogBlock) => void }) {
  if (block.type === "heading") return <><Select label="Level" value={String(block.level ?? 2)} options={["2", "3"]} onChange={(level) => onChange({ ...block, level: Number(level) })} /><Field label="Heading" value={block.text ?? ""} onChange={(text) => onChange({ ...block, text })} /></>;
  if (["paragraph", "quote"].includes(block.type)) return <Area label="Text" value={block.text ?? ""} onChange={(text) => onChange({ ...block, text })} />;
  if (block.type === "list") return <><label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={Boolean(block.ordered)} onChange={(e) => onChange({ ...block, ordered: e.target.checked })} /> Numbered list</label><Area label="Items, one per line" value={(block.items ?? []).join("\n")} onChange={(text) => onChange({ ...block, items: text.split("\n") })} /></>;
  if (["image", "video", "download", "button"].includes(block.type)) return <><Field label="URL" value={block.url ?? ""} onChange={(url) => onChange({ ...block, url })} /><Field label="Label / alt / title" value={block.label ?? block.alt ?? block.title ?? ""} onChange={(value) => onChange({ ...block, label: value, alt: value, title: value })} /></>;
  if (block.type === "info") return <><Select label="Tone" value={block.tone ?? "info"} options={["info", "warning"]} onChange={(tone) => onChange({ ...block, tone })} /><Field label="Title" value={block.title ?? ""} onChange={(title) => onChange({ ...block, title })} /><Area label="Text" value={block.text ?? ""} onChange={(text) => onChange({ ...block, text })} /></>;
  if (block.type === "cta") return <><Select label="CTA type" value={block.variant ?? "search"} options={["search", "rent", "sale", "list-property", "roommate", "moving", "agent", "whatsapp"]} onChange={(variant) => onChange({ ...block, variant })} /><Field label="Title" value={block.title ?? ""} onChange={(title) => onChange({ ...block, title })} /><Area label="Text" value={block.text ?? ""} onChange={(text) => onChange({ ...block, text })} /></>;
  if (block.type === "propertyCard") return <><Field label="Title" value={block.title ?? ""} onChange={(title) => onChange({ ...block, title })} /><Field label="URL" value={block.url ?? ""} onChange={(url) => onChange({ ...block, url })} /><Field label="Image URL" value={block.imageUrl ?? ""} onChange={(imageUrl) => onChange({ ...block, imageUrl })} /><Field label="Meta" value={block.meta ?? ""} onChange={(meta) => onChange({ ...block, meta })} /></>;
  if (block.type === "dynamicProperty") return <Field label="Listing ID" value={block.listingId ?? ""} onChange={(listingId) => onChange({ ...block, listingId })} />;
  if (block.type === "table") return <><Field label="Headers, comma-separated" value={(block.headers ?? []).join(", ")} onChange={(text) => onChange({ ...block, headers: text.split(",").map((v) => v.trim()) })} /><Area label="Rows, comma-separated cells per line" value={(block.rows ?? []).map((row: string[]) => row.join(", ")).join("\n")} onChange={(text) => onChange({ ...block, rows: text.split("\n").map((row) => row.split(",").map((v) => v.trim())) })} /></>;
  return <Area label="JSON block" value={JSON.stringify(block, null, 2)} onChange={(text) => { try { onChange(JSON.parse(text)); } catch {} }} />;
}

function TaxonomyPanel({
  title,
  description,
  rows,
  usage = {},
  mergeTargets = [],
  onNew,
  onEdit,
  onDelete,
  onMerge,
}: {
  title: string;
  description: string;
  rows: any[];
  usage?: Record<string, number>;
  mergeTargets?: any[];
  onNew: () => void;
  onEdit: (row: any) => void;
  onDelete?: (row: any) => Promise<unknown>;
  onMerge?: (row: any, targetId: string) => Promise<unknown>;
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-slate-900/60">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-4">
        <div><h2 className="font-semibold text-white">{title}</h2><p className="mt-1 text-sm text-slate-400">{description}</p></div>
        <Button onClick={onNew}><Plus className="size-4" /> Add</Button>
      </div>
      <AdminDataTable rows={rows} columns={[
        { key: "name", header: "Name", render: (row) => <span className="font-semibold text-white">{row.name}</span> },
        { key: "slug", header: "Slug", render: (row) => <span className="text-sm text-slate-400">/{row.slug}</span> },
        { key: "usage", header: "Articles", render: (row) => <span className="text-sm font-semibold text-slate-200">{usage[row.id] ?? 0}</span> },
        { key: "status", header: "Status", render: (row) => <AdminStatusBadge status={row.active ? "Active" : "Hidden"} variant={row.active ? "success" : "muted"} /> },
        {
          key: "actions",
          header: "Actions",
          render: (row) => (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => onEdit(row)}><Edit className="size-4" /> Edit</Button>
              {onDelete ? <Button variant="secondary" disabled={!row.active} onClick={() => onDelete(row)}><Archive className="size-4" /> {row.active ? "Archive" : "Archived"}</Button> : null}
              {onMerge ? (
                <Button variant="secondary" onClick={() => {
                  const options = mergeTargets.filter((item) => item.id !== row.id && item.active);
                  const targetSlug = window.prompt(`Merge "${row.name}" into which slug?\n\n${options.map((item) => item.slug).join(", ")}`);
                  const target = options.find((item) => item.slug === targetSlug || item.id === targetSlug);
                  if (target) void onMerge(row, target.id);
                }}><Layers className="size-4" /> Merge</Button>
              ) : null}
            </div>
          ),
        },
      ]} />
    </section>
  );
}

function CommentDrawer({ comment, busy, onClose, onSave, onReply }: { comment: BlogComment | null; busy: boolean; onClose: () => void; onSave: (comment: BlogComment) => Promise<unknown>; onReply: (comment: BlogComment, body: string) => Promise<unknown> }) {
  const [form, setForm] = useState(comment);
  const [reply, setReply] = useState("");
  useEffect(() => { setForm(comment); setReply(""); }, [comment]);
  if (!form) return null;
  return (
    <AdminDrawer open title="Edit Comment" onClose={onClose} width="lg">
      <Field label="Author name" value={form.authorName} onChange={(authorName) => setForm({ ...form, authorName })} />
      <Field label="Author email" value={form.authorEmail ?? ""} onChange={(authorEmail) => setForm({ ...form, authorEmail })} />
      <Select label="Status" value={form.status} options={["PENDING", "APPROVED", "REJECTED", "SPAM"]} onChange={(status) => setForm({ ...form, status: status as BlogComment["status"] })} />
      <Area label="Comment body" value={form.body} onChange={(body) => setForm({ ...form, body })} />
      <div className="mt-5 rounded-xl border border-white/10 bg-slate-950/60 p-4">
        <p className="text-sm font-semibold text-white">Reply as HouseLink</p>
        <Area label="Reply" value={reply} onChange={setReply} />
        <Button className="mt-3" variant="secondary" disabled={busy || !reply.trim()} onClick={() => onReply(form, reply)}>Publish reply</Button>
      </div>
      <Button className="mt-5" disabled={busy || !form.authorName.trim() || !form.body.trim()} onClick={() => onSave(form)}>Save comment</Button>
    </AdminDrawer>
  );
}

function QuestionDrawer({ question, posts, busy, onClose, onSave }: { question: BlogReaderQuestion | null; posts: BlogPost[]; busy: boolean; onClose: () => void; onSave: (question: BlogReaderQuestion) => Promise<unknown> }) {
  const [form, setForm] = useState(question);
  useEffect(() => setForm(question), [question]);
  if (!form) return null;
  return (
    <AdminDrawer open title="Review Reader Question" onClose={onClose} width="lg">
      <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
        <p className="text-sm font-semibold text-white">{form.question}</p>
        <p className="mt-2 text-xs text-slate-500">{form.name}{form.email ? ` - ${form.email}` : ""}{form.city ? ` - ${form.city}` : ""}</p>
      </div>
      <Select label="Status" value={form.status} options={["NEW", "PLANNED", "ANSWERED", "ARCHIVED"]} onChange={(status) => setForm({ ...form, status: status as BlogReaderQuestion["status"] })} />
      <Select label="Linked answer article" value={form.articleSlug ?? ""} options={["", ...posts.map((post) => post.slug)]} labels={Object.fromEntries(posts.map((post) => [post.slug, post.title]))} onChange={(articleSlug) => setForm({ ...form, articleSlug })} />
      <Area label="Admin note" value={form.adminNote ?? ""} onChange={(adminNote) => setForm({ ...form, adminNote })} />
      <Button className="mt-5" disabled={busy} onClick={() => onSave(form)}>Save question</Button>
    </AdminDrawer>
  );
}

function CategoryDrawer({ category, busy, onClose, onSave }: { category: BlogCategory | null; busy: boolean; onClose: () => void; onSave: (category: BlogCategory) => Promise<unknown> }) {
  const [form, setForm] = useState(category);
  useEffect(() => setForm(category), [category]);
  if (!form) return null;
  return <AdminDrawer open title={form.id ? "Edit Category" : "New Category"} onClose={onClose} width="lg"><Field label="Name" value={form.name} onChange={(name) => setForm({ ...form, name, slug: form.slug || slugify(name) })} /><Field label="Slug" value={form.slug} onChange={(slug) => setForm({ ...form, slug: slugify(slug) })} /><Area label="Description" value={form.description ?? ""} onChange={(description) => setForm({ ...form, description })} /><Field label="Category image" value={form.imageUrl ?? ""} onChange={(imageUrl) => setForm({ ...form, imageUrl })} /><Field label="SEO title" value={form.seoTitle ?? ""} onChange={(seoTitle) => setForm({ ...form, seoTitle })} /><Area label="Meta description" value={form.metaDescription ?? ""} onChange={(metaDescription) => setForm({ ...form, metaDescription })} /><Button className="mt-5" disabled={busy || !form.name.trim()} onClick={() => onSave(form)}>Save category</Button></AdminDrawer>;
}

function AuthorDrawer({ author, busy, onClose, onSave }: { author: BlogAuthor | null; busy: boolean; onClose: () => void; onSave: (author: BlogAuthor) => Promise<unknown> }) {
  const [form, setForm] = useState(author);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useApp();
  useEffect(() => setForm(author), [author]);
  if (!form) return null;

  async function uploadAvatar(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      showToast("Use a JPG, PNG, or WebP profile image.", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("Author profile images must be under 5 MB.", "error");
      return;
    }
    setUploading(true);
    const dataUrl = await readFile(file);
    const result = await apiFetch<{ url: string; size: number }>("/api/v1/uploads", {
      method: "POST",
      body: JSON.stringify({ dataUrl, kind: "image", folder: "blog-authors", filename: file.name }),
    });
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    if (result.data?.url) {
      setForm((current) => current ? { ...current, avatarUrl: result.data.url } : current);
      showToast("Author profile image uploaded.", "success");
      return;
    }
    showToast(result.error?.message ?? "Author image upload failed.", "error");
  }

  return (
    <AdminDrawer open title={form.id ? "Edit Author" : "New Author"} onClose={onClose} width="lg">
      <section className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Profile image</p>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <div className="grid size-24 place-items-center overflow-hidden rounded-lg border border-white/10 bg-slate-900">
            {form.avatarUrl ? (
              <div
                role="img"
                aria-label={`${form.name || "Author"} profile image preview`}
                className="size-full bg-cover bg-center"
                style={{ backgroundImage: `url("${form.avatarUrl.replace(/"/g, "%22")}")` }}
              />
            ) : (
              <span className="text-xl font-bold text-emerald-200">{authorInitials(form.name)}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm leading-6 text-slate-400">Upload a square JPG, PNG, or WebP image for the author byline and author page.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="secondary" disabled={busy || uploading} onClick={() => inputRef.current?.click()}>
                <Upload className="size-4" />
                {uploading ? "Uploading..." : form.avatarUrl ? "Replace image" : "Upload image"}
              </Button>
              {form.avatarUrl ? (
                <Button variant="secondary" disabled={busy || uploading} onClick={() => setForm({ ...form, avatarUrl: "" })}>
                  <Trash2 className="size-4" />
                  Remove
                </Button>
              ) : null}
            </div>
          </div>
        </div>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => void uploadAvatar(event.target.files)} />
      </section>
      <Field label="Name" value={form.name} onChange={(name) => setForm({ ...form, name, slug: form.slug || slugify(name) })} />
      <Field label="Slug" value={form.slug} onChange={(slug) => setForm({ ...form, slug: slugify(slug) })} />
      <Field label="Role" value={form.role ?? ""} onChange={(role) => setForm({ ...form, role })} />
      <Field label="Email" value={form.email ?? ""} onChange={(email) => setForm({ ...form, email })} />
      <Field label="Avatar URL" value={form.avatarUrl ?? ""} onChange={(avatarUrl) => setForm({ ...form, avatarUrl })} />
      <Area label="Bio" value={form.bio ?? ""} onChange={(bio) => setForm({ ...form, bio })} />
      <Button className="mt-5" disabled={busy || uploading || !form.name.trim()} onClick={() => onSave(form)}>Save author</Button>
    </AdminDrawer>
  );
}

function TagDrawer({ tag, busy, onClose, onSave }: { tag: BlogTag | null; busy: boolean; onClose: () => void; onSave: (tag: BlogTag) => Promise<unknown> }) {
  const [form, setForm] = useState(tag);
  useEffect(() => setForm(tag), [tag]);
  if (!form) return null;
  return <AdminDrawer open title={form.id ? "Edit Tag" : "New Tag"} onClose={onClose} width="lg"><Field label="Name" value={form.name} onChange={(name) => setForm({ ...form, name, slug: form.slug || slugify(name) })} /><Field label="Slug" value={form.slug} onChange={(slug) => setForm({ ...form, slug: slugify(slug) })} /><Area label="Description" value={form.description ?? ""} onChange={(description) => setForm({ ...form, description })} /><Button className="mt-5" disabled={busy || !form.name.trim()} onClick={() => onSave(form)}>Save tag</Button></AdminDrawer>;
}

function ArticleCell({ post }: { post: BlogPost }) {
  return <div><p className="font-semibold text-white">{post.title}</p><p className="mt-1 text-xs text-slate-500">/{post.slug} - {post.category?.name ?? "Uncategorised"} - {post.author?.name ?? "No author"}</p><div className="mt-2 flex flex-wrap gap-1">{post.featured ? <AdminStatusBadge status="Featured" variant="info" /> : null}{post.popular ? <AdminStatusBadge status="Popular" variant="success" /> : null}</div></div>;
}

function StatusButton({ post, action }: { post: BlogPost; action: (body: Record<string, unknown>, success: string) => Promise<unknown> }) {
  if (post.status === "PUBLISHED") return <Button variant="secondary" onClick={() => action({ action: "status_post", postId: post.id, status: "UNPUBLISHED" }, "Article unpublished.")}>Unpublish</Button>;
  if (post.status === "ARCHIVED") return <Button variant="secondary" onClick={() => action({ action: "status_post", postId: post.id, status: "DRAFT" }, "Article restored to draft.")}>Restore</Button>;
  return <Button variant="secondary" onClick={() => action({ action: "status_post", postId: post.id, status: "PUBLISHED" }, "Article published.")}>Publish</Button>;
}

function AnalyticsCard({ title, rows }: { title: string; rows: string[][] }) {
  return <section className="rounded-xl border border-white/10 bg-slate-900/60 p-5"><BarChart3 className="size-5 text-emerald-400" /><h3 className="mt-3 font-semibold text-white">{title}</h3><div className="mt-4 space-y-2">{rows.length ? rows.map(([label, value]) => <div key={label} className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2 text-sm"><span className="line-clamp-1 text-slate-300">{label}</span><span className="shrink-0 font-semibold text-white">{value}</span></div>) : <p className="text-sm text-slate-500">No data yet.</p>}</div></section>;
}

function BlogCommentsModeration({ comments, feedback, stats, onAction, onEdit }: { comments: BlogComment[]; feedback: BlogFeedback[]; stats: BlogData["stats"]; onAction: (body: Record<string, unknown>, success: string) => Promise<unknown>; onEdit: (comment: BlogComment) => void }) {
  const pending = comments.filter((comment) => comment.status === "PENDING");
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatPill label="Waiting approval" value={stats.commentQueue} tone="warning" />
        <AdminStatPill label="Approved comments" value={stats.approvedComments} tone="success" />
        <AdminStatPill label="Helpful votes" value={stats.helpfulVotes} tone="success" />
        <AdminStatPill label="Needs more detail" value={stats.needsWorkVotes} tone="warning" />
      </div>
      <section className="rounded-xl border border-white/10 bg-slate-900/60">
        <div className="border-b border-white/10 p-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="size-5 text-emerald-400" />
            <h2 className="font-semibold text-white">Comment moderation</h2>
          </div>
          <p className="mt-1 text-sm text-slate-400">Approve useful reader views, reject unhelpful comments, or mark spam before it appears publicly.</p>
        </div>
        <AdminDataTable rows={pending.length ? pending : comments} columns={[
          { key: "comment", header: "Comment", render: (comment) => <CommentModerationCell comment={comment} /> },
          { key: "status", header: "Status", render: (comment) => <AdminStatusBadge status={comment.status} variant={comment.status === "APPROVED" ? "success" : comment.status === "PENDING" ? "warning" : "muted"} /> },
          { key: "date", header: "Date", render: (comment) => new Date(comment.createdAt).toLocaleDateString("en-ZW") },
          {
            key: "actions",
            header: "Actions",
            render: (comment) => (
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => onAction({ action: "moderate_comment", commentId: comment.id, status: "APPROVED" }, "Comment approved.")}><ShieldCheck className="size-4" /> Approve</Button>
                <Button variant="secondary" onClick={() => onEdit(comment)}><Edit className="size-4" /> Edit</Button>
                <Button variant="secondary" onClick={() => onAction({ action: "moderate_comment", commentId: comment.id, status: "REJECTED" }, "Comment rejected.")}>Reject</Button>
                <Button variant="secondary" onClick={() => onAction({ action: "moderate_comment", commentId: comment.id, status: "SPAM" }, "Comment marked as spam.")}>Spam</Button>
                <Button variant="secondary" onClick={() => {
                  if (window.confirm("Delete this comment permanently?")) void onAction({ action: "delete_comment", commentId: comment.id }, "Comment deleted.");
                }}><Trash2 className="size-4" /> Delete</Button>
              </div>
            ),
          },
        ]} />
      </section>
      <section className="rounded-xl border border-white/10 bg-slate-900/60">
        <div className="border-b border-white/10 p-4">
          <div className="flex items-center gap-2">
            <ThumbsUp className="size-5 text-emerald-400" />
            <h2 className="font-semibold text-white">Article feedback</h2>
          </div>
          <p className="mt-1 text-sm text-slate-400">Use these notes to decide which blogs need deeper examples, checklists, or clearer English.</p>
        </div>
        <AdminDataTable rows={feedback} columns={[
          { key: "article", header: "Article", render: (item) => <Link href={`/blog/${item.post?.slug ?? ""}`} target="_blank" className="font-semibold text-white hover:text-emerald-300">{item.post?.title ?? item.postId}</Link> },
          { key: "vote", header: "Vote", render: (item) => <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-200">{item.vote === "HELPFUL" ? <ThumbsUp className="size-4 text-emerald-400" /> : <ThumbsDown className="size-4 text-amber-300" />} {item.vote === "HELPFUL" ? "Helpful" : "Needs detail"}</span> },
          { key: "note", header: "Reader note", render: (item) => <span className="text-sm text-slate-300">{item.note || "-"}</span> },
          { key: "date", header: "Date", render: (item) => new Date(item.createdAt).toLocaleDateString("en-ZW") },
        ]} />
      </section>
    </div>
  );
}

function CommentModerationCell({ comment }: { comment: BlogComment }) {
  return (
    <div>
      <p className="font-semibold text-white">{comment.authorName}</p>
      <p className="mt-1 text-sm leading-6 text-slate-300">{comment.body}</p>
      {comment.parent ? <p className="mt-2 rounded-lg bg-white/5 px-2 py-1 text-xs text-slate-400">Reply to {comment.parent.authorName}: {comment.parent.body}</p> : null}
      <Link href={`/blog/${comment.post?.slug ?? ""}`} target="_blank" className="mt-2 inline-flex text-xs font-semibold text-emerald-300 hover:text-emerald-200">{comment.post?.title ?? comment.postId}</Link>
    </div>
  );
}

function ReaderQuestionsPanel({ questions, posts, categories, authors, onAction, onEdit }: { questions: BlogReaderQuestion[]; posts: BlogPost[]; categories: BlogCategory[]; authors: BlogAuthor[]; onAction: (body: Record<string, unknown>, success: string) => Promise<unknown>; onEdit: (question: BlogReaderQuestion) => void }) {
  return (
    <section className="rounded-xl border border-white/10 bg-slate-900/60">
      <div className="border-b border-white/10 p-4">
        <h2 className="font-semibold text-white">Ask HouseLink queue</h2>
        <p className="mt-1 text-sm text-slate-400">Review reader questions, plan answers, and link answered questions to published articles.</p>
      </div>
      <AdminDataTable rows={questions} columns={[
        { key: "question", header: "Question", render: (item) => <QuestionCell question={item} /> },
        { key: "status", header: "Status", render: (item) => <AdminStatusBadge status={item.status} variant={item.status === "ANSWERED" ? "success" : item.status === "PLANNED" ? "info" : item.status === "ARCHIVED" ? "muted" : "warning"} /> },
        { key: "date", header: "Date", render: (item) => new Date(item.createdAt).toLocaleDateString("en-ZW") },
        {
          key: "actions",
          header: "Actions",
          render: (item) => (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => onEdit(item)}><Edit className="size-4" /> Edit</Button>
              <Button variant="secondary" onClick={() => onAction({ action: "review_reader_question", questionId: item.id, status: "PLANNED", adminNote: item.adminNote }, "Question planned.")}>Plan</Button>
              <Button variant="secondary" onClick={() => {
                const articleSlug = window.prompt("Article slug for this answer?", item.articleSlug ?? "");
                void onAction({ action: "review_reader_question", questionId: item.id, status: "ANSWERED", articleSlug }, "Question marked answered.");
              }}>Answered</Button>
              <Button variant="secondary" onClick={() => {
                const title = window.prompt("Draft article title", item.question);
                if (title) void onAction({ action: "create_post_from_question", questionId: item.id, title, categoryId: categories[0]?.id, authorId: authors[0]?.id }, "Draft article created from question.");
              }}><Plus className="size-4" /> Draft</Button>
              <Button variant="secondary" onClick={() => onAction({ action: "review_reader_question", questionId: item.id, status: "ARCHIVED" }, "Question archived.")}>Archive</Button>
              <Button variant="secondary" onClick={() => {
                if (window.confirm("Delete this reader question permanently?")) void onAction({ action: "delete_reader_question", questionId: item.id }, "Question deleted.");
              }}><Trash2 className="size-4" /> Delete</Button>
            </div>
          ),
        },
      ]} />
      <div className="border-t border-white/10 p-4 text-xs text-slate-500">
        {posts.length} articles available for linking. Use Draft to turn high-value reader questions into planned articles.
      </div>
    </section>
  );
}

function QuestionCell({ question }: { question: BlogReaderQuestion }) {
  return (
    <div>
      <p className="font-semibold text-white">{question.question}</p>
      <p className="mt-1 text-xs text-slate-500">{question.name}{question.city ? ` - ${question.city}` : ""}{question.email ? ` - ${question.email}` : ""}</p>
      {question.post ? <Link href={`/blog/${question.post.slug}`} target="_blank" className="mt-2 inline-flex text-xs font-semibold text-emerald-300 hover:text-emerald-200">Asked from: {question.post.title}</Link> : null}
      {question.articleSlug ? <Link href={`/blog/${question.articleSlug}`} target="_blank" className="ml-0 mt-2 block text-xs font-semibold text-cyan-300 hover:text-cyan-200">Answer: /blog/{question.articleSlug}</Link> : null}
    </div>
  );
}

function ContentGapsPanel({ gaps, posts, onEdit }: { gaps: BlogContentGap[]; posts: BlogPost[]; onEdit: (post: BlogPost) => void }) {
  return (
    <section className="rounded-xl border border-white/10 bg-slate-900/60">
      <div className="border-b border-white/10 p-4">
        <h2 className="font-semibold text-white">Content gaps dashboard</h2>
        <p className="mt-1 text-sm text-slate-400">Prioritise articles that need more depth, clearer headings, checklists, FAQs, or examples.</p>
      </div>
      <AdminDataTable rows={gaps} columns={[
        { key: "article", header: "Article", render: (gap) => <div><Link href={`/blog/${gap.slug}`} target="_blank" className="font-semibold text-white hover:text-emerald-300">{gap.title}</Link><p className="mt-1 text-xs text-slate-500">{gap.category} - score {Math.round(gap.score)}</p></div> },
        { key: "metrics", header: "Metrics", render: (gap) => <span className="text-sm text-slate-300">{gap.words} words - {gap.headings} headings - {gap.downloads} downloads</span> },
        { key: "signals", header: "Reader signals", render: (gap) => <span className="text-sm text-slate-300">{gap.needsWorkVotes} needs detail - {gap.readerQuestions} questions</span> },
        { key: "issues", header: "Recommended fixes", render: (gap) => <div className="flex flex-wrap gap-1">{gap.issues.map((issue) => <span key={issue} className="rounded-full bg-amber-400/10 px-2 py-1 text-xs font-semibold text-amber-200">{issue}</span>)}</div> },
        { key: "actions", header: "Actions", render: (gap) => {
          const post = posts.find((item) => item.id === gap.id);
          return post ? <Button variant="secondary" onClick={() => onEdit(post)}><Edit className="size-4" /> Fix article</Button> : null;
        } },
      ]} />
    </section>
  );
}

function BlogCollectionsPanel({ hubs, series }: { hubs: BlogData["hubs"]; series: BlogData["series"] }) {
  const copyCollections = (payload: unknown) => navigator.clipboard?.writeText(JSON.stringify(payload, null, 2));
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-900/60 p-4">
        <div>
          <h2 className="font-semibold text-white">Hubs and series operations</h2>
          <p className="mt-1 text-sm text-slate-400">Audit topic clusters, open their public pages, and export their configuration for editorial planning.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => copyCollections({ hubs, series })}><Copy className="size-4" /> Copy JSON</Button>
          <Button variant="secondary" onClick={() => copyCollections(series.flatMap((item) => item.posts.map((slug) => ({ series: item.slug, article: slug }))))}><FileText className="size-4" /> Copy article map</Button>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-5">
          <h2 className="font-semibold text-white">City hubs</h2>
          <div className="mt-4 space-y-3">
            {hubs.map((hub) => <CollectionRow key={hub.slug} title={hub.title} href={`/blog/hub/${hub.slug}`} description={hub.description} />)}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-5">
          <h2 className="font-semibold text-white">Article series</h2>
          <div className="mt-4 space-y-3">
            {series.map((item) => <CollectionRow key={item.slug} title={item.title} href={`/blog/series/${item.slug}`} description={`${item.description} ${item.posts.length} linked articles.`} />)}
          </div>
        </div>
      </div>
    </section>
  );
}

function CollectionRow({ title, href, description }: { title: string; href: string; description: string }) {
  return (
    <Link href={href} target="_blank" className="block rounded-lg border border-white/10 p-3 hover:border-emerald-400/50">
      <p className="font-semibold text-white">{title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-400">{description}</p>
      <span className="mt-2 inline-flex text-xs font-semibold text-emerald-300">{href}</span>
    </Link>
  );
}

function EditorQualityPanel({ post, suggestions, onInsert }: { post: BlogPost; suggestions: BlogData["suggestions"]; onInsert: (block: BlogBlock) => void }) {
  const headings = (post.contentBlocks ?? []).filter((block) => block.type === "heading");
  const h2 = headings.filter((block) => Number(block.level) === 2).length;
  const h3 = headings.filter((block) => Number(block.level) === 3).length;
  const missingAlt = !post.featuredImageAlt && Boolean(post.featuredImageUrl);
  const checks = [
    [post.title ? "H1 title ready" : "Missing H1 title", Boolean(post.title)],
    [h2 ? `${h2} H2 heading${h2 === 1 ? "" : "s"}` : "Add at least one H2 heading", h2 > 0],
    [h3 ? `${h3} H3 subsection${h3 === 1 ? "" : "s"}` : "Optional H3 subsections", true],
    [post.metaDescription ? "Meta description ready" : "Missing meta description", Boolean(post.metaDescription)],
    [missingAlt ? "Featured image needs alt text" : "Image alt text ready", !missingAlt],
    [post.focusKeyword ? "Focus keyword set" : "Add focus keyword", Boolean(post.focusKeyword)],
  ];
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/60 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">SEO and quality checks</p>
      <div className="mt-2 space-y-1">
        {checks.map(([label, ok]) => <p key={String(label)} className={ok ? "text-xs text-emerald-300" : "text-xs text-amber-300"}>{ok ? "OK" : "Fix"} - {label}</p>)}
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Smart internal linking</p>
      <div className="mt-2 space-y-2">
        {suggestions.posts.slice(0, 3).map((item) => <InsertButton key={item.url} label={item.title} onClick={() => onInsert({ type: "button", label: item.title, url: item.url })} />)}
        {suggestions.categories.slice(0, 3).map((item) => <InsertButton key={item.url} label={item.title} onClick={() => onInsert({ type: "button", label: item.title, url: item.url })} />)}
        {suggestions.listings.slice(0, 3).map((item) => <InsertButton key={item.id} label={`Property: ${item.title}`} onClick={() => onInsert({ type: "dynamicProperty", listingId: item.id })} />)}
      </div>
    </div>
  );
}

function AiAssistantPanel({ data, post }: { data: BlogData; post: BlogPost }) {
  const outline = [
    `What ${post.title || "this property topic"} means in Zimbabwe`,
    "Key risks, documents, and practical checks",
    "How HouseLink can help with this decision",
    "Next steps for seekers, owners, agents, or investors",
  ];
  const tags = Array.from(new Set([
    ...(post.category?.name ? [post.category.name] : []),
    ...(post.focusKeyword ? [post.focusKeyword] : []),
    "Zimbabwe property",
    "HouseLink",
  ])).filter(Boolean);
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <AiCard title="Suggested outline" rows={outline} />
      <AiCard title="SEO title ideas" rows={[`${post.title || "Property Guide"} | HouseLink Zimbabwe`, `${post.category?.name ?? "Property Advice"} in Zimbabwe: Practical HouseLink Guide`]} />
      <AiCard title="Meta description draft" rows={[post.excerpt || "Practical HouseLink Zimbabwe property advice for safer, clearer decisions."]} />
      <AiCard title="Focus keywords and tags" rows={tags} />
      <AiCard title="Readability improvements" rows={["Use shorter paragraphs under 4 lines.", "Add H2 headings for each major section.", "Add a tip or warning box near risky decisions.", "Add one clear CTA after practical advice."]} />
      <AiCard title="Internal link suggestions" rows={[...data.suggestions.services.slice(0, 5).map((item) => `${item.label}: ${item.url}`), ...data.suggestions.posts.slice(0, 3).map((item) => item.url)]} />
      <AiCard title="FAQ ideas" rows={[`What should I know before ${post.title.toLowerCase() || "making this property decision"}?`, "How can HouseLink help?", "What documents or checks matter most?"]} />
      <AiCard title="Social captions" rows={[`New on HouseLink: ${post.title || "a practical property guide"} for Zimbabwe property decisions.`, `Tenants, landlords, buyers and sellers: save this HouseLink resource before your next property move.`]} />
    </section>
  );
}

function AiCard({ title, rows }: { title: string; rows: string[] }) {
  return <article className="rounded-xl border border-white/10 bg-slate-900/60 p-5"><p className="font-semibold text-white">{title}</p><div className="mt-3 space-y-2">{rows.map((row) => <p key={row} className="rounded-lg bg-white/5 px-3 py-2 text-sm leading-6 text-slate-300">{row}</p>)}</div><p className="mt-3 text-xs text-slate-500">Assistant suggestions only. Nothing is published automatically.</p></article>;
}

function InsertButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="block w-full rounded-lg border border-white/10 px-2 py-1.5 text-left text-xs text-slate-300 hover:bg-white/10">{label}</button>;
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="mt-3 block text-sm font-semibold text-slate-300">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm font-medium text-white outline-none focus:border-emerald-400" /></label>;
}

function Area({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="mt-3 block text-sm font-semibold text-slate-300">{label}<textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm font-medium text-white outline-none focus:border-emerald-400" /></label>;
}

function Select({ label, value, options, labels = {}, onChange }: { label: string; value: string; options: string[]; labels?: Record<string, string>; onChange: (value: string) => void }) {
  return <label className="mt-3 block text-sm font-semibold text-slate-300">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm font-medium text-white outline-none focus:border-emerald-400">{options.map((option) => <option key={option} value={option}>{labels[option] ?? (option || "None")}</option>)}</select></label>;
}

function countUsage(ids: string[]) {
  return ids.reduce<Record<string, number>>((totals, id) => {
    totals[id] = (totals[id] ?? 0) + 1;
    return totals;
  }, {});
}

function moveItem<T>(items: T[], from: number, to: number) {
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function blocksToPreviewText(blocks: BlogBlock[]) {
  return blocks
    .flatMap((block) => {
      if (typeof block.text === "string") return [block.text];
      if (typeof block.title === "string") return [block.title];
      if (Array.isArray(block.items)) return block.items;
      if (Array.isArray(block.rows)) return block.rows.flat();
      return [];
    })
    .filter((value): value is string => typeof value === "string")
    .join(" ");
}

function estimateReadingMinutes(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

function articleQuality(post: BlogPost) {
  const text = blocksToPreviewText(post.contentBlocks ?? []);
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const headings = (post.contentBlocks ?? []).filter((block) => block.type === "heading" && String(block.text ?? "").trim()).length;
  const hasCta = (post.contentBlocks ?? []).some((block) => ["cta", "button", "download"].includes(block.type));
  const hasStructuredHelp = (post.contentBlocks ?? []).some((block) => ["list", "table", "info", "download"].includes(block.type));
  const items = [
    { label: "Title is clear and searchable", ok: post.title.trim().length >= 20 && post.title.trim().length <= 80, blocking: true },
    { label: "Slug is present", ok: Boolean(post.slug.trim()), blocking: true },
    { label: "Excerpt explains the value", ok: post.excerpt.trim().length >= 80 && post.excerpt.trim().length <= 220, blocking: true },
    { label: "Category and author selected", ok: Boolean(post.categoryId && post.authorId), blocking: true },
    { label: "Cover image and alt text ready", ok: Boolean(post.featuredImageUrl && post.featuredImageAlt?.trim()), blocking: false },
    { label: "SEO title and meta description ready", ok: Boolean(post.seoTitle?.trim() && post.metaDescription?.trim()), blocking: false },
    { label: "Focus keyword and secondary keywords set", ok: Boolean(post.focusKeyword?.trim() && post.secondaryKeywords.length), blocking: false },
    { label: "Article has useful depth", ok: wordCount >= 350, blocking: false },
    { label: "At least two meaningful sections", ok: headings >= 2, blocking: false },
    { label: "Includes checklist, table, tip, or download", ok: hasStructuredHelp, blocking: false },
    { label: "Includes a reader action", ok: hasCta, blocking: false },
  ];
  const score = Math.round((items.filter((item) => item.ok).length / items.length) * 100);
  return {
    score,
    items,
    blocking: items.filter((item) => item.blocking && !item.ok).map((item) => item.label),
  };
}

function createBlankPost(data: BlogData): BlogPost {
  return { id: "", title: "", slug: "", excerpt: "", status: "DRAFT", layout: "STANDARD_ARTICLE", categoryId: data.categories[0]?.id, authorId: data.authors[0]?.id, featuredImageUrl: "", featuredImageAlt: "", socialImageUrl: "", contentBlocks: [{ type: "paragraph", text: "" }, { type: "cta", variant: "search" }], seoTitle: "", metaDescription: "", focusKeyword: "", secondaryKeywords: [], canonicalUrl: "", noIndex: false, featured: false, popular: false, readTimeMinutes: 4, viewCount: 0, scheduledAt: "", publishedAt: "", updatedAt: new Date().toISOString(), category: null, author: null, tags: [] };
}

function defaultBlock(type: string): BlogBlock {
  if (type === "heading") return { type, level: 2, text: "" };
  if (type === "list") return { type, ordered: false, items: [""] };
  if (type === "image") return { type, url: "", alt: "" };
  if (type === "gallery") return { type, images: [] };
  if (type === "video") return { type, url: "", title: "" };
  if (type === "quote") return { type, text: "", cite: "" };
  if (type === "info") return { type, tone: "info", title: "", text: "" };
  if (type === "table") return { type, headers: ["Item", "Detail"], rows: [["", ""]] };
  if (type === "download") return { type, label: "Download", url: "" };
  if (type === "button") return { type, label: "Learn more", url: "/search" };
  if (type === "propertyCard") return { type, title: "", url: "/search", imageUrl: "", meta: "" };
  if (type === "dynamicProperty") return { type, listingId: "" };
  if (type === "cta") return { type, variant: "search", title: "", text: "" };
  return { type: "paragraph", text: "" };
}

function layoutLabel(data: BlogData, id: string) {
  return data.layouts.find((layout) => layout.id === id)?.label ?? id;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 96);
}

function authorInitials(name: string) {
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return initials || "HL";
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 16);
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
