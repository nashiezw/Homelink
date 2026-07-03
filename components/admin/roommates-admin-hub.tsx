"use client";

import { BadgeCheck, ExternalLink, Search, ShieldAlert, Star, UserRound, Users } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { AdminKpiCard } from "@/components/admin/kpi-card";
import {
  AdminEmptyState,
  AdminFilterBar,
  AdminPanel,
  AdminSearchInput,
  AdminSelect,
  AdminStatusBadge,
  AdminTabStrip,
} from "@/components/admin/ui/admin-ui";
import { useApp } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import { AdminActionFeedback } from "@/components/admin/action-feedback";
import { AdminActionDialog, type AdminDialogConfig } from "@/components/admin/action-dialog";
import type { RoommateProfile } from "@/lib/store/types";

type AdminRoommateProfile = RoommateProfile & {
  userName: string;
  userEmail?: string;
  userCity?: string;
  accountStatus: string;
};

type RoommatesAdminData = {
  analytics: {
    total: number;
    verified: number;
    pending: number;
    suspended: number;
    featured: number;
    seekingRoom: number;
    seekingRoommate: number;
  };
  profiles: AdminRoommateProfile[];
};

export function RoommatesAdminHub() {
  const { showToast } = useApp();
  const [data, setData] = useState<RoommatesAdminData | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [lookingFor, setLookingFor] = useState("");
  const [selected, setSelected] = useState<AdminRoommateProfile | null>(null);
  const [bioEdit, setBioEdit] = useState("");
  const [rejectNotes, setRejectNotes] = useState("");
  const [feedback, setFeedback] = useState<{
    title: string;
    message: string;
    tone?: "success" | "warning" | "danger" | "info";
    details?: Array<{ label: string; value: string | number | undefined }>;
  } | null>(null);
  const [dialog, setDialog] = useState<AdminDialogConfig | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (status !== "all") params.set("status", status);
    if (lookingFor) params.set("lookingFor", lookingFor);
    const result = await apiFetch<RoommatesAdminData>(`/api/v1/admin/roommates?${params}`);
    if (result.data) {
      setData(result.data);
      if (selected) {
        const updated = result.data.profiles.find((p) => p.userId === selected.userId);
        if (updated) {
          setSelected(updated);
          setBioEdit(updated.bio ?? "");
        }
      }
    }
  }, [q, status, lookingFor, selected]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 200);
    return () => clearTimeout(t);
  }, [load]);

  async function action(act: string, extra?: Record<string, unknown>) {
    if (!selected) return;
    if (act === "suspend" && !String(extra?.notes ?? "").trim()) {
      showToast("Add a suspension reason before suspending this profile.", "error");
      return;
    }
    if (act === "delete") {
      setDialog({
        title: "Delete roommate profile",
        message: `Delete ${selected.userName}'s roommate profile? This action is recorded for admin audit.`,
        tone: "danger",
        confirmLabel: "Delete profile",
        onConfirm: () => applyRoommateAction(act, extra),
      });
      return;
    }
    await applyRoommateAction(act, extra);
  }

  async function applyRoommateAction(act: string, extra?: Record<string, unknown>) {
    if (!selected) return;
    const result = await apiFetch("/api/v1/admin/roommates", {
      method: "PATCH",
      body: JSON.stringify({ userId: selected.userId, action: act, ...extra }),
    });
    if (result.error) {
      showToast(result.error.message ?? "Action failed.", "error");
      return;
    }
    showToast(`Profile ${act.replace(/_/g, " ")} applied.`);
    setFeedback({
      title: "Roommate profile updated",
      message: `${act.replace(/_/g, " ")} was applied to ${selected.userName}.`,
      tone: act === "delete" ? "danger" : act === "suspend" ? "warning" : "success",
      details: [
        { label: "Profile", value: selected.userName },
        { label: "Action", value: act.replace(/_/g, " ") },
        { label: "Reason", value: String(extra?.notes ?? "") || "Not required" },
      ],
    });
    void load();
  }

  const analytics = data?.analytics;

  return (
    <div className="space-y-6">
      <AdminActionDialog config={dialog} onClose={() => setDialog(null)} />
      <AdminActionFeedback
        open={Boolean(feedback)}
        title={feedback?.title ?? ""}
        message={feedback?.message ?? ""}
        tone={feedback?.tone}
        details={feedback?.details}
        onClose={() => setFeedback(null)}
      />
      {analytics && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminKpiCard label="Total profiles" value={analytics.total} icon={Users} />
          <AdminKpiCard label="Verified" value={analytics.verified} icon={BadgeCheck} tone="success" />
          <AdminKpiCard label="Pending review" value={analytics.pending} icon={ShieldAlert} tone="warning" />
          <AdminKpiCard label="Featured" value={analytics.featured} icon={Star} />
        </div>
      )}

      <AdminTabStrip
        active={status}
        onChange={setStatus}
        tabs={[
          { id: "all", label: "All", count: data?.profiles.length },
          { id: "pending", label: "Pending", count: analytics?.pending },
          { id: "active", label: "Active", count: analytics?.verified },
          { id: "suspended", label: "Suspended", count: analytics?.suspended },
        ]}
      />

      <AdminFilterBar>
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
          <AdminSearchInput value={q} onChange={setQ} placeholder="Search name, email, bio..." className="pl-10" />
        </div>
        <AdminSelect
          value={lookingFor}
          onChange={setLookingFor}
          options={[
            { value: "", label: "All intents" },
            { value: "room", label: "Seeking room" },
            { value: "roommate", label: "Seeking roommate" },
          ]}
        />
      </AdminFilterBar>

      <div className="grid gap-4 lg:grid-cols-3">
        <AdminPanel title="Seeker profiles" description="Verify bios, suspend accounts, feature top matches" className="lg:col-span-2">
          {!data?.profiles.length ? (
            <AdminEmptyState icon={UserRound} title="No roommate profiles match your filters" />
          ) : (
            <div className="space-y-3">
              {data.profiles.map((profile) => (
                <article
                  key={profile.userId}
                  onClick={() => {
                    setSelected(profile);
                    setBioEdit(profile.bio ?? "");
                    setRejectNotes("");
                  }}
                  className={`cursor-pointer rounded-xl border p-4 transition ${
                    selected?.userId === profile.userId
                      ? "border-emerald-500/40 bg-emerald-500/5"
                      : "border-white/[0.06] bg-slate-950/40 hover:border-white/10"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex gap-3">
                      {profile.photoUrl && (
                        <Image
                          src={profile.photoUrl}
                          alt=""
                          width={48}
                          height={48}
                          className="size-12 rounded-xl object-cover"
                        />
                      )}
                      <div>
                        <p className="font-semibold text-white">{profile.userName}</p>
                        <p className="text-sm text-slate-400">
                          {profile.lookingFor === "room" ? "Looking for a room" : "Looking for a roommate"} · $
                          {profile.budgetMin}–{profile.budgetMax}
                        </p>
                        <p className="text-xs text-slate-500">
                          {profile.suburb || profile.userCity} · {profile.userEmail}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <AdminStatusBadge
                        status={profile.moderationStatus ?? "pending"}
                        variant={
                          profile.moderationStatus === "suspended"
                            ? "danger"
                            : profile.moderationStatus === "active"
                              ? "success"
                              : "warning"
                        }
                      />
                      {profile.verified && <AdminStatusBadge status="verified" variant="info" />}
                      {profile.featured && <AdminStatusBadge status="featured" variant="info" />}
                    </div>
                  </div>
                  {profile.bio && <p className="mt-2 line-clamp-2 text-sm text-slate-300">{profile.bio}</p>}
                </article>
              ))}
            </div>
          )}
        </AdminPanel>

        <AdminPanel title="Profile moderation" description={selected ? selected.userName : "Select a profile"}>
          {!selected ? (
            <p className="text-sm text-slate-500">Select a seeker to verify their profile, edit their bio, or suspend the account.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void action("verify")}>Verify profile</Button>
                <Button variant="secondary" onClick={() => void action("activate")}>Activate</Button>
                <Button
                  variant="secondary"
                  onClick={() => void action(selected.featured ? "unfeature" : "feature")}
                >
                  {selected.featured ? "Unfeature" : "Feature"}
                </Button>
              </div>

              <label className="block text-sm text-slate-400">
                Bio (public)
                <textarea
                  value={bioEdit}
                  onChange={(e) => setBioEdit(e.target.value)}
                  rows={4}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </label>
              <Button variant="secondary" onClick={() => void action("update_bio", { bio: bioEdit })}>
                Save bio
              </Button>

              <label className="block text-sm text-slate-400">
                Suspension reason
                <input
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
                  placeholder="Policy violation details..."
                />
              </label>
              <Button variant="secondary" onClick={() => void action("suspend", { notes: rejectNotes })}>
                Suspend profile
              </Button>

              <Link
                href={`/roommates/people/${selected.userId}`}
                target="_blank"
                className="inline-flex items-center gap-1 text-sm text-cyan-400 hover:underline"
              >
                View public profile <ExternalLink className="size-3.5" />
              </Link>

              <Button variant="secondary" className="text-red-300" onClick={() => void action("delete")}>
                Delete profile
              </Button>
            </div>
          )}
        </AdminPanel>
      </div>
    </div>
  );
}
