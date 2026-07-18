"use client";

import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  MapPin,
  MessageSquareQuote,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import {
  RESIDENCE_ROLE_LABELS,
  TENANCY_STATUS_LABELS,
  VERIFICATION_SOURCE_LABELS,
  type PublicResidenceRecord,
  type TenancyDispute,
  type TenancyReference,
} from "@/lib/residence/types";

type TenancyItem = {
  tenancyId: string;
  record: PublicResidenceRecord;
  counterparty: { id: string; name: string } | null;
  needsMyConfirmation: boolean;
  needsAddressConsent: boolean;
  references: TenancyReference[];
  disputes: TenancyDispute[];
};

export function TenanciesDashboard() {
  const { user, showToast } = useApp();
  const [tenancies, setTenancies] = useState<TenancyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refOpen, setRefOpen] = useState<string | null>(null);
  const [disputeOpen, setDisputeOpen] = useState<string | null>(null);
  const [refNote, setRefNote] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeDetails, setDisputeDetails] = useState("");

  const load = useCallback(async () => {
    const result = await apiFetch<{ tenancies: TenancyItem[] }>("/api/v1/tenancies");
    setTenancies(result.data?.tenancies ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) void load();
    else setLoading(false);
  }, [user, load]);

  async function confirm(tenancyId: string) {
    const result = await apiFetch(`/api/v1/tenancies/${tenancyId}/confirm`, { method: "POST" });
    if (result.data) {
      showToast("Stay confirmed. Waiting for the other party if needed.");
      void load();
    }
  }

  async function toggleAddressConsent(tenancyId: string, consent: boolean) {
    await apiFetch(`/api/v1/tenancies/${tenancyId}/address-consent`, {
      method: "POST",
      body: JSON.stringify({ consent }),
    });
    showToast(consent ? "Address sharing consent saved." : "Address sharing withdrawn.");
    void load();
  }

  async function submitReference(tenancyId: string) {
    if (!refNote.trim()) return;
    await apiFetch(`/api/v1/tenancies/${tenancyId}/references`, {
      method: "POST",
      body: JSON.stringify({ note: refNote }),
    });
    setRefOpen(null);
    setRefNote("");
    showToast("Reference submitted.");
    void load();
  }

  async function submitDispute(tenancyId: string) {
    if (!disputeReason.trim() || !disputeDetails.trim()) return;
    await apiFetch(`/api/v1/tenancies/${tenancyId}/disputes`, {
      method: "POST",
      body: JSON.stringify({ reason: disputeReason, details: disputeDetails }),
    });
    setDisputeOpen(null);
    setDisputeReason("");
    setDisputeDetails("");
    showToast("Dispute submitted for admin review.");
    void load();
  }

  if (!user) {
    return (
      <div className="rounded-xl border bg-white p-10 text-center">
        <p className="text-slate-600">Sign in to manage tenancy confirmations and verified stay history.</p>
        <Link href="/auth?next=/dashboard/tenancies" rel="nofollow" className="mt-4 inline-block">
          <Button>Sign in</Button>
        </Link>
      </div>
    );
  }

  if (loading) {
    return <div className="rounded-xl border bg-white p-10 text-center text-slate-500">Loading...</div>;
  }

  const pending = tenancies.filter((t) => t.needsMyConfirmation);

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
        <p className="font-semibold">How verified stays work</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-emerald-800">
          <li>Only payment or lease through HouseLink can create a <strong>verified</strong> record.</li>
          <li>Both landlord and tenant must <strong>confirm</strong> before it shows as verified.</li>
          <li>Public profiles show <strong>suburb + city only</strong> until both agree to share the full address.</li>
          <li>Manual entries stay visible but are marked <strong>unverified</strong>.</li>
        </ul>
      </div>

      {pending.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-amber-800">Action required ({pending.length})</h2>
          <div className="mt-3 space-y-3">
            {pending.map((t) => (
              <TenancyCard
                key={t.tenancyId}
                item={t}
                onConfirm={() => void confirm(t.tenancyId)}
                onAddressConsent={(c) => void toggleAddressConsent(t.tenancyId, c)}
                onRefOpen={() => setRefOpen(t.tenancyId)}
                onDisputeOpen={() => setDisputeOpen(t.tenancyId)}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-lg font-bold text-ink">All stay records</h2>
        {tenancies.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            No tenancy records yet. Pay rent via HouseLink, sign a lease, or mark a listing as rented with your tenant.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {tenancies.map((t) => (
              <TenancyCard
                key={t.tenancyId}
                item={t}
                onConfirm={() => void confirm(t.tenancyId)}
                onAddressConsent={(c) => void toggleAddressConsent(t.tenancyId, c)}
                onRefOpen={() => setRefOpen(t.tenancyId)}
                onDisputeOpen={() => setDisputeOpen(t.tenancyId)}
              />
            ))}
          </div>
        )}
      </section>

      {refOpen && (
        <Modal title="Leave a reference" onClose={() => setRefOpen(null)}>
          <textarea
            rows={4}
            value={refNote}
            onChange={(e) => setRefNote(e.target.value)}
            placeholder="How was this tenant/landlord? Would you recommend them?"
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
          <Button className="mt-3" onClick={() => void submitReference(refOpen)}>
            Submit reference
          </Button>
        </Modal>
      )}

      {disputeOpen && (
        <Modal title="Report a dispute" onClose={() => setDisputeOpen(null)}>
          <input
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
            placeholder="Reason (e.g. Never lived here)"
            className="mb-2 w-full rounded-lg border px-3 py-2 text-sm"
          />
          <textarea
            rows={3}
            value={disputeDetails}
            onChange={(e) => setDisputeDetails(e.target.value)}
            placeholder="Details for admin review"
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
          <Button className="mt-3" variant="secondary" onClick={() => void submitDispute(disputeOpen)}>
            Submit dispute
          </Button>
        </Modal>
      )}
    </div>
  );
}

function TenancyCard({
  item,
  onConfirm,
  onAddressConsent,
  onRefOpen,
  onDisputeOpen,
}: {
  item: TenancyItem;
  onConfirm: () => void;
  onAddressConsent: (consent: boolean) => void;
  onRefOpen: () => void;
  onDisputeOpen: () => void;
}) {
  const r = item.record;
  return (
    <article className="gpu-card rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1 font-semibold text-ink">
            <MapPin className="size-4 text-emerald-600" />
            {r.suburb}, {r.city}
            {r.verified && <BadgeCheck className="size-4 text-emerald-600" aria-label="Verified" />}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {RESIDENCE_ROLE_LABELS[r.role]} · {VERIFICATION_SOURCE_LABELS[r.verificationSource]}
          </p>
          <p className="text-xs text-slate-400">
            {TENANCY_STATUS_LABELS[r.status]} · {r.startDate}
            {r.endDate ? ` – ${r.endDate}` : ""}
          </p>
          {item.counterparty && (
            <p className="mt-1 text-sm text-slate-600">With {item.counterparty.name}</p>
          )}
          {r.fullAddress && (
            <p className="mt-2 text-sm text-slate-700">
              <Shield className="mr-1 inline size-3.5" />
              {r.fullAddress}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {!r.verified && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              Unverified
            </span>
          )}
          {r.hasOpenDispute && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              Disputed
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {item.needsMyConfirmation && (
          <Button className="h-9" onClick={onConfirm}>
            <CheckCircle2 className="size-4" />
            Confirm stay
          </Button>
        )}
        {item.counterparty && !r.userAddressConsent && (
          <Button variant="secondary" className="h-9" onClick={() => onAddressConsent(true)}>
            Share full address
          </Button>
        )}
        {r.userAddressConsent && (
          <Button variant="secondary" className="h-9" onClick={() => onAddressConsent(false)}>
            Hide address
          </Button>
        )}
        {item.counterparty && r.status === "active" && (
          <Button variant="secondary" className="h-9" onClick={onRefOpen}>
            <MessageSquareQuote className="size-4" />
            Reference
          </Button>
        )}
        <Button variant="secondary" className="h-9" onClick={onDisputeOpen}>
          <AlertTriangle className="size-4" />
          Dispute
        </Button>
      </div>

      {r.references && r.references.length > 0 && (
        <div className="mt-4 border-t pt-3">
          <p className="text-xs font-semibold uppercase text-slate-500">References</p>
          {r.references.map((ref) => (
            <blockquote key={ref.id} className="mt-2 text-sm italic text-slate-600">
              &ldquo;{ref.note}&rdquo; — {ref.authorName}
            </blockquote>
          ))}
        </div>
      )}
    </article>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{title}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            ×
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
