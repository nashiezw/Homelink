"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Calendar, MessageCircle } from "lucide-react";
import { EnquiryStatusBadge } from "@/components/enquiries/enquiry-status-badge";
import { ENQUIRY_TYPE_LABELS } from "@/lib/enquiries/labels";
import type { PropertyEnquiry } from "@/lib/enquiries/types";
import { apiFetch } from "@/lib/api/client";
import { Button } from "@/components/ui/button";

export function LandlordEnquiryInbox() {
  const [enquiries, setEnquiries] = useState<PropertyEnquiry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await apiFetch<{ enquiries: PropertyEnquiry[] }>("/api/v1/enquiries");
    setEnquiries(result.data?.enquiries ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <p className="text-sm text-slate-500">Loading enquiries...</p>;

  if (enquiries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center dark:border-slate-700">
        <p className="font-medium text-ink dark:text-white">No enquiries yet</p>
        <p className="mt-1 text-sm text-slate-500">
          When seekers enquire on your listings, they appear here. HouseLink agents manage the customer journey.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {enquiries.map((enquiry) => (
        <article
          key={enquiry.id}
          className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-ink dark:text-white">{enquiry.seekerName}</p>
              <p className="text-sm text-slate-500">{enquiry.listingTitle}</p>
            </div>
            <EnquiryStatusBadge status={enquiry.status} />
          </div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{enquiry.message}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span>{ENQUIRY_TYPE_LABELS[enquiry.enquiryType]}</span>
            <span className="flex items-center gap-1">
              <Calendar className="size-3" />
              {new Date(enquiry.createdAt).toLocaleDateString()}
            </span>
            {enquiry.assignedAgentName && <span>Agent: {enquiry.assignedAgentName}</span>}
          </div>
          {enquiry.viewings[0] && (
            <p className="mt-2 text-xs text-emerald-700">
              Viewing: {new Date(enquiry.viewings[0].scheduledAt).toLocaleString()}
            </p>
          )}
          <div className="mt-4 flex gap-2">
            <Link href="/messages">
              <Button variant="secondary" className="h-9">
                <MessageCircle className="size-4" />
                Messages
              </Button>
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
