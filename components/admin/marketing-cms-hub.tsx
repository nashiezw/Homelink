"use client";

import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Eye,
  Megaphone,
  Pin,
  Plus,
  Save,
  Send,
  Star,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import type { HomepageCmsConfig } from "@/lib/homepage/cms-types";
import type { HomeTestimonial } from "@/lib/homepage/types";
import { cn } from "@/lib/utils";
import { CmsContentHub } from "@/components/admin/cms-content-hub";
import { MarketingEnterpriseHub } from "@/components/admin/marketing-enterprise-hub";

type ListingOption = {
  id: string;
  title: string;
  city: string;
  featured: boolean;
  trustScore: number;
};

type AgentOption = {
  id: string;
  name: string;
  level: string;
  status: string;
  pinned: boolean;
};

type MarketingData = {
  cms: HomepageCmsConfig;
  listings: ListingOption[];
  agents: AgentOption[];
  stats: {
    featuredListings: number;
    pinnedListings: number;
    publishedTestimonials: number;
    activeBanners: number;
  };
};

const TABS = [
  "overview",
  "hero",
  "featured",
  "agents",
  "trust",
  "property-types",
  "testimonials",
  "banners",
  "seo",
  "campaigns",
  "coupons",
  "cms-content",
] as const;

type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  overview: "Overview",
  hero: "Hero & CTAs",
  featured: "Featured listings",
  agents: "Featured agents",
  trust: "Trust metrics",
  "property-types": "Property types",
  testimonials: "Testimonials",
  banners: "Banners",
  seo: "SEO & pages",
  campaigns: "Campaigns",
  coupons: "Coupons & promos",
  "cms-content": "Blog, FAQ & media",
};

export function MarketingCmsHub() {
  const { showToast } = useApp();
  const [tab, setTab] = useState<Tab>("overview");
  const [data, setData] = useState<MarketingData | null>(null);
  const [cms, setCms] = useState<HomepageCmsConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [listingQuery, setListingQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const result = await apiFetch<MarketingData>("/api/v1/admin/homepage");
    if (result.error) setError(result.error.message);
    if (result.data) {
      setData(result.data);
      setCms(result.data.cms);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveCms(partial?: Partial<HomepageCmsConfig>) {
    if (!cms) return;
    setSaving(true);
    const payload = partial ? { ...cms, ...partial } : cms;
    const result = await apiFetch("/api/v1/admin/homepage", {
      method: "PATCH",
      body: JSON.stringify({ cms: payload }),
    });
    setSaving(false);
    if (result.error) showToast("Failed to save.", "error");
    else {
      showToast("Homepage CMS saved.");
      void load();
    }
  }

  async function pinListing(listingId: string, pinned: boolean) {
    const result = await apiFetch("/api/v1/admin/homepage", {
      method: "PATCH",
      body: JSON.stringify({ pinListing: { listingId, pinned } }),
    });
    if (result.error) {
      showToast(result.error.message ?? "Could not update pinned listing.", "error");
      return;
    }
    showToast(pinned ? "Listing pinned." : "Listing unpinned.");
    void load();
  }

  async function featureListing(listingId: string, featured: boolean) {
    const result = await apiFetch("/api/v1/admin/homepage", {
      method: "PATCH",
      body: JSON.stringify({ featureListing: { listingId, featured } }),
    });
    if (result.error) {
      showToast(result.error.message ?? "Could not update featured listing.", "error");
      return;
    }
    showToast(featured ? "Listing featured." : "Listing unfeatured.");
    void load();
  }

  async function pinAgent(profileId: string, pinned: boolean) {
    const result = await apiFetch("/api/v1/admin/homepage", {
      method: "PATCH",
      body: JSON.stringify({ pinAgent: { profileId, pinned } }),
    });
    if (result.error) {
      showToast(result.error.message ?? "Could not update pinned agent.", "error");
      return;
    }
    showToast(pinned ? "Agent pinned." : "Agent unpinned.");
    void load();
  }

  if (error) return <AdminLoadError message={error} onRetry={() => void load()} />;
  if (!data || !cms) return <p className="text-slate-400">Loading marketing CMS...</p>;

  const filteredListings = data.listings.filter(
    (l) =>
      !listingQuery ||
      l.title.toLowerCase().includes(listingQuery.toLowerCase()) ||
      l.city.toLowerCase().includes(listingQuery.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/[0.08] bg-slate-950/70 p-2 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 gap-1 overflow-x-auto rounded-xl bg-black/20 p-1 [scrollbar-width:none]">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition",
                  tab === t ? "bg-emerald-600 text-white shadow-sm shadow-emerald-950/30" : "text-slate-400 hover:bg-white/[0.06] hover:text-white",
                )}
              >
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:shrink-0">
            <Link
              href="/"
              target="_blank"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/10 px-4 text-sm text-slate-300 hover:bg-white/5"
            >
              <ExternalLink className="size-4" />
              Preview homepage
            </Link>
            <Button className="justify-center" onClick={() => void saveCms()} disabled={saving}>
              <Save className="mr-2 size-4" />
              {saving ? "Saving..." : "Save all"}
            </Button>
          </div>
        </div>
      </div>

      {tab === "overview" && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Pinned homepage listings" value={String(data.stats.pinnedListings)} />
          <Metric label="Featured listings (paid)" value={String(data.stats.featuredListings)} />
          <Metric label="Published testimonials" value={String(data.stats.publishedTestimonials)} />
          <Metric label="Active banners" value={String(data.stats.activeBanners)} />
          <div className="sm:col-span-2 xl:col-span-4 rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-5">
            <p className="flex items-center gap-2 font-semibold text-emerald-200">
              <Eye className="size-4" />
              Live preview
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Changes save to the platform store and reflect on the public homepage immediately after you click Save.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
              <PreviewItem label="Hero title" value={`${cms.hero.title} ${cms.hero.titleHighlight}`} />
              <PreviewItem label="Trust metrics shown" value={String(cms.trustMetrics.filter((m) => m.enabled).length)} />
              <PreviewItem label="Property types shown" value={String(cms.propertyTypes.filter((t) => t.enabled).length)} />
              <PreviewItem label="SEO title" value={cms.seo.title} />
            </div>
          </div>
        </div>
      )}

      {tab === "hero" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="Hero section">
            <Field label="Eyebrow" value={cms.hero.eyebrow} onChange={(v) => setCms({ ...cms, hero: { ...cms.hero, eyebrow: v } })} />
            <Field label="Title" value={cms.hero.title} onChange={(v) => setCms({ ...cms, hero: { ...cms.hero, title: v } })} />
            <Field label="Title highlight" value={cms.hero.titleHighlight} onChange={(v) => setCms({ ...cms, hero: { ...cms.hero, titleHighlight: v } })} />
            <TextArea label="Description" value={cms.hero.description} onChange={(v) => setCms({ ...cms, hero: { ...cms.hero, description: v } })} />
            <Field label="Hero image URL" value={cms.hero.imageUrl} onChange={(v) => setCms({ ...cms, hero: { ...cms.hero, imageUrl: v } })} />
            <Field label="Badges (comma-separated)" value={cms.hero.badges.join(", ")} onChange={(v) => setCms({ ...cms, hero: { ...cms.hero, badges: v.split(",").map((s) => s.trim()).filter(Boolean) } })} />
            <Field label="Primary CTA label" value={cms.hero.primaryCta.label} onChange={(v) => setCms({ ...cms, hero: { ...cms.hero, primaryCta: { ...cms.hero.primaryCta, label: v } } })} />
            <Field label="Primary CTA link" value={cms.hero.primaryCta.href} onChange={(v) => setCms({ ...cms, hero: { ...cms.hero, primaryCta: { ...cms.hero.primaryCta, href: v } } })} />
            <Field label="Secondary CTA label" value={cms.hero.secondaryCta.label} onChange={(v) => setCms({ ...cms, hero: { ...cms.hero, secondaryCta: { ...cms.hero.secondaryCta, label: v } } })} />
            <Field label="Secondary CTA link" value={cms.hero.secondaryCta.href} onChange={(v) => setCms({ ...cms, hero: { ...cms.hero, secondaryCta: { ...cms.hero.secondaryCta, href: v } } })} />
          </Section>
          <Section title="Final CTA block">
            <Field label="Eyebrow" value={cms.finalCta.eyebrow} onChange={(v) => setCms({ ...cms, finalCta: { ...cms.finalCta, eyebrow: v } })} />
            <Field label="Title" value={cms.finalCta.title} onChange={(v) => setCms({ ...cms, finalCta: { ...cms.finalCta, title: v } })} />
            <TextArea label="Description" value={cms.finalCta.description} onChange={(v) => setCms({ ...cms, finalCta: { ...cms.finalCta, description: v } })} />
            {cms.finalCta.actions.map((action, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-2">
                <Field label={`Action ${i + 1} label`} value={action.label} onChange={(v) => {
                  const actions = [...cms.finalCta.actions];
                  actions[i] = { ...actions[i], label: v };
                  setCms({ ...cms, finalCta: { ...cms.finalCta, actions } });
                }} />
                <Field label={`Action ${i + 1} link`} value={action.href} onChange={(v) => {
                  const actions = [...cms.finalCta.actions];
                  actions[i] = { ...actions[i], href: v };
                  setCms({ ...cms, finalCta: { ...cms.finalCta, actions } });
                }} />
              </div>
            ))}
          </Section>
          <Section title="Agent promo block" className="lg:col-span-2">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={cms.agentPromo.enabled} onChange={(e) => setCms({ ...cms, agentPromo: { ...cms.agentPromo, enabled: e.target.checked } })} />
              Show agent recruitment promo on homepage
            </label>
            <Field label="Eyebrow" value={cms.agentPromo.eyebrow} onChange={(v) => setCms({ ...cms, agentPromo: { ...cms.agentPromo, eyebrow: v } })} />
            <Field label="Title" value={cms.agentPromo.title} onChange={(v) => setCms({ ...cms, agentPromo: { ...cms.agentPromo, title: v } })} />
            <TextArea label="Description" value={cms.agentPromo.description} onChange={(v) => setCms({ ...cms, agentPromo: { ...cms.agentPromo, description: v } })} />
          </Section>
        </div>
      )}

      {tab === "featured" && (
        <Section title="Pin listings to homepage featured section">
          <input
            className="mb-4 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
            placeholder="Search listings..."
            value={listingQuery}
            onChange={(e) => setListingQuery(e.target.value)}
          />
          <div className="space-y-2 max-h-[32rem] overflow-y-auto">
            {filteredListings.map((listing) => {
              const pinned = cms.featuredListingIds.includes(listing.id);
              return (
                <div key={listing.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-950/50 px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-white">{listing.title}</p>
                    <p className="text-slate-400">{listing.city} - trust {listing.trustScore}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" className="h-9" onClick={() => void featureListing(listing.id, !listing.featured)}>
                      {listing.featured ? "Unfeature" : "Feature"}
                    </Button>
                    <Button className="h-9" onClick={() => void pinListing(listing.id, !pinned)}>
                      <Pin className="mr-1 size-3.5" />
                      {pinned ? "Unpin" : "Pin to homepage"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {tab === "agents" && (
        <Section title="Pin agents to homepage">
          <div className="space-y-2">
            {data.agents.filter((a) => a.status === "ACTIVE").map((agent) => (
              <div key={agent.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-950/50 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-white">{agent.name}</p>
                  <p className="text-slate-400">{agent.level} agent</p>
                </div>
                <Button className="h-9" onClick={() => void pinAgent(agent.id, !agent.pinned)}>
                  <Pin className="mr-1 size-3.5" />
                  {agent.pinned ? "Unpin" : "Pin to homepage"}
                </Button>
              </div>
            ))}
          </div>
        </Section>
      )}

      {tab === "trust" && (
        <Section title="Trust metrics bar">
          <div className="space-y-3">
            {cms.trustMetrics.map((metric, index) => (
              <div key={metric.id} className="grid gap-3 rounded-lg bg-slate-950/50 p-4 sm:grid-cols-4">
                <label className="flex items-center gap-2 text-sm text-white sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={metric.enabled}
                    onChange={(e) => {
                      const trustMetrics = [...cms.trustMetrics];
                      trustMetrics[index] = { ...metric, enabled: e.target.checked };
                      setCms({ ...cms, trustMetrics });
                    }}
                  />
                  {metric.label}
                </label>
                <select
                  className="rounded border border-white/10 bg-slate-900 px-2 py-1.5 text-sm text-white"
                  value={metric.mode}
                  onChange={(e) => {
                    const trustMetrics = [...cms.trustMetrics];
                    trustMetrics[index] = { ...metric, mode: e.target.value as "live" | "manual" };
                    setCms({ ...cms, trustMetrics });
                  }}
                >
                  <option value="live">Live from store</option>
                  <option value="manual">Manual value</option>
                </select>
                {metric.mode === "manual" && (
                  <input
                    type="number"
                    className="rounded border border-white/10 bg-slate-900 px-2 py-1.5 text-sm text-white"
                    value={metric.manualValue ?? 0}
                    onChange={(e) => {
                      const trustMetrics = [...cms.trustMetrics];
                      trustMetrics[index] = { ...metric, manualValue: Number(e.target.value) };
                      setCms({ ...cms, trustMetrics });
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {tab === "property-types" && (
        <Section title="Browse property types grid">
          <div className="space-y-3">
            {cms.propertyTypes.map((type, index) => (
              <div key={type.id} className="grid gap-3 rounded-lg bg-slate-950/50 p-4 sm:grid-cols-4">
                <label className="flex items-center gap-2 text-sm text-white">
                  <input
                    type="checkbox"
                    checked={type.enabled}
                    onChange={(e) => {
                      const propertyTypes = [...cms.propertyTypes];
                      propertyTypes[index] = { ...type, enabled: e.target.checked };
                      setCms({ ...cms, propertyTypes });
                    }}
                  />
                  Show on homepage
                </label>
                <input className="rounded border border-white/10 bg-slate-900 px-2 py-1.5 text-sm text-white" value={type.label} onChange={(e) => {
                  const propertyTypes = [...cms.propertyTypes];
                  propertyTypes[index] = { ...type, label: e.target.value };
                  setCms({ ...cms, propertyTypes });
                }} />
                <select className="rounded border border-white/10 bg-slate-900 px-2 py-1.5 text-sm text-white" value={type.mode} onChange={(e) => {
                  const propertyTypes = [...cms.propertyTypes];
                  propertyTypes[index] = { ...type, mode: e.target.value as "live" | "manual" };
                  setCms({ ...cms, propertyTypes });
                }}>
                  <option value="live">Live count</option>
                  <option value="manual">Manual count</option>
                </select>
                {type.mode === "manual" ? (
                  <input type="number" className="rounded border border-white/10 bg-slate-900 px-2 py-1.5 text-sm text-white" value={type.manualCount ?? 0} onChange={(e) => {
                    const propertyTypes = [...cms.propertyTypes];
                    propertyTypes[index] = { ...type, manualCount: Number(e.target.value) };
                    setCms({ ...cms, propertyTypes });
                  }} />
                ) : (
                  <label className="flex items-center gap-2 text-xs text-slate-400">
                    <input type="checkbox" checked={type.comingSoon} onChange={(e) => {
                      const propertyTypes = [...cms.propertyTypes];
                      propertyTypes[index] = { ...type, comingSoon: e.target.checked };
                      setCms({ ...cms, propertyTypes });
                    }} />
                    Coming soon
                  </label>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {tab === "testimonials" && (
        <Section title="Customer testimonials">
          <div className="mb-4 flex gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                const next: HomeTestimonial = {
                  id: `t_${Date.now()}`,
                  name: "New customer",
                  photoInitial: "N",
                  rating: 5,
                  quote: "",
                  propertyTitle: "",
                  location: "",
                  transactionType: "Rental",
                  date: new Date().toLocaleDateString("en-ZW", { month: "long", year: "numeric" }),
                  published: true,
                };
                setCms({ ...cms, testimonials: [...cms.testimonials, next] });
              }}
            >
              <Plus className="mr-2 size-4" />
              Add testimonial
            </Button>
          </div>
          <div className="space-y-4">
            {cms.testimonials.map((t, index) => (
              <div key={t.id} className="rounded-lg border border-white/5 bg-slate-950/50 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={t.published !== false}
                      onChange={(e) => {
                        const testimonials = [...cms.testimonials];
                        testimonials[index] = { ...t, published: e.target.checked };
                        setCms({ ...cms, testimonials });
                      }}
                    />
                    Published on homepage
                  </label>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="rounded p-1 text-slate-400 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={() => moveTestimonial(cms, setCms, index, -1)}
                      disabled={index === 0}
                      aria-label={`Move ${t.name} testimonial up`}
                    >
                      <ArrowUp className="size-4" />
                    </button>
                    <button
                      type="button"
                      className="rounded p-1 text-slate-400 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={() => moveTestimonial(cms, setCms, index, 1)}
                      disabled={index === cms.testimonials.length - 1}
                      aria-label={`Move ${t.name} testimonial down`}
                    >
                      <ArrowDown className="size-4" />
                    </button>
                    <button
                      type="button"
                      className="rounded p-1 text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
                      onClick={() => setCms({ ...cms, testimonials: cms.testimonials.filter((x) => x.id !== t.id) })}
                      aria-label={`Remove ${t.name} testimonial`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Name" value={t.name} onChange={(v) => updateTestimonial(cms, setCms, index, "name", v)} />
                  <Field label="Location" value={t.location} onChange={(v) => updateTestimonial(cms, setCms, index, "location", v)} />
                  <Field label="Property" value={t.propertyTitle} onChange={(v) => updateTestimonial(cms, setCms, index, "propertyTitle", v)} />
                  <Field label="Date" value={t.date} onChange={(v) => updateTestimonial(cms, setCms, index, "date", v)} />
                  <TextArea label="Quote" value={t.quote} onChange={(v) => updateTestimonial(cms, setCms, index, "quote", v)} className="sm:col-span-2" />
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Star className="size-4 text-amber-400" />
                    <input type="number" min={1} max={5} className="w-16 rounded border border-white/10 bg-slate-900 px-2 py-1 text-white" value={t.rating} onChange={(e) => updateTestimonial(cms, setCms, index, "rating", Number(e.target.value))} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {tab === "banners" && (
        <Section title="Promotional banners">
          <Button variant="secondary" className="mb-4" onClick={() => setCms({
            ...cms,
            banners: [...cms.banners, {
              id: `banner_${Date.now()}`,
              title: "New promotion",
              description: "",
              href: "/search",
              ctaLabel: "Learn more",
              enabled: true,
              placement: "mid",
              tone: "emerald",
            }],
          })}>
            <Plus className="mr-2 size-4" />
            Add banner
          </Button>
          <div className="space-y-4">
            {cms.banners.map((banner, index) => (
              <div key={banner.id} className="rounded-lg bg-slate-950/50 p-4">
                <div className="mb-3 flex justify-between">
                  <label className="flex items-center gap-2 text-sm text-slate-300">
                    <input type="checkbox" checked={banner.enabled} onChange={(e) => {
                      const banners = [...cms.banners];
                      banners[index] = { ...banner, enabled: e.target.checked };
                      setCms({ ...cms, banners });
                    }} />
                    Enabled
                  </label>
                  <button
                    type="button"
                    className="rounded p-1 text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
                    onClick={() => setCms({ ...cms, banners: cms.banners.filter((b) => b.id !== banner.id) })}
                    aria-label={`Remove ${banner.title} banner`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Title" value={banner.title} onChange={(v) => { const banners = [...cms.banners]; banners[index] = { ...banner, title: v }; setCms({ ...cms, banners }); }} />
                  <Field label="CTA label" value={banner.ctaLabel} onChange={(v) => { const banners = [...cms.banners]; banners[index] = { ...banner, ctaLabel: v }; setCms({ ...cms, banners }); }} />
                  <TextArea label="Description" value={banner.description} onChange={(v) => { const banners = [...cms.banners]; banners[index] = { ...banner, description: v }; setCms({ ...cms, banners }); }} className="sm:col-span-2" />
                  <Field label="Link" value={banner.href} onChange={(v) => { const banners = [...cms.banners]; banners[index] = { ...banner, href: v }; setCms({ ...cms, banners }); }} />
                  <select className="rounded border border-white/10 bg-slate-900 px-2 py-2 text-sm text-white" value={banner.placement} onChange={(e) => { const banners = [...cms.banners]; banners[index] = { ...banner, placement: e.target.value as typeof banner.placement }; setCms({ ...cms, banners }); }}>
                    <option value="hero">Below hero</option>
                    <option value="mid">Mid page</option>
                    <option value="footer">Before final CTA</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {tab === "seo" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="SEO & social sharing">
            <Field label="Page title" value={cms.seo.title} onChange={(v) => setCms({ ...cms, seo: { ...cms.seo, title: v } })} />
            <TextArea label="Meta description" value={cms.seo.description} onChange={(v) => setCms({ ...cms, seo: { ...cms.seo, description: v } })} />
            <Field label="Open Graph image URL" value={cms.seo.ogImage} onChange={(v) => setCms({ ...cms, seo: { ...cms.seo, ogImage: v } })} />
          </Section>
          <Section title="Published pages">
            <div className="space-y-2">
              {cms.pages.map((page, index) => (
                <div key={page.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-950/50 px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-white">{page.label}</p>
                    <p className="text-slate-500">{page.path}</p>
                  </div>
                  <select
                    className="rounded border border-white/10 bg-slate-900 px-2 py-1 text-xs text-white"
                    value={page.status}
                    onChange={(e) => {
                      const pages = [...cms.pages];
                      pages[index] = { ...page, status: e.target.value as "published" | "draft" };
                      setCms({ ...cms, pages });
                    }}
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {tab === "campaigns" && (
        <CampaignsPanel showToast={showToast} />
      )}

      {tab === "coupons" && <MarketingEnterpriseHub />}

      {tab === "cms-content" && <CmsContentHub />}
    </div>
  );
}

function AdminLoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
      <p>{message}</p>
      <Button variant="secondary" className="mt-3" onClick={onRetry}>Retry</Button>
    </div>
  );
}

function CampaignsPanel({ showToast }: { showToast: (msg: string, tone?: "info" | "error") => void }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [channel, setChannel] = useState("email");

  async function send() {
    if (!subject.trim() || !body.trim()) {
      showToast("Campaign subject and body are required.", "error");
      return;
    }
    const result = await apiFetch("/api/v1/admin/homepage", {
      method: "PATCH",
      body: JSON.stringify({ broadcast: { channel, subject, body } }),
    });
    if (result.error) showToast("Failed to queue campaign.", "error");
    else {
      showToast("Campaign queued to platform notification system.");
      setSubject("");
      setBody("");
    }
  }

  return (
    <Section title="Broadcast campaign">
      <p className="mb-4 text-sm text-slate-400">
        Queue an announcement through the platform notification system. Use for seasonal promos, new features, or landlord outreach.
      </p>
      <select className="mb-3 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" value={channel} onChange={(e) => setChannel(e.target.value)}>
        <option value="email">Email</option>
        <option value="sms">SMS</option>
        <option value="whatsapp">WhatsApp</option>
        <option value="in_app">In-app</option>
      </select>
      <Field label="Subject" value={subject} onChange={setSubject} />
      <TextArea label="Message body" value={body} onChange={setBody} />
      <Button className="mt-4" onClick={() => void send()}>
        <Send className="mr-2 size-4" />
        Queue broadcast
      </Button>
    </Section>
  );
}

function updateTestimonial(
  cms: HomepageCmsConfig,
  setCms: (c: HomepageCmsConfig) => void,
  index: number,
  field: keyof HomeTestimonial,
  value: string | number,
) {
  const testimonials = [...cms.testimonials];
  testimonials[index] = { ...testimonials[index], [field]: value };
  setCms({ ...cms, testimonials });
}

function moveTestimonial(
  cms: HomepageCmsConfig,
  setCms: (c: HomepageCmsConfig) => void,
  index: number,
  direction: -1 | 1,
) {
  const next = [...cms.testimonials];
  const target = index + direction;
  if (target < 0 || target >= next.length) return;
  [next[index], next[target]] = [next[target], next[index]];
  setCms({ ...cms, testimonials: next });
}

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-white/10 bg-slate-900/60 p-5", className)}>
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
        <Megaphone className="size-4" />
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-sm text-slate-400">
      {label}
      <input
        className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function TextArea({ label, value, onChange, className }: { label: string; value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <label className={cn("block text-sm text-slate-400", className)}>
      {label}
      <textarea
        className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
      <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function PreviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-950/40 px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm text-slate-200">{value}</p>
    </div>
  );
}
