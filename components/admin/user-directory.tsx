"use client";

import {
  Ban,
  CheckCircle2,
  Crown,
  Download,
  History,
  Mail,
  MessageSquare,
  Search,
  UserCog,
  UserX,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminKpiCard } from "@/components/admin/kpi-card";
import {
  AdminDataTable,
  AdminDrawer,
  AdminFilterBar,
  AdminPagination,
  AdminSearchInput,
  AdminSelect,
  AdminStatusBadge,
  AdminTabStrip,
  AdminToolbar,
} from "@/components/admin/ui/admin-ui";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/providers/app-provider";
import { apiFetch } from "@/lib/api/client";
import { AdminActionDialog, type AdminDialogConfig } from "@/components/admin/action-dialog";
import type { PublicAdminUser } from "@/lib/store/types";
import type { AccountStatus, UserRole } from "@/lib/store/types";

type UserListResponse = {
  users: PublicAdminUser[];
  totals: Record<string, number>;
};

type UserDetail = {
  user: PublicAdminUser;
  listings: Array<{ id: string; title: string; status: string; views?: number; price?: number }>;
  payments: Array<{ id: string; amount: number; status: string; plan?: string; createdAt: string }>;
  enquiries: Array<{ id: string; message?: string; createdAt?: string }>;
  activity: Array<{ id: string; action: string; actorName: string; createdAt: string }>;
};

const ROLES: Array<UserRole | "ALL"> = ["ALL", "SEEKER", "LANDLORD", "AGENT", "CONSULTANT", "AGENCY_ADMIN", "SUPPORT", "BILLING", "TECH_SUPPORT", "TRUST_SAFETY", "ADMIN"];
const ASSIGNABLE_ROLES: UserRole[] = ["SEEKER", "LANDLORD", "AGENT", "CONSULTANT", "AGENCY_ADMIN", "SUPPORT", "BILLING", "TECH_SUPPORT", "TRUST_SAFETY", "ADMIN"];
const STATUSES: Array<AccountStatus | "ALL"> = ["ALL", "ACTIVE", "SUSPENDED", "BLOCKED", "DELETED"];
const PAGE_SIZE = 12;

export function UserDirectory() {
  const { showToast } = useApp();
  const [data, setData] = useState<UserListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole | "ALL">("ALL");
  const [status, setStatus] = useState<AccountStatus | "ALL">("ALL");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<PublicAdminUser | null>(null);
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [detailTab, setDetailTab] = useState("overview");
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notifySubject, setNotifySubject] = useState("Message from HomeLink");
  const [notifyBody, setNotifyBody] = useState("");
  const [dialog, setDialog] = useState<AdminDialogConfig | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (role !== "ALL") params.set("role", role);
    if (status !== "ALL") params.set("status", status);
    if (q.trim()) params.set("q", q.trim());
    const result = await apiFetch<UserListResponse>(`/api/v1/admin/users?${params}`);
    if (result.data) setData(result.data);
    setLoading(false);
  }, [role, status, q]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      void load();
    }, 200);
    return () => clearTimeout(timer);
  }, [load]);

  const sortedUsers = useMemo(() => {
    const users = [...(data?.users ?? [])];
    if (sort === "name") users.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "score") users.sort((a, b) => b.performanceScore - a.performanceScore);
    else users.sort((a, b) => new Date(b.lastLoginAt).getTime() - new Date(a.lastLoginAt).getTime());
    return users;
  }, [data?.users, sort]);

  const pagedUsers = sortedUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function loadDetail(userId: string) {
    const result = await apiFetch<UserDetail>(`/api/v1/admin/users/${userId}`);
    if (result.data) setDetail(result.data);
    else showToast(result.error?.message ?? "Could not load user details.", "error");
  }

  async function runAction(userId: string, action: string, extra?: Record<string, unknown>) {
    const result = await apiFetch(`/api/v1/admin/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify({ action, ...extra }),
    });
    if (result.error) {
      showToast(result.error.message ?? "User action failed.", "error");
      return;
    }
    showToast(`User ${action.replace(/_/g, " ")} applied.`);
    void load();
    if (selected?.id === userId) void loadDetail(userId);
  }

  async function toggleRole(user: PublicAdminUser, roleName: UserRole, checked: boolean) {
    await runAction(user.id, checked ? "assign_role" : "remove_role", { role: roleName });
    setSelected((current) =>
      current?.id === user.id
        ? {
            ...current,
            roles: checked
              ? current.roles.includes(roleName) ? current.roles : [...current.roles, roleName]
              : current.roles.filter((role) => role !== roleName),
          }
        : current,
    );
  }

  function requestUserAction(action: string, label: string, options?: { danger?: boolean; reasonRequired?: boolean }) {
    if (!selected) return;
    setDialog({
      title: label,
      message: `Apply ${label.toLowerCase()} to ${selected.name}. This action is recorded in the audit log.`,
      tone: options?.danger ? "danger" : "warning",
      confirmLabel: label,
      fields: [
        {
          name: "reason",
          label: "Admin reason",
          type: "textarea",
          required: options?.reasonRequired ?? true,
          placeholder: "Explain why this action is being taken",
        },
      ],
      onConfirm: (values) => runAction(selected.id, action, { reason: values.reason || undefined }),
    });
  }

  function requestBulkAction(action: string, label: string) {
    if (!bulkSelected.size) {
      showToast("Select users first.", "error");
      return;
    }
    setDialog({
      title: label,
      message: `Apply ${label.toLowerCase()} to ${bulkSelected.size} selected user(s).`,
      tone: action === "suspend" ? "warning" : "info",
      confirmLabel: label,
      fields: [{ name: "reason", label: "Batch reason", type: "textarea", required: true }],
      onConfirm: (values) => bulkAction(action, values.reason),
    });
  }

  async function bulkAction(action: string, reason: string) {
    if (!bulkSelected.size) {
      showToast("Select users first.", "error");
      return;
    }
    let failed = 0;
    for (const id of bulkSelected) {
      const result = await apiFetch(`/api/v1/admin/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action, reason }),
      });
      if (result.error) failed += 1;
    }
    if (failed) {
      showToast(`${failed} user action(s) failed. ${bulkSelected.size - failed} applied.`, "error");
    } else {
      showToast(`${action.replace(/_/g, " ")} applied to ${bulkSelected.size} users.`);
    }
    setBulkSelected(new Set());
    void load();
  }

  async function exportUsers() {
    const res = await fetch("/api/v1/admin/reports?type=users&format=csv", { credentials: "include" });
    if (!res.ok) {
      showToast("Export failed.", "error");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "homelink-users.csv";
    a.click();
    URL.revokeObjectURL(url);
    showToast("User export downloaded.");
  }

  async function sendNotify() {
    const ids = [...bulkSelected];
    if (!ids.length) return;
    const result = await apiFetch("/api/v1/admin/actions", {
      method: "POST",
      body: JSON.stringify({
        action: "broadcast_notification",
        subject: notifySubject,
        body: notifyBody || "Important update from the HomeLink team.",
        userIds: ids,
      }),
    });
    if (result.error) {
      showToast(result.error.message ?? "Notification failed.", "error");
      return;
    }
    showToast(`Notification sent to ${ids.length} user(s).`);
    setNotifyOpen(false);
    setBulkSelected(new Set());
  }

  function openUser(user: PublicAdminUser) {
    setSelected(user);
    setDetailTab("overview");
    setDrawerOpen(true);
    void loadDetail(user.id);
  }

  const totals = data?.totals;

  return (
    <div className="space-y-6">
      <AdminActionDialog config={dialog} onClose={() => setDialog(null)} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminKpiCard label="Total users" value={totals?.totalUsers ?? totals?.total ?? "-"} icon={UserCog} />
        <AdminKpiCard label="Active today" value={totals?.activeToday ?? "-"} icon={CheckCircle2} tone="success" />
        <AdminKpiCard label="Premium" value={totals?.premium ?? "-"} icon={Crown} />
        <AdminKpiCard label="Suspended / blocked" value={(totals?.suspended ?? 0) + (totals?.blocked ?? 0)} icon={Ban} tone="warning" />
      </div>

      <AdminFilterBar>
        <div className="relative min-w-0 flex-1 sm:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
          <AdminSearchInput value={q} onChange={setQ} placeholder="Search name, email, phone, city..." className="pl-10" />
        </div>
        <AdminSelect value={role} onChange={(v) => setRole(v as UserRole | "ALL")} options={ROLES.map((r) => ({ value: r, label: r === "ALL" ? "All roles" : r }))} />
        <AdminSelect value={status} onChange={(v) => setStatus(v as AccountStatus | "ALL")} options={STATUSES.map((s) => ({ value: s, label: s === "ALL" ? "All statuses" : s }))} />
        <AdminSelect
          value={sort}
          onChange={setSort}
          options={[
            { value: "recent", label: "Last login" },
            { value: "name", label: "Name A-Z" },
            { value: "score", label: "Performance score" },
          ]}
        />
      </AdminFilterBar>

      {bulkSelected.size > 0 && (
        <AdminToolbar>
          <p className="text-sm font-medium text-emerald-200">{bulkSelected.size} users selected</p>
          <div className="grid gap-2 sm:flex sm:flex-wrap">
            <Button variant="secondary" onClick={() => setNotifyOpen(true)}>
              <Mail className="size-4" /> Notify selected
            </Button>
            <Button variant="secondary" onClick={() => requestBulkAction("suspend", "Suspend selected users")}>
              <UserX className="size-4" /> Suspend
            </Button>
            <Button variant="secondary" onClick={() => requestBulkAction("activate", "Activate selected users")}>
              <CheckCircle2 className="size-4" /> Activate
            </Button>
            <Button variant="secondary" onClick={() => setBulkSelected(new Set())}>
              Clear
            </Button>
          </div>
        </AdminToolbar>
      )}

      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-900/50">
        {loading ? (
          <p className="p-8 text-center text-slate-400">Loading user directory...</p>
        ) : (
          <>
            <AdminDataTable
              selectable
              rows={pagedUsers}
              selectedIds={bulkSelected}
              selectedId={selected?.id}
              allSelected={!!pagedUsers.length && pagedUsers.every((u) => bulkSelected.has(u.id))}
              onToggleSelect={(id) => {
                setBulkSelected((prev) => {
                  const next = new Set(prev);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                });
              }}
              onToggleSelectAll={() => {
                if (pagedUsers.every((u) => bulkSelected.has(u.id))) {
                  setBulkSelected(new Set());
                } else {
                  setBulkSelected(new Set(pagedUsers.map((u) => u.id)));
                }
              }}
              onRowClick={openUser}
              columns={[
                {
                  key: "user",
                  header: "User",
                  render: (user) => (
                    <div>
                      <p className="font-medium text-white">
                        {user.name}
                        {user.premium && <Crown className="ml-1 inline size-3.5 text-amber-400" />}
                      </p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                  ),
                },
                {
                  key: "roles",
                  header: "Roles",
                  render: (user) => (
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((r) => (
                        <span key={r} className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-slate-300">
                          {r}
                        </span>
                      ))}
                    </div>
                  ),
                },
                {
                  key: "status",
                  header: "Status",
                  render: (user) => (
                    <AdminStatusBadge
                      status={user.accountStatus}
                      variant={
                        user.accountStatus === "ACTIVE" ? "success" : user.accountStatus === "SUSPENDED" ? "warning" : "danger"
                      }
                    />
                  ),
                },
                { key: "score", header: "Score", render: (user) => <span className="text-slate-300">{user.performanceScore}</span> },
                {
                  key: "login",
                  header: "Last login",
                  render: (user) => <span className="text-xs text-slate-500">{new Date(user.lastLoginAt).toLocaleDateString()}</span>,
                },
              ]}
            />
            <AdminPagination page={page} pageSize={PAGE_SIZE} total={sortedUsers.length} onPageChange={setPage} />
          </>
        )}
      </div>

      <AdminToolbar>
        <p className="text-sm text-slate-400">Export full directory or broadcast platform-wide</p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => void exportUsers()}>
            <Download className="size-4" /> Export CSV
          </Button>
        </div>
      </AdminToolbar>

      <AdminDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selected?.name ?? "User profile"}
        description={selected?.email}
        width="lg"
      >
        {selected && (
          <div className="space-y-6">
            <div className="grid gap-2 sm:flex sm:flex-wrap">
              <AdminStatusBadge status={selected.accountStatus} variant={selected.accountStatus === "ACTIVE" ? "success" : "warning"} />
              {selected.verification.identity === "VERIFIED" && <AdminStatusBadge status="verified" variant="info" />}
              {selected.premium && <AdminStatusBadge status="premium" variant="info" />}
            </div>

            <AdminTabStrip
              active={detailTab}
              onChange={setDetailTab}
              tabs={[
                { id: "overview", label: "Overview" },
                { id: "listings", label: "Listings", count: detail?.listings.length },
                { id: "payments", label: "Payments", count: detail?.payments.length },
                { id: "activity", label: "Activity", count: detail?.activity.length },
              ]}
            />

            {detailTab === "overview" && (
              <>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Metric label="Listings" value={selected.listingCount ?? 0} />
                  <Metric label="Enquiries" value={selected.enquiryCount ?? 0} />
                  <Metric label="Revenue" value={`$${selected.revenue ?? 0}`} />
                  <Metric label="Performance" value={selected.performanceScore} />
                  <Metric label="Warnings" value={selected.warnings} />
                  <Metric label="City" value={selected.city ?? "-"} />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-slate-500">Admin actions</p>
                  <div className="grid gap-2 sm:flex sm:flex-wrap">
                    {selected.accountStatus !== "ACTIVE" && (
                      <Button onClick={() => void runAction(selected.id, "activate")}>Activate</Button>
                    )}
                    {selected.accountStatus === "ACTIVE" && (
                      <>
                        <Button variant="secondary" onClick={() => requestUserAction("suspend", "Suspend user")}>
                          Suspend
                        </Button>
                        <Button variant="secondary" onClick={() => requestUserAction("block", "Block user", { danger: true })}>
                          Block
                        </Button>
                      </>
                    )}
                    <Button variant="secondary" onClick={() => requestUserAction("warn", "Warn user")}>
                      Warn
                    </Button>
                    <Button variant="secondary" onClick={() => void runAction(selected.id, "set_premium", { premium: !selected.premium })}>
                      {selected.premium ? "Remove premium" : "Grant premium"}
                    </Button>
                    <Button variant="secondary" onClick={() => requestUserAction("terminate_sessions", "Force logout", { reasonRequired: false })}>
                      Force logout
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-slate-500">Team roles & dashboard access</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {ASSIGNABLE_ROLES.map((roleName) => (
                      <label key={roleName} className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-slate-950/50 px-3 py-2 text-xs text-slate-300">
                        <span>{roleName.replace(/_/g, " ")}</span>
                        <input
                          type="checkbox"
                          checked={selected.roles.includes(roleName)}
                          onChange={(event) => void toggleRole(selected, roleName, event.target.checked)}
                        />
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500">Roles unlock their matching dashboards and are written to the audit log.</p>
                </div>
              </>
            )}

            {detailTab === "listings" && (
              <div className="space-y-2">
                {(detail?.listings ?? []).length === 0 ? (
                  <p className="text-sm text-slate-500">No listings owned by this user.</p>
                ) : (
                  detail?.listings.map((l) => (
                    <div key={l.id} className="rounded-xl border border-white/[0.06] bg-slate-950/50 p-3 text-sm">
                      <p className="font-medium text-white">{l.title}</p>
                      <p className="text-xs text-slate-500">{l.status} - ${l.price ?? 0} - {l.views ?? 0} views</p>
                    </div>
                  ))
                )}
              </div>
            )}

            {detailTab === "payments" && (
              <div className="space-y-2">
                {(detail?.payments ?? []).length === 0 ? (
                  <p className="text-sm text-slate-500">No payment history.</p>
                ) : (
                  detail?.payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-slate-950/50 p-3 text-sm">
                      <div>
                        <p className="font-medium text-white">${p.amount}</p>
                        <p className="text-xs text-slate-500">{p.plan ?? "payment"} - {p.status}</p>
                      </div>
                      <Wallet className="size-4 text-slate-500" />
                    </div>
                  ))
                )}
              </div>
            )}

            {detailTab === "activity" && (
              <div className="space-y-2">
                {(detail?.activity ?? []).length === 0 ? (
                  <p className="text-sm text-slate-500">No audit events for this user.</p>
                ) : (
                  detail?.activity.map((a) => (
                    <div key={a.id} className="flex gap-2 rounded-xl border border-white/[0.06] bg-slate-950/50 p-3 text-sm">
                      <History className="mt-0.5 size-4 shrink-0 text-slate-500" />
                      <div>
                        <p className="text-slate-200">{a.action.replace(/_/g, " ")}</p>
                        <p className="text-xs text-slate-500">{a.actorName} - {new Date(a.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </AdminDrawer>

      {notifyOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={() => setNotifyOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white">Notify {bulkSelected.size} users</h3>
            <input
              value={notifySubject}
              onChange={(e) => setNotifySubject(e.target.value)}
              className="mt-4 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
              placeholder="Subject"
            />
            <textarea
              value={notifyBody}
              onChange={(e) => setNotifyBody(e.target.value)}
              rows={4}
              className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
              placeholder="Message body..."
            />
            <div className="mt-4 grid gap-2 sm:flex sm:justify-end">
              <Button variant="secondary" onClick={() => setNotifyOpen(false)}>Cancel</Button>
              <Button onClick={() => void sendNotify()}>
                <MessageSquare className="size-4" /> Send
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-slate-950/50 p-3">
      <p className="text-[10px] font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 font-bold text-white">{value}</p>
    </div>
  );
}
