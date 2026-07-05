"use client";

import { BarChart3, Calendar, Eye, ExternalLink, Home, MessageSquare, Plus, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LandlordEnquiryInbox } from "@/components/landlord/enquiry-inbox";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageShell } from "@/components/layout/page-shell";
import { MarkRentedModal } from "@/components/listings/mark-rented-modal";
import { useApp } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";

type Analytics = {
  totals: { listings: number; views: number; saves: number; enquiries: number };
  listings: Array<{
    id: string;
    slug?: string | null;
    title: string;
    suburb: string;
    city: string;
    views: number;
    saves: number;
    enquiries: number;
    status: string;
    type?: string;
  }>;
};

type HolidayEnquiry = {
  id: string;
  listingTitle: string;
  guestName: string;
  status: string;
  checkIn: string;
  checkOut: string;
  guests: number;
};

export function LandlordDashboardClient() {
  const { user, showToast } = useApp();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [holidayEnquiries, setHolidayEnquiries] = useState<HolidayEnquiry[]>([]);
  const [rentedModal, setRentedModal] = useState<{
    id: string;
    title: string;
    suburb: string;
    city: string;
  } | null>(null);

  async function loadAnalytics() {
    const [analyticsResult, holidayResult] = await Promise.all([
      apiFetch<Analytics>("/api/v1/landlord/analytics"),
      apiFetch<{ enquiries: HolidayEnquiry[] }>("/api/v1/holiday-homes/bookings"),
    ]);
    setAnalytics(analyticsResult.data ?? null);
    setHolidayEnquiries(holidayResult.data?.enquiries ?? []);
  }

  useEffect(() => {
    if (!user) return;
    void loadAnalytics();
  }, [user]);

  async function markRented(listingId: string) {
    const listing = analytics?.listings.find((item) => item.id === listingId);
    if (!listing) return;
    setRentedModal({
      id: listing.id,
      title: listing.title,
      suburb: listing.suburb,
      city: listing.city,
    });
  }

  return (
    <PageShell
      eyebrow="Landlord dashboard"
      title="Manage listings, enquiries, visibility, and trust from one place."
      description="Track what seekers are doing, keep listings fresh, and move serious enquiries toward signed agreements."
      highlights={[
        { value: String(analytics?.totals.listings ?? 0), label: "active listings" },
        { value: String(analytics?.totals.enquiries ?? 0), label: "enquiries" },
        { value: String(analytics?.totals.saves ?? 0), label: "shortlists" },
      ]}
      actions={
        <Link href="/dashboard/landlord/new" className="block w-full sm:w-auto">
          <Button className="w-full sm:w-auto">
            <Plus className="size-4" aria-hidden="true" />
            Add listing
          </Button>
        </Link>
      }
    >
      {!user && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 shadow-sm">
          <Link href="/auth?next=/dashboard/landlord" className="font-semibold underline">
            Sign in
          </Link>{" "}
          with a landlord account to manage listings and enquiries.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Active listings" value={String(analytics?.totals.listings ?? 0)} helper="Visible to seekers" icon={Home} />
        <StatCard label="Views" value={String(analytics?.totals.views ?? 0)} helper="Last 30 days" icon={Eye} />
        <StatCard label="Enquiries" value={String(analytics?.totals.enquiries ?? 0)} helper="HomeLink-managed leads" icon={MessageSquare} />
        <StatCard label="Saved" value={String(analytics?.totals.saves ?? 0)} helper="Shortlisted" icon={TrendingUp} />
      </div>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="surface-panel overflow-hidden rounded-lg">
          <div className="flex flex-col gap-3 border-b border-slate-200 bg-gradient-to-r from-white to-emerald-50 p-5 dark:border-slate-700 dark:from-slate-900 dark:to-emerald-950/20 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-ink dark:text-white">Listing performance</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Keep stale listings moving and promote homes with strong enquiry intent.
              </p>
            </div>
            <Link href="/search?verifiedOnly=true" className="text-sm font-semibold text-emerald-700 hover:underline">
              See marketplace
            </Link>
          </div>

          {(analytics?.listings ?? []).length === 0 ? (
            <div className="p-8 text-center">
              <Home className="mx-auto size-10 text-emerald-700" aria-hidden="true" />
              <p className="mt-4 font-semibold text-ink dark:text-white">No listings yet</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Add your first property and start collecting verified enquiries.</p>
              <Link href="/dashboard/landlord/new" className="mt-4 inline-flex">
                <Button>Add your first listing</Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {(analytics?.listings ?? []).map((listing) => (
                <div key={listing.id} className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-ink dark:text-white">{listing.title}</p>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {listing.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{listing.suburb}, {listing.city}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-sm dark:bg-slate-800">{listing.views} views</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-sm dark:bg-slate-800">{listing.saves} saves</span>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                      {listing.enquiries} enquiries
                    </span>
                    <Link
                      href={`/dashboard/landlord/listings/${listing.id}/edit`}
                      className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-800"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/listings/${listing.slug ?? listing.id}`}
                      className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-800"
                    >
                      <ExternalLink className="size-3.5" />
                      View
                    </Link>
                    {listing.status !== "RENTED" && (
                      <Button variant="secondary" className="h-9" onClick={() => void markRented(listing.id)}>
                        Mark rented
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="h-fit overflow-hidden rounded-lg border border-ocean/20 bg-gradient-to-br from-ocean via-[#0f5364] to-ink text-white shadow-soft">
          <div className="p-6">
            <BarChart3 className="size-7 text-cyan-100" aria-hidden="true" />
            <h2 className="mt-4 text-2xl font-semibold">Upgrade listing momentum</h2>
            <p className="mt-3 text-sm leading-6 text-cyan-50">
              Featured placement and stronger verification help high-intent seekers notice the right homes faster.
            </p>
            <Link href="/payments" className="mt-5 inline-flex">
              <Button>View plans</Button>
            </Link>
          </div>
          <div className="grid gap-px bg-white/10">
            {["Fresh photos", "Verified contact", "Fast response"].map((item) => (
              <div key={item} className="bg-white/8 px-6 py-3 text-sm text-cyan-50">
                {item}
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="mt-6 surface-panel overflow-hidden rounded-lg">
        <div className="border-b border-slate-200 bg-gradient-to-r from-white to-emerald-50 p-5 dark:border-slate-700 dark:from-slate-900 dark:to-emerald-950/20">
          <div className="flex items-center gap-2">
            <MessageSquare className="size-5 text-emerald-600" />
            <h2 className="font-semibold text-ink dark:text-white">Property enquiries</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Enquiries routed through HomeLink. Respond via messages; your assigned agent facilitates viewings.
          </p>
        </div>
        <div className="p-5">
          <LandlordEnquiryInbox />
        </div>
      </section>

      {holidayEnquiries.length > 0 && (
        <section className="mt-6 surface-panel overflow-hidden rounded-lg">
          <div className="border-b border-slate-200 bg-gradient-to-r from-white to-cyan-50 p-5 dark:border-slate-700 dark:from-slate-900 dark:to-cyan-950/20">
            <div className="flex items-center gap-2">
              <Calendar className="size-5 text-emerald-600" />
              <h2 className="font-semibold text-ink dark:text-white">Holiday booking enquiries</h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">Stay requests for your holiday homes.</p>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {holidayEnquiries.map((enquiry) => (
              <div key={enquiry.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div>
                  <p className="font-medium text-ink dark:text-white">{enquiry.listingTitle}</p>
                  <p className="text-sm text-slate-500">
                    {enquiry.guestName} · {enquiry.checkIn} to {enquiry.checkOut} · {enquiry.guests} guests
                  </p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                  {enquiry.status.replace(/_/g, " ")}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {rentedModal && (
        <MarkRentedModal
          listingId={rentedModal.id}
          listingTitle={rentedModal.title}
          defaultSuburb={rentedModal.suburb}
          defaultCity={rentedModal.city}
          onClose={() => setRentedModal(null)}
          onSuccess={() => void loadAnalytics()}
          showToast={showToast}
        />
      )}
    </PageShell>
  );
}
