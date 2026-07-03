"use client";

import { Calendar, ChevronRight, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { EnquiryStatusBadge } from "@/components/enquiries/enquiry-status-badge";
import { PageShell } from "@/components/layout/page-shell";
import { useApp } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { ENQUIRY_STATUS_LABELS, ENQUIRY_TYPE_LABELS } from "@/lib/enquiries/labels";
import type { PropertyEnquiry } from "@/lib/enquiries/types";
import { apiFetch } from "@/lib/api/client";

const SUBJECT_LABELS = {
  LISTING: "Property",
  ROOMMATE: "Roommate",
  HOLIDAY: "Holiday home",
} as const;

export function MyEnquiriesPageClient() {
  const { user } = useApp();
  const [enquiries, setEnquiries] = useState<PropertyEnquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PropertyEnquiry | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await apiFetch<{ enquiries: PropertyEnquiry[] }>("/api/v1/enquiries");
    setEnquiries(result.data?.enquiries ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) void load();
    else setLoading(false);
  }, [user, load]);

  if (!user) {
    return (
      <PageShell eyebrow="My enquiries" title="Track your property enquiries" description="Sign in to see enquiry status and messages.">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          <Link href="/auth?next=/enquiries" className="font-semibold underline">
            Sign in
          </Link>{" "}
          to view enquiries managed by HomeLink consultants.
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow="My enquiries"
      title="Your HomeLink enquiries"
      description="Every enquiry is professionally managed by our property consultants — from first contact to viewing, offer, and completion."
      actions={
        <Link href="/messages">
          <Button variant="secondary">
            <MessageCircle className="size-4" />
            Messages
          </Button>
        </Link>
      }
    >
      {loading ? (
        <p className="text-sm text-slate-500">Loading your enquiries...</p>
      ) : enquiries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center dark:border-slate-700">
          <p className="font-semibold text-ink dark:text-white">No enquiries yet</p>
          <p className="mt-2 text-sm text-slate-500">Browse properties or roommate profiles and submit an enquiry through HomeLink.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/search"><Button>Browse properties</Button></Link>
            <Link href="/roommates"><Button variant="secondary">Find roommates</Button></Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-3">
            {enquiries.map((enquiry) => (
              <button
                key={enquiry.id}
                type="button"
                onClick={() => setSelected(enquiry)}
                className={`w-full rounded-xl border p-5 text-left transition ${
                  selected?.id === enquiry.id
                    ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20"
                    : "border-slate-200 bg-white hover:border-emerald-200 dark:border-slate-700 dark:bg-slate-900"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                      {SUBJECT_LABELS[enquiry.subjectType] ?? enquiry.subjectType}
                    </p>
                    <p className="mt-1 font-semibold text-ink dark:text-white">{enquiry.listingTitle}</p>
                  </div>
                  <EnquiryStatusBadge status={enquiry.status} />
                </div>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 line-clamp-2">{enquiry.message}</p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                  <span>{ENQUIRY_TYPE_LABELS[enquiry.enquiryType]}</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3" />
                    {new Date(enquiry.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {selected && (
            <aside className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900 lg:sticky lg:top-4 lg:self-start">
              <h3 className="font-semibold text-ink dark:text-white">Enquiry progress</h3>
              <p className="mt-1 text-sm text-slate-500">{selected.listingTitle}</p>
              <div className="mt-4">
                <EnquiryStatusBadge status={selected.status} />
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                  {ENQUIRY_STATUS_LABELS[selected.status] ?? selected.status}
                </p>
              </div>

              {selected.assignedAgentName && (
                <p className="mt-4 text-sm">
                  <span className="text-slate-500">Your consultant:</span>{" "}
                  <span className="font-medium">{selected.assignedAgentName}</span>
                </p>
              )}

              {selected.viewings[0] && (
                <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
                  <p className="font-semibold">Viewing scheduled</p>
                  <p className="mt-1">{new Date(selected.viewings[0].scheduledAt).toLocaleString()}</p>
                  <p className="mt-1 text-emerald-800/80">{selected.viewings[0].location}</p>
                </div>
              )}

              {selected.checkIn && selected.checkOut && (
                <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800">
                  <p className="font-semibold">Stay dates</p>
                  <p className="mt-1">{selected.checkIn} → {selected.checkOut}</p>
                  {selected.guests ? <p>{selected.guests} guests</p> : null}
                </div>
              )}

              <div className="mt-5 max-h-48 space-y-2 overflow-y-auto">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Timeline</p>
                {selected.activities.slice(0, 6).map((a) => (
                  <div key={a.id} className="rounded-lg bg-slate-50 p-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <p>{a.message}</p>
                    <p className="mt-1 text-slate-400">{new Date(a.createdAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>

              {selected.conversationId && (
                <Link href="/messages" className="mt-5 inline-flex w-full">
                  <Button className="w-full">
                    <MessageCircle className="size-4" />
                    Open messages
                    <ChevronRight className="size-4" />
                  </Button>
                </Link>
              )}
            </aside>
          )}
        </div>
      )}
    </PageShell>
  );
}
