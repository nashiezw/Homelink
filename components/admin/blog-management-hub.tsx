"use client";

import { Archive, BarChart3, CheckCircle2, Copy, Edit, Eye, FileText, Plus, Trash2, Upload } from "lucide-react";
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
  };
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
  const [tab, setTab] = useState<"articles" | "editor" | "categories" | "authors" | "tags" | "layouts" | "analytics" | "ai">("articles");
  const [query, setQuery] = useState("");
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [categoryEdit, setCategoryEdit] = useState<BlogCategory | null>(null);
  const [authorEdit, setAuthorEdit] = useState<BlogAuthor | null>(null);
  const [tagEdit, setTagEdit] = useState<BlogTag | null>(null);
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
    await load();
    return true;
  }

  if (!data) return <p className="text-slate-400">Loading Blog Management...</p>;

  const posts = data.posts.filter((post) => `${post.title} ${post.excerpt} ${post.slug} ${post.category?.name ?? ""} ${post.tags.map((tag) => tag.name).join(" ")}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatPill label="Published" value={data.stats.totalPublished} tone="success" />
        <AdminStatPill label="Drafts" value={data.stats.totalDrafts} tone="warning" />
        <AdminStatPill label="Article views" value={data.stats.totalViews} tone="info" />
        <AdminStatPill label="Categories" value={data.categories.length} />
      </div>

      <AdminTabStrip
        active={tab}
        onChange={(id) => setTab(id as typeof tab)}
        tabs={[
          { id: "articles", label: "Articles", count: data.posts.length },
          { id: "editor", label: "New Article" },
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
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-4">
            <AdminSearchInput value={query} onChange={setQuery} placeholder="Search articles, categories, tags..." className="sm:max-w-md" />
            <Button onClick={() => { setSelectedPost(createBlankPost(data)); setTab("editor"); }}><Plus className="size-4" /> New article</Button>
          </div>
          <AdminDataTable
            rows={posts}
            columns={[
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

      {tab === "categories" && (
        <TaxonomyPanel
          title="Blog categories"
          description="Create, edit, reorder, and retire SEO-friendly category pages."
          rows={data.categories}
          onNew={() => setCategoryEdit({ id: "", name: "", slug: "", description: "", imageUrl: "", seoTitle: "", metaDescription: "", sortOrder: data.categories.length, active: true })}
          onEdit={setCategoryEdit}
          onDelete={(row) => action({ action: "delete_category", categoryId: row.id }, "Category archived.")}
        />
      )}

      {tab === "authors" && (
        <TaxonomyPanel title="Authors" description="Manage article bylines and author information." rows={data.authors} onNew={() => setAuthorEdit({ id: "", name: "", slug: "", role: "", bio: "", avatarUrl: "", email: "", active: true })} onEdit={setAuthorEdit} />
      )}

      {tab === "tags" && (
        <TaxonomyPanel title="Tags" description="Manage article tags for search and internal discovery." rows={data.tags} onNew={() => setTagEdit({ id: "", name: "", slug: "", description: "", active: true })} onEdit={setTagEdit} />
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
    </div>
  );
}

function ArticleEditor({ post, data, busy, onSave }: { post: BlogPost; data: BlogData; busy: boolean; onSave: (post: BlogPost) => Promise<unknown> }) {
  const [form, setForm] = useState(post);
  const inputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useApp();
  async function upload(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    const dataUrl = await readFile(file);
    const result = await apiFetch<{ url: string; size: number }>("/api/v1/uploads", { method: "POST", body: JSON.stringify({ dataUrl, kind: "image", folder: "blog" }) });
    if (result.data) setForm({ ...form, featuredImageUrl: result.data.url, socialImageUrl: form.socialImageUrl || result.data.url });
    else showToast(result.error?.message ?? "Image upload failed.", "error");
  }
  return (
    <section className="rounded-xl border border-white/10 bg-slate-900/60 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">{form.id ? "Edit article" : "Create article"}</h2>
          <p className="mt-1 text-sm text-slate-400">Content is managed here; article design is controlled by the selected global layout.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => inputRef.current?.click()}><Upload className="size-4" /> Upload image</Button>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(event) => void upload(event.target.files)} />
          <Button disabled={busy || !form.title.trim() || !form.excerpt.trim()} onClick={() => onSave(form)}><CheckCircle2 className="size-4" /> Save</Button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
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
          <Field label="Featured image URL" value={form.featuredImageUrl ?? ""} onChange={(featuredImageUrl) => setForm({ ...form, featuredImageUrl })} />
          <Field label="Image alt text" value={form.featuredImageAlt ?? ""} onChange={(featuredImageAlt) => setForm({ ...form, featuredImageAlt })} />
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
      </div>
    </section>
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
              <Button variant="secondary" onClick={() => onChange(blocks.filter((_, i) => i !== index))}><Trash2 className="size-4" /></Button>
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

function TaxonomyPanel({ title, description, rows, onNew, onEdit, onDelete }: { title: string; description: string; rows: any[]; onNew: () => void; onEdit: (row: any) => void; onDelete?: (row: any) => Promise<unknown> }) {
  return (
    <section className="rounded-xl border border-white/10 bg-slate-900/60">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-4">
        <div><h2 className="font-semibold text-white">{title}</h2><p className="mt-1 text-sm text-slate-400">{description}</p></div>
        <Button onClick={onNew}><Plus className="size-4" /> Add</Button>
      </div>
      <AdminDataTable rows={rows} columns={[
        { key: "name", header: "Name", render: (row) => <span className="font-semibold text-white">{row.name}</span> },
        { key: "slug", header: "Slug", render: (row) => <span className="text-sm text-slate-400">/{row.slug}</span> },
        { key: "status", header: "Status", render: (row) => <AdminStatusBadge status={row.active ? "Active" : "Hidden"} variant={row.active ? "success" : "muted"} /> },
        { key: "actions", header: "Actions", render: (row) => <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => onEdit(row)}><Edit className="size-4" /> Edit</Button>{onDelete ? <Button variant="secondary" onClick={() => onDelete(row)}><Archive className="size-4" /> Archive</Button> : null}</div> },
      ]} />
    </section>
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
  useEffect(() => setForm(author), [author]);
  if (!form) return null;
  return <AdminDrawer open title={form.id ? "Edit Author" : "New Author"} onClose={onClose} width="lg"><Field label="Name" value={form.name} onChange={(name) => setForm({ ...form, name, slug: form.slug || slugify(name) })} /><Field label="Slug" value={form.slug} onChange={(slug) => setForm({ ...form, slug: slugify(slug) })} /><Field label="Role" value={form.role ?? ""} onChange={(role) => setForm({ ...form, role })} /><Field label="Email" value={form.email ?? ""} onChange={(email) => setForm({ ...form, email })} /><Field label="Avatar URL" value={form.avatarUrl ?? ""} onChange={(avatarUrl) => setForm({ ...form, avatarUrl })} /><Area label="Bio" value={form.bio ?? ""} onChange={(bio) => setForm({ ...form, bio })} /><Button className="mt-5" disabled={busy || !form.name.trim()} onClick={() => onSave(form)}>Save author</Button></AdminDrawer>;
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
        {checks.map(([label, ok]) => <p key={String(label)} className={ok ? "text-xs text-emerald-300" : "text-xs text-amber-300"}>{ok ? "✓" : "!"} {label}</p>)}
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
