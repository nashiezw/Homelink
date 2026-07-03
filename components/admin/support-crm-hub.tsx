"use client";

import { useCallback, useEffect, useState } from "react";
import { Headphones, Plus } from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import type { SupportTicket } from "@/lib/admin/types";
import { AdminActionFeedback } from "@/components/admin/action-feedback";
import { AdminActionDialog, type AdminDialogConfig } from "@/components/admin/action-dialog";

const ASSIGNEES = ["Support Team", "Billing Team", "Trust & Safety", "Technical Support"];

function teamsForRoles(roles: string[]) {
  if (roles.includes("ADMIN")) return ASSIGNEES;
  return [
    roles.includes("SUPPORT") ? "Support Team" : "",
    roles.includes("BILLING") ? "Billing Team" : "",
    roles.includes("TRUST_SAFETY") ? "Trust & Safety" : "",
    roles.includes("TECH_SUPPORT") ? "Technical Support" : "",
  ].filter(Boolean);
}

export function SupportCrmHub() {
  const { user, showToast } = useApp();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [filter, setFilter] = useState<"all" | "open">("open");
  const [teamFilter, setTeamFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    userName: "",
    subject: "",
    category: "General",
    priority: "MEDIUM" as "HIGH" | "MEDIUM" | "LOW",
    body: "",
    customerEmail: "",
    team: "Support Team",
  });
  const [feedback, setFeedback] = useState<{
    title: string;
    message: string;
    tone?: "success" | "warning" | "danger" | "info";
    details?: Array<{ label: string; value: string | number | undefined }>;
  } | null>(null);
  const [dialog, setDialog] = useState<AdminDialogConfig | null>(null);

  const load = useCallback(async () => {
    const result = await apiFetch<{ support: SupportTicket[] }>("/api/v1/admin/control-center?section=support");
    const allowedTeams = teamsForRoles(user?.roles ?? []);
    const list = (result.data?.support ?? []).filter((ticket) => {
      const ticketTeam = ticket.team ?? ticket.assignee;
      if (allowedTeams.length && !allowedTeams.includes(ticketTeam)) return false;
      if (teamFilter !== "all" && ticketTeam !== teamFilter) return false;
      return true;
    });
    setTickets(filter === "open" ? list.filter((t) => t.status !== "RESOLVED") : list);
  }, [filter, teamFilter, user?.roles]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAction(action: string, id: string, extra?: Record<string, unknown>) {
    if (action === "resolve_ticket" || action === "escalate_ticket") {
      setDialog({
        title: action === "resolve_ticket" ? "Resolve ticket" : "Escalate ticket",
        message: `Confirm ${action.replace(/_/g, " ")} for this support ticket. The customer history will be updated.`,
        tone: action === "escalate_ticket" ? "warning" : "success",
        confirmLabel: action === "resolve_ticket" ? "Resolve" : "Escalate",
        fields:
          action === "escalate_ticket"
            ? [
                {
                  name: "team",
                  label: "Escalation team",
                  type: "select",
                  required: true,
                  options: ASSIGNEES.map((team) => ({ label: team, value: team })),
                },
                { name: "reason", label: "Escalation reason", type: "textarea", required: true },
              ]
            : [{ name: "reason", label: "Resolution note", type: "textarea", required: false }],
        onConfirm: (values) => runSupportAction(action, id, { ...extra, team: values.team, reason: values.reason }),
      });
      return;
    }
    await runSupportAction(action, id, extra);
  }

  async function runSupportAction(action: string, id: string, extra?: Record<string, unknown>) {
    const result = await apiFetch("/api/v1/admin/actions", {
      method: "POST",
      body: JSON.stringify({ action, id, ...extra }),
    });
    if (result.error) showToast(result.error.message ?? "Action failed.", "error");
    else {
      showToast("Ticket updated.");
      setFeedback({
        title: "Support ticket updated",
        message: `${action.replace(/_/g, " ")} completed successfully.`,
        tone: action === "escalate_ticket" ? "warning" : "success",
        details: [
          { label: "Ticket", value: id },
          { label: "Action", value: action.replace(/_/g, " ") },
          { label: "Assignee", value: String(extra?.assignee ?? "") || "Unchanged" },
        ],
      });
      void load();
    }
  }

  async function createTicket() {
    const result = await apiFetch("/api/v1/admin/actions", {
      method: "POST",
      body: JSON.stringify({ action: "create_ticket", ...form }),
    });
    if (result.error) showToast(result.error.message ?? "Could not create ticket.", "error");
    else {
      showToast("Ticket created.");
      setFeedback({
        title: "Support ticket created",
        message: "The ticket was added to the support queue.",
        tone: form.priority === "HIGH" ? "warning" : "success",
        details: [
          { label: "Customer", value: form.userName },
          { label: "Subject", value: form.subject },
          { label: "Priority", value: form.priority },
        ],
      });
      setShowCreate(false);
      setForm({ userName: "", subject: "", category: "General", priority: "MEDIUM", body: "", customerEmail: "", team: "Support Team" });
      void load();
    }
  }

  const counts = ["OPEN", "PENDING", "WAITING", "RESOLVED", "ESCALATED"].map((status) => ({
    status,
    count: tickets.filter((t) => t.status === status || (status === "WAITING" && t.status === "PENDING")).length,
  }));
  const visibleTeams = teamsForRoles(user?.roles ?? []);

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Button variant={filter === "open" ? "primary" : "secondary"} onClick={() => setFilter("open")}>
            Open queue
          </Button>
          <Button variant={filter === "all" ? "primary" : "secondary"} onClick={() => setFilter("all")}>
            All tickets
          </Button>
          <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white">
            <option value="all">My teams</option>
            {(visibleTeams.length ? visibleTeams : ASSIGNEES).map((team) => (
              <option key={team} value={team}>{team}</option>
            ))}
          </select>
        </div>
        <Button onClick={() => setShowCreate((v) => !v)}>
          <Plus className="mr-2 size-4" />
          New ticket
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {counts.map(({ status, count }) => (
          <div key={status} className="rounded-xl border border-white/10 bg-slate-950/40 p-3 text-center">
            <p className="text-xs uppercase tracking-wide text-slate-500">{status}</p>
            <p className="mt-1 text-2xl font-bold text-white">{count}</p>
          </div>
        ))}
      </div>

      {showCreate && (
        <section className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-5">
          <h3 className="font-semibold text-white">Create support ticket</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input
              className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
              placeholder="Customer name"
              value={form.userName}
              onChange={(e) => setForm((f) => ({ ...f, userName: e.target.value }))}
            />
            <input
              className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
              placeholder="Subject"
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            />
            <input
              className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
              placeholder="Customer email"
              value={form.customerEmail}
              onChange={(e) => setForm((f) => ({ ...f, customerEmail: e.target.value }))}
            />
            <select
              className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            >
              {["General", "Technical", "Account", "Billing", "Trust & Safety"].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
              value={form.team}
              onChange={(e) => setForm((f) => ({ ...f, team: e.target.value }))}
            >
              {ASSIGNEES.map((team) => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
            <select
              className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as typeof form.priority }))}
            >
              <option value="HIGH">High priority</option>
              <option value="MEDIUM">Medium priority</option>
              <option value="LOW">Low priority</option>
            </select>
            <textarea
              className="sm:col-span-2 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
              placeholder="Ticket details..."
              rows={3}
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            />
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => void createTicket()}>Create ticket</Button>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
          </div>
        </section>
      )}

      <div className="space-y-3">
        {tickets.length === 0 ? (
          <p className="text-sm text-slate-400">No tickets in this queue.</p>
        ) : (
          tickets.map((ticket) => (
            <article key={ticket.id} className="rounded-xl border border-white/10 bg-slate-950/50 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase text-cyan-400">
                    <Headphones className="size-3.5" />
                    {ticket.category}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-white">{ticket.subject}</p>
                  <p className="mt-1 text-xs font-semibold uppercase text-emerald-300">{ticket.team ?? ticket.assignee}</p>
                  {ticket.customerEmail && <p className="mt-1 text-xs text-cyan-300">{ticket.customerEmail}</p>}
                  {ticket.escalationReason && <p className="mt-2 text-xs text-amber-200">Escalation: {ticket.escalationReason}</p>}
                  {ticket.resolutionNote && <p className="mt-2 text-xs text-emerald-200">Resolution: {ticket.resolutionNote}</p>}
                  <p className="mt-1 text-sm text-slate-400">
                    {ticket.userName} · {ticket.assignee} · {new Date(ticket.createdAt).toLocaleString()}
                  </p>
                  {ticket.body && <p className="mt-3 text-sm leading-relaxed text-slate-300">{ticket.body}</p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-300">
                    {ticket.priority}
                  </span>
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-slate-300">{ticket.status}</span>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <select
                  className="rounded-lg border border-white/10 bg-slate-900 px-2 py-1.5 text-xs text-white"
                  defaultValue={ticket.assignee}
                  onChange={(e) => void runAction("assign_ticket", ticket.id, { assignee: e.target.value })}
                >
                  {ASSIGNEES.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
                <Button variant="secondary" className="h-9" onClick={() => void runAction("escalate_ticket", ticket.id)}>
                  Escalate
                </Button>
                <Button className="h-9" onClick={() => void runAction("resolve_ticket", ticket.id)}>
                  Resolve
                </Button>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
