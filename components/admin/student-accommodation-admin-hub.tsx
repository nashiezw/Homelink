"use client";

import Link from "next/link";
import { BookOpen, ExternalLink } from "lucide-react";
import { PropertiesManagementHub } from "@/components/admin/properties-management-hub";
import { TenantRequestsHub } from "@/components/admin/tenant-requests-hub";
import { AdminPanel } from "@/components/admin/ui/admin-ui";

export function StudentAccommodationAdminHub() {
  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-200">
              <BookOpen className="size-4" aria-hidden="true" />
              Student accommodation workspace
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Manage boarding-house listings, convert suitable room listings, verify student accommodation, and follow up with student, guardian, and school-admin requests.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/student-accommodation"
              target="_blank"
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15"
            >
              Public page
              <ExternalLink className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href="/property-request?type=boarding_house"
              target="_blank"
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              Request form
              <ExternalLink className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>

      <AdminPanel title="Boarding house listings" description="Filtered listing operations for student accommodation">
        <PropertiesManagementHub initialType="boarding_house" />
      </AdminPanel>

      <AdminPanel title="Student accommodation requests" description="Filtered client requests with CSV export for follow-up">
        <TenantRequestsHub propertyTypeFilter="boarding_house" />
      </AdminPanel>
    </div>
  );
}
