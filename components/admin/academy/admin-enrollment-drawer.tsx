"use client";

import { CheckCircle2, GraduationCap, Mail, Search, Ticket, UserPlus, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AdminDrawer, AdminSearchInput, AdminStatusBadge } from "@/components/admin/ui/admin-ui";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/providers/app-provider";
import { apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/utils";

export type EnrollmentUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  accountStatus?: string;
};

const EMPTY_USERS: EnrollmentUser[] = [];

type EnrollmentOptions = {
  courses: Array<{
    id: string;
    title: string;
    publicPrice: number;
    currency: string;
    registrationOpen: boolean;
    accessDurationDays: number;
  }>;
  coupons: Array<{
    id: string;
    code: string;
    description: string | null;
    discountType: string;
    discountValue: number;
    maxUses: number | null;
    usedCount: number;
    minPurchaseAmount: number | null;
    validFrom: string;
    validUntil: string | null;
    applicableCourses: string[];
    applicableRoles: string[];
    remainingUses: number | null;
  }>;
};

type EnrollmentResult = {
  course: { id: string; title: string };
  outcomes: Array<{
    userId?: string;
    name: string;
    email: string;
    status: "ENROLLED" | "PENDING_PAYMENT" | "SKIPPED" | "FAILED";
    message: string;
    createdAccount?: boolean;
    invitationSent?: boolean;
    setupUrl?: string;
  }>;
  summary: Record<"ENROLLED" | "PENDING_PAYMENT" | "SKIPPED" | "FAILED", number>;
};

export function AdminEnrollmentDrawer({
  open,
  onClose,
  initialUsers = EMPTY_USERS,
  onComplete,
}: {
  open: boolean;
  onClose: () => void;
  initialUsers?: EnrollmentUser[];
  onComplete?: (result: EnrollmentResult) => void | Promise<void>;
}) {
  const { showToast } = useApp();
  const fixedUsers = initialUsers.length > 0;
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [options, setOptions] = useState<EnrollmentOptions | null>(null);
  const [users, setUsers] = useState<EnrollmentUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<EnrollmentUser | null>(null);
  const [query, setQuery] = useState("");
  const [courseId, setCourseId] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [accessMode, setAccessMode] = useState<"GRANT_NOW" | "PENDING_PAYMENT">("GRANT_NOW");
  const [adminNote, setAdminNote] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [organisation, setOrganisation] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<EnrollmentResult | null>(null);

  useEffect(() => {
    if (!open) return;
    setResult(null);
    setSelectedUser(fixedUsers && initialUsers.length === 1 ? initialUsers[0] : null);
    void apiFetch<EnrollmentOptions>("/api/v1/admin/academy?view=enrollment-options", { cache: "no-store" }).then((response) => {
      if (!response.data) {
        showToast(response.error?.message ?? "Enrollment options could not be loaded.", "error");
        return;
      }
      setOptions(response.data);
      setCourseId((current) => current || response.data?.courses[0]?.id || "");
    });
  }, [fixedUsers, initialUsers, open, showToast]);

  useEffect(() => {
    if (!open || fixedUsers || mode !== "existing") return;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ limit: "20" });
      if (query.trim()) params.set("q", query.trim());
      void apiFetch<{ users: EnrollmentUser[] }>(`/api/v1/admin/users?${params}`).then((response) => {
        if (response.data) setUsers(response.data.users.filter((user) => user.accountStatus !== "DELETED"));
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [fixedUsers, mode, open, query]);

  const course = options?.courses.find((item) => item.id === courseId) ?? null;
  const coupon = options?.coupons.find((item) => item.code.toUpperCase() === couponCode.trim().toUpperCase()) ?? null;
  const couponIssue = useMemo(() => {
    if (!couponCode.trim()) return "";
    if (!coupon) return "Coupon code was not found.";
    if (!course) return "Select a course first.";
    const now = Date.now();
    if (new Date(coupon.validFrom).getTime() > now || (coupon.validUntil && new Date(coupon.validUntil).getTime() < now)) return "Coupon is outside its valid date range.";
    if (coupon.remainingUses !== null && coupon.remainingUses <= 0) return "Coupon usage limit has been reached.";
    if (coupon.applicableCourses.length && !coupon.applicableCourses.includes(course.id)) return "Coupon does not apply to this course.";
    if (coupon.minPurchaseAmount !== null && course.publicPrice < coupon.minPurchaseAmount) return "Course price is below the coupon minimum.";
    return "";
  }, [coupon, couponCode, course]);
  const discount = !course || !coupon || couponIssue
    ? 0
    : Math.min(course.publicPrice, coupon.discountType === "PERCENTAGE" ? course.publicPrice * coupon.discountValue / 100 : coupon.discountValue);
  const finalPrice = Math.max(0, (course?.publicPrice ?? 0) - discount);
  const targetUsers = fixedUsers ? initialUsers : selectedUser ? [selectedUser] : [];
  const canSubmit = Boolean(
    courseId &&
    adminNote.trim() &&
    !couponIssue &&
    (mode === "new" && !fixedUsers ? fullName.trim() && email.trim() : targetUsers.length),
  );

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    const response = await apiFetch<EnrollmentResult>("/api/v1/admin/academy", {
      method: "PATCH",
      body: JSON.stringify({
        action: "admin_enroll_learners",
        courseId,
        couponCode: couponCode.trim() || undefined,
        accessMode,
        adminNote: adminNote.trim(),
        ...(mode === "new" && !fixedUsers
          ? { newLearner: { fullName: fullName.trim(), email: email.trim(), phone: phone.trim(), organisation: organisation.trim() } }
          : { userIds: targetUsers.map((user) => user.id) }),
      }),
    });
    setBusy(false);
    if (!response.data) {
      showToast(response.error?.message ?? "Enrollment failed.", "error");
      return;
    }
    setResult(response.data);
    await onComplete?.(response.data);
    const completed = response.data.summary.ENROLLED + response.data.summary.PENDING_PAYMENT;
    showToast(
      response.data.summary.FAILED
        ? `${completed} enrollment(s) created; ${response.data.summary.FAILED} failed.`
        : `${completed} enrollment(s) created.`,
      response.data.summary.FAILED ? "error" : undefined,
    );
  }

  return (
    <AdminDrawer
      open={open}
      onClose={onClose}
      title="Enroll in Academy"
      description={fixedUsers ? `Enroll ${initialUsers.length} selected user${initialUsers.length === 1 ? "" : "s"}.` : "Select an existing user or create a learner account."}
      width="xl"
    >
      {result ? (
        <div className="space-y-5">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <CheckCircle2 className="size-6 text-emerald-400" />
            <div>
              <p className="font-semibold text-white">Enrollment run complete</p>
              <p className="text-sm text-slate-400">{result.course.title}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Summary label="Access granted" value={result.summary.ENROLLED} />
            <Summary label="Pending payment" value={result.summary.PENDING_PAYMENT} />
            <Summary label="Skipped" value={result.summary.SKIPPED} />
            <Summary label="Failed" value={result.summary.FAILED} danger={result.summary.FAILED > 0} />
          </div>
          <div className="divide-y divide-white/10 border-y border-white/10">
            {result.outcomes.map((outcome) => (
              <div key={`${outcome.userId ?? outcome.email}:${outcome.status}`} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-white">{outcome.name}</p>
                    <p className="text-xs text-slate-500">{outcome.email}</p>
                  </div>
                  <AdminStatusBadge
                    status={outcome.status}
                    variant={outcome.status === "ENROLLED" ? "success" : outcome.status === "FAILED" ? "danger" : outcome.status === "SKIPPED" ? "muted" : "warning"}
                  />
                </div>
                <p className="mt-2 text-sm text-slate-300">{outcome.message}</p>
                {outcome.createdAccount && <p className="mt-1 text-xs text-slate-400">New passwordless account created.</p>}
                {outcome.invitationSent !== undefined && (
                  <p className="mt-1 text-xs text-slate-400">
                    {outcome.invitationSent ? "Password setup invitation sent." : "Invitation delivery failed; resend password setup before the learner signs in."}
                  </p>
                )}
                {outcome.setupUrl && <a href={outcome.setupUrl} className="mt-1 block break-all text-xs text-emerald-300">Open local setup link</a>}
              </div>
            ))}
          </div>
          <Button className="w-full" onClick={onClose}>Done</Button>
        </div>
      ) : (
        <div className="space-y-6">
          {!fixedUsers && (
            <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Learner source">
              <ModeButton active={mode === "existing"} icon={Users} label="Existing user" onClick={() => setMode("existing")} />
              <ModeButton active={mode === "new"} icon={UserPlus} label="New learner" onClick={() => setMode("new")} />
            </div>
          )}

          {fixedUsers ? (
            <LearnerList users={initialUsers} />
          ) : mode === "existing" ? (
            <div className="space-y-3">
              <label className="text-xs font-semibold uppercase text-slate-400">Find user</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                <AdminSearchInput value={query} onChange={setQuery} placeholder="Search name, email, or phone" className="pl-10" />
              </div>
              <div className="max-h-64 divide-y divide-white/10 overflow-y-auto border-y border-white/10">
                {users.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => setSelectedUser(user)}
                    className={cn("flex w-full items-center justify-between gap-3 px-2 py-3 text-left", selectedUser?.id === user.id ? "bg-emerald-500/10" : "hover:bg-white/[0.03]")}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-white">{user.name}</span>
                      <span className="block truncate text-xs text-slate-500">{user.email}</span>
                    </span>
                    {selectedUser?.id === user.id && <CheckCircle2 className="size-5 shrink-0 text-emerald-400" />}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" value={fullName} onChange={setFullName} required />
              <Field label="Email" value={email} onChange={setEmail} type="email" required />
              <Field label="Phone" value={phone} onChange={setPhone} />
              <Field label="Organisation" value={organisation} onChange={setOrganisation} />
              <p className="sm:col-span-2 flex items-start gap-2 text-xs leading-5 text-slate-400">
                <Mail className="mt-0.5 size-4 shrink-0 text-emerald-400" /> A secure, single-use password setup invitation will be emailed to the learner. The administrator never sees their password.
              </p>
            </div>
          )}

          <div className="space-y-4 border-t border-white/10 pt-5">
            <label className="block text-xs font-semibold uppercase text-slate-400">Course</label>
            <select value={courseId} onChange={(event) => setCourseId(event.target.value)} className={inputClassName}>
              <option value="">Select course</option>
              {options?.courses.map((item) => (
                <option key={item.id} value={item.id}>{item.title} - {item.currency} {item.publicPrice.toFixed(2)}{item.registrationOpen ? "" : " (registration closed)"}</option>
              ))}
            </select>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400">Coupon (optional)</label>
              <div className="relative mt-2">
                <Ticket className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                <input value={couponCode} onChange={(event) => setCouponCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} className={`${inputClassName} pl-10`} placeholder="Enter coupon code" />
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {options?.coupons.slice(0, 8).map((item) => (
                  <button key={item.id} type="button" onClick={() => setCouponCode(item.code)} className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-400/20">
                    {item.code}
                  </button>
                ))}
              </div>
              {couponIssue && <p className="mt-2 text-sm text-red-300">{couponIssue}</p>}
            </div>

            {course && (
              <div className="grid grid-cols-3 gap-3 border-y border-white/10 py-4 text-sm">
                <Price label="Course price" value={`${course.currency} ${course.publicPrice.toFixed(2)}`} />
                <Price label="Discount" value={`${course.currency} ${discount.toFixed(2)}`} />
                <Price label="Balance" value={`${course.currency} ${finalPrice.toFixed(2)}`} emphasis />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400">Access decision</label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <ModeButton active={accessMode === "GRANT_NOW"} icon={GraduationCap} label="Grant access now" onClick={() => setAccessMode("GRANT_NOW")} />
                <ModeButton active={accessMode === "PENDING_PAYMENT"} icon={Ticket} label="Await payment" onClick={() => setAccessMode("PENDING_PAYMENT")} />
              </div>
              {finalPrice <= 0 && <p className="mt-2 text-xs text-emerald-300">The balance is fully covered, so access will be granted immediately.</p>}
            </div>

            <label className="block">
              <span className="text-xs font-semibold uppercase text-slate-400">Admin note</span>
              <textarea value={adminNote} onChange={(event) => setAdminNote(event.target.value)} rows={3} className={`${inputClassName} mt-2 resize-y`} placeholder="Reason and payment/access decision" />
            </label>
          </div>

          <div className="grid gap-2 border-t border-white/10 pt-5 sm:grid-cols-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button loading={busy} loadingText="Enrolling..." disabled={!canSubmit} onClick={() => void submit()}>
              <GraduationCap className="size-4" /> Enroll {fixedUsers && initialUsers.length > 1 ? `${initialUsers.length} users` : "learner"}
            </Button>
          </div>
        </div>
      )}
    </AdminDrawer>
  );
}

const inputClassName = "w-full rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/20";

function Field({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return (
    <label>
      <span className="text-xs font-semibold uppercase text-slate-400">{label}{required ? " *" : ""}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className={`${inputClassName} mt-2`} />
    </label>
  );
}

function ModeButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: typeof Users; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn("flex min-h-12 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold", active ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-100" : "border-white/10 text-slate-400 hover:bg-white/[0.03]")}>
      <Icon className="size-4" /> {label}
    </button>
  );
}

function LearnerList({ users }: { users: EnrollmentUser[] }) {
  return (
    <div className="max-h-48 divide-y divide-white/10 overflow-y-auto border-y border-white/10">
      {users.map((user) => (
        <div key={user.id} className="py-3">
          <p className="font-medium text-white">{user.name}</p>
          <p className="text-xs text-slate-500">{user.email}</p>
        </div>
      ))}
    </div>
  );
}

function Price({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return <div><p className="text-xs text-slate-500">{label}</p><p className={cn("mt-1 font-semibold", emphasis ? "text-emerald-300" : "text-slate-200")}>{value}</p></div>;
}

function Summary({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
  return <div className="border-l-2 border-white/10 pl-3"><p className="text-xs text-slate-500">{label}</p><p className={cn("mt-1 text-xl font-bold", danger ? "text-red-300" : "text-white")}>{value}</p></div>;
}
