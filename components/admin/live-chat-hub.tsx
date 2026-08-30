"use client";

import { Activity, Bell, BookOpen, Building2, CheckCircle2, Clock, GraduationCap, Headphones, Loader2, MessageSquare, NotebookPen, RefreshCw, Save, Search, Send, Settings, Shield, SlidersHorizontal, Tag, Trash2, UserCog, UserPlus, Users, Wifi } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { LiveChatConversationView, LiveChatInboxView, LiveChatMessageView } from "@/lib/live-chat/types";

const FILTERS = [
  ["new", "New"],
  ["unassigned", "Unassigned"],
  ["mine", "Mine"],
  ["open", "Open"],
  ["waiting", "Waiting"],
  ["follow-up", "Follow-up"],
  ["resolved", "Resolved"],
] as const;

type LiveChatPanel = "inbox" | "visitors" | "profile" | "settings";

export function LiveChatHub() {
  const [data, setData] = useState<LiveChatInboxView | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState("open");
  const [query, setQuery] = useState("");
  const [queryDraft, setQueryDraft] = useState("");
  const [panel, setPanel] = useState<LiveChatPanel>("inbox");
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadingInbox(true);
    const params = new URLSearchParams();
    if (activeId) params.set("conversationId", activeId);
    if (filter) params.set("filter", filter);
    if (query.trim()) params.set("q", query.trim());
    const result = await apiFetch<LiveChatInboxView>(`/api/v1/admin/live-chat?${params.toString()}`, { cache: "no-store" });
    if (result.data) {
      setData(result.data);
      setError(null);
      if (!activeId && result.data.conversations[0]) setActiveId(result.data.conversations[0].id);
    } else {
      setError(result.error?.message ?? "Live Chat could not be loaded.");
    }
    setLoadingInbox(false);
  }, [activeId, filter, query]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, activeId ? 15000 : 20000);
    return () => window.clearInterval(interval);
  }, [activeId, load]);

  const activeConversation = useMemo(
    () => data?.conversations.find((conversation) => conversation.id === activeId) ?? data?.conversations[0] ?? null,
    [activeId, data?.conversations],
  );

  async function action(body: Record<string, unknown>, success = "Action completed.") {
    setBusy(String(body.action ?? "action"));
    setError(null);
    const result = await apiFetch("/api/v1/admin/live-chat", {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (result.error) {
      setError(result.error.message);
    } else {
      setNotice(success);
      window.setTimeout(() => setNotice(null), 2500);
      await load();
    }
    setBusy(null);
  }

  async function sendMessage() {
    if (!activeConversation || !draft.trim()) return;
    await action({ action: "send_message", conversationId: activeConversation.id, body: draft }, "Message sent.");
    setDraft("");
  }

  async function addNote() {
    if (!activeConversation || !note.trim()) return;
    await action({ action: "internal_note", conversationId: activeConversation.id, body: note }, "Internal note saved.");
    setNote("");
  }

  async function startConversation(visitorId: string, message?: string) {
    await action({
      action: "start_conversation",
      visitorId,
      body: message || "Hi, I am from HouseLink. I noticed you are browsing and can help if you have questions.",
    }, "Proactive message sent.");
  }

  if (!data) {
    return (
      <section className="rounded-lg border border-white/10 bg-slate-900/70 p-6 text-slate-200">
        <div className="flex items-center gap-2 text-sm"><Loader2 className="size-4 animate-spin" /> Loading HouseLink Live...</div>
        {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {data.setupRequired ? (
        <section className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-4 text-amber-100">
          <p className="text-sm font-black uppercase tracking-wider">Live Chat database setup required</p>
          <p className="mt-2 text-sm leading-6">{data.setupMessage || "Run the Live Chat Prisma migration before using the inbox."}</p>
        </section>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={MessageSquare} label="30-day chats" value={data.analytics.totalConversations} />
        <Metric icon={Activity} label="Active visitors" value={data.analytics.activeVisitors} tone="emerald" />
        <Metric icon={Clock} label="Waiting" value={data.analytics.waitingConversations} tone="amber" />
        <Metric icon={UserPlus} label="Leads created" value={data.analytics.leadsCreated} tone="cyan" />
      </div>

      <section className="overflow-hidden rounded-lg border border-white/10 bg-slate-950 text-slate-100 shadow-2xl shadow-slate-950/20">
        <div className="flex flex-col gap-3 border-b border-white/10 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">HouseLink Live</p>
            <h2 className="text-xl font-black">Support and sales inbox</h2>
            <p className="text-sm text-slate-400">Live conversations, visitor journeys, proactive help, and follow-up leads.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void load()} disabled={loadingInbox}>{loadingInbox ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} Refresh</Button>
            <Button variant="secondary" onClick={() => void action({ action: "settings", ...data.settings, enabled: !data.settings.enabled }, data.settings.enabled ? "Live Chat disabled." : "Live Chat enabled.")}>
              <Settings className="size-4" /> {data.settings.enabled ? "Disable" : "Enable"}
            </Button>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto border-b border-white/10 px-4 py-3">
          {([
            ["inbox", MessageSquare, "Inbox"],
            ["visitors", Wifi, `Live visitors (${data.activeVisitors.length})`],
            ["profile", UserCog, "My profile"],
            ["settings", SlidersHorizontal, "Settings"],
          ] satisfies Array<[LiveChatPanel, LucideIcon, string]>).map(([id, Icon, label]) => (
            <button key={id} type="button" onClick={() => setPanel(id)} className={cn("inline-flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-sm font-bold", panel === id ? "border-emerald-400 bg-emerald-500/15 text-emerald-100" : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10")}>
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </div>
        {error ? <div className="border-b border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">{error}</div> : null}
        {notice ? <div className="border-b border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">{notice}</div> : null}

        {panel === "profile" ? <ProfilePanel data={data} action={action} busy={busy} /> : null}
        {panel === "settings" ? <SettingsPanel data={data} action={action} busy={busy} /> : null}
        {panel === "visitors" ? <VisitorsPanel visitors={data.activeVisitors} startConversation={startConversation} busy={busy} /> : null}

        {panel === "inbox" ? <div className="grid min-h-[660px] lg:grid-cols-[340px_minmax(0,1fr)_360px]">
          <aside className="border-b border-white/10 lg:border-b-0 lg:border-r">
            <div className="space-y-3 p-3">
              <label className="flex h-10 items-center gap-2 rounded-md border border-white/10 bg-slate-900 px-3 text-sm">
                <Search className="size-4 text-slate-500" />
                <input className="min-w-0 flex-1 bg-transparent outline-none" placeholder="Search name, phone, message..." value={queryDraft} onChange={(event) => setQueryDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") setQuery(queryDraft); }} />
                <button type="button" onClick={() => setQuery(queryDraft)} className="text-xs font-bold text-emerald-300">Search</button>
              </label>
              <div className="flex flex-wrap gap-2">
                {FILTERS.map(([id, label]) => (
                  <button key={id} type="button" onClick={() => setFilter(id)} className={cn("rounded-md border px-2.5 py-1.5 text-xs font-bold", filter === id ? "border-emerald-400 bg-emerald-500/15 text-emerald-200" : "border-white/10 bg-slate-900 text-slate-400")}>{label}</button>
                ))}
              </div>
            </div>
            <div className="max-h-[560px] overflow-y-auto border-t border-white/10">
              {loadingInbox ? <div className="flex items-center gap-2 border-b border-white/10 p-3 text-xs text-slate-400"><Loader2 className="size-3 animate-spin" /> Refreshing inbox...</div> : null}
              {data.conversations.length ? data.conversations.map((conversation) => (
                <button key={conversation.id} type="button" onClick={() => setActiveId(conversation.id)} className={cn("block w-full border-b border-white/10 p-3 text-left hover:bg-white/5", activeConversation?.id === conversation.id && "bg-emerald-500/10")}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-black">{conversation.visitor.name || "Guest visitor"}</p>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-black", statusTone(conversation.status))}>{conversation.status.replace(/_/g, " ")}</span>
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-400">{conversation.lastMessagePreview || conversation.subject || conversation.currentTitle || "No messages yet"}</p>
                  <p className="mt-2 truncate text-[11px] text-slate-500">{conversation.currentPath || conversation.visitor.currentPath || "Unknown page"}</p>
                </button>
              )) : <Empty label="No conversations in this filter." />}
            </div>
          </aside>

          <main className="flex min-h-[620px] flex-col">
            <ConversationHeader conversation={activeConversation} data={data} action={action} busy={busy} />
            <div className="flex-1 space-y-3 overflow-y-auto bg-slate-900/60 p-4">
              {data.messages.length ? data.messages.map((message) => <AdminMessage key={message.id} message={message} />) : <Empty label="Select a conversation or start one from Active Visitors." />}
            </div>
            {activeConversation ? (
              <div className="space-y-3 border-t border-white/10 p-3">
                <QuickReplies data={data} onPick={(body) => setDraft((current) => current ? `${current}\n${body}` : body)} />
                <ContextActions conversation={activeConversation} action={action} />
                <div className="flex gap-2">
                  <textarea className="min-h-12 flex-1 resize-none rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-400" placeholder="Reply to visitor..." value={draft} onChange={(event) => setDraft(event.target.value)} />
                  <Button onClick={() => void sendMessage()} disabled={!draft.trim() || busy === "send_message"}>{busy === "send_message" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Send reply</Button>
                </div>
                <div className="flex gap-2">
                  <input className="h-10 flex-1 rounded-md border border-amber-400/20 bg-amber-400/10 px-3 text-sm outline-none placeholder:text-amber-100/50" placeholder="Internal note - never shown to visitor" value={note} onChange={(event) => setNote(event.target.value)} />
                  <Button variant="secondary" onClick={() => void addNote()} disabled={!note.trim() || busy === "internal_note"}>{busy === "internal_note" ? <Loader2 className="size-4 animate-spin" /> : <NotebookPen className="size-4" />} Note</Button>
                </div>
              </div>
            ) : null}
          </main>

          <aside className="border-t border-white/10 lg:border-l lg:border-t-0">
            <div className="max-h-[680px] space-y-4 overflow-y-auto p-4">
              <ContextPanel conversation={activeConversation} events={data.events} startConversation={startConversation} visitors={data.activeVisitors} />
              <ManagementPanel data={data} activeConversation={activeConversation} action={action} busy={busy} />
            </div>
          </aside>
        </div> : null}
      </section>
    </div>
  );
}

function Metric({ icon: Icon, label, value, tone = "slate" }: { icon: typeof MessageSquare; label: string; value: number | string; tone?: "slate" | "emerald" | "amber" | "cyan" }) {
  const tones = { slate: "text-slate-300 bg-slate-800", emerald: "text-emerald-200 bg-emerald-500/15", amber: "text-amber-200 bg-amber-500/15", cyan: "text-cyan-200 bg-cyan-500/15" };
  return (
    <div className="rounded-lg border border-white/10 bg-slate-900/70 p-4">
      <div className="flex items-center justify-between">
        <span className={cn("flex size-10 items-center justify-center rounded-md", tones[tone])}><Icon className="size-5" /></span>
        <p className="text-2xl font-black text-white">{value}</p>
      </div>
      <p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
    </div>
  );
}

function ConversationHeader({ conversation, data, action, busy }: { conversation: LiveChatConversationView | null; data: LiveChatInboxView; action: (body: Record<string, unknown>, success?: string) => Promise<void>; busy: string | null }) {
  if (!conversation) return <div className="border-b border-white/10 p-4 text-sm text-slate-400">No conversation selected.</div>;
  return (
    <div className="border-b border-white/10 p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-lg font-black">{conversation.visitor.name || "Guest visitor"}</p>
          <p className="text-sm text-slate-400">{conversation.subject || conversation.currentTitle || "Live conversation"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select className="h-10 rounded-md border border-white/10 bg-slate-900 px-2 text-sm" value={conversation.status} onChange={(event) => void action({ action: "status", conversationId: conversation.id, status: event.target.value }, "Status updated.")}>
            {["NEW", "OPEN", "WAITING_FOR_CUSTOMER", "FOLLOW_UP", "RESOLVED", "CLOSED"].map((status) => <option key={status} value={status}>{status.replace(/_/g, " ")}</option>)}
          </select>
          <select className="h-10 rounded-md border border-white/10 bg-slate-900 px-2 text-sm" value={conversation.department?.id || ""} onChange={(event) => void action({ action: "transfer", conversationId: conversation.id, departmentId: event.target.value || undefined, agentId: conversation.assignedAgent?.id }, "Conversation transferred.")}>
            <option value="">No department</option>
            {data.departments.filter((department) => department.active).map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
          </select>
          <select className="h-10 rounded-md border border-white/10 bg-slate-900 px-2 text-sm" value={conversation.assignedAgent?.id || ""} onChange={(event) => void action({ action: "assign", conversationId: conversation.id, agentId: event.target.value || undefined, departmentId: conversation.department?.id }, "Conversation assigned.")}>
            <option value="">Unassigned</option>
            {data.agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.displayName}</option>)}
          </select>
          <Button
            variant="secondary"
            onClick={() => {
              if (window.confirm("Delete this conversation permanently?")) void action({ action: "delete_conversation", conversationId: conversation.id }, "Conversation deleted.");
            }}
            disabled={busy === "delete_conversation"}
          >
            {busy === "delete_conversation" ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Delete
          </Button>
          {busy === "assign" ? <Loader2 className="size-4 animate-spin text-emerald-300" /> : null}
        </div>
      </div>
    </div>
  );
}

function AdminMessage({ message }: { message: LiveChatMessageView }) {
  const system = message.messageType === "SYSTEM";
  const internal = message.internal;
  const staff = message.senderKind === "STAFF";
  if (system) return <p className="mx-auto max-w-xl rounded-full bg-slate-800 px-3 py-1 text-center text-xs text-slate-300">{message.body}</p>;
  const card = message.metadata && typeof message.metadata === "object" ? message.metadata as { url?: string; title?: string; kind?: string } : null;
  return (
    <div className={cn("flex", staff ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[78%] rounded-lg border px-3 py-2 text-sm", internal ? "border-amber-400/30 bg-amber-400/10 text-amber-100" : staff ? "border-emerald-400/20 bg-emerald-500 text-white" : "border-white/10 bg-slate-950 text-slate-100")}>
        <p className="mb-1 text-[11px] font-black uppercase opacity-70">{internal ? "Internal note" : message.senderName || message.senderKind}</p>
        <p className="whitespace-pre-wrap leading-6">{message.body}</p>
        {card?.url ? <a className="mt-2 block rounded-md bg-white/15 px-3 py-2 text-xs font-bold underline-offset-2 hover:underline" href={card.url} target="_blank" rel="noreferrer">{card.title || card.url}</a> : null}
        <p className="mt-1 text-[10px] opacity-60">{new Date(message.createdAt).toLocaleString()}</p>
      </div>
    </div>
  );
}

function ContextActions({ conversation, action }: { conversation: LiveChatConversationView; action: (body: Record<string, unknown>, success?: string) => Promise<void> }) {
  const path = conversation.visitor.currentPath || conversation.currentPath || "";
  const cleanPath = path.startsWith("/") ? path : "/";
  const isLibrary = cleanPath.includes("/library/");
  const isProperty = cleanPath.includes("/listings/") || cleanPath.includes("/rent/") || cleanPath.includes("/property-for-sale/");
  const isAcademy = cleanPath.includes("/academy");
  const title = conversation.visitor.currentTitle || conversation.currentTitle || conversation.subject || "HouseLink page";
  const messageType = isLibrary ? "PRODUCT_CARD" : isProperty ? "PROPERTY_CARD" : isAcademy ? "COURSE_CARD" : "LINK";
  const Icon = isLibrary ? BookOpen : isProperty ? Building2 : isAcademy ? GraduationCap : MessageSquare;
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="secondary"
        onClick={() => void action({
          action: "send_message",
          conversationId: conversation.id,
          body: `Here is the page you were looking at: ${title}`,
          messageType,
          metadata: { url: cleanPath, title, kind: messageType },
        }, "Context card sent.")}
      >
        <Icon className="size-4" /> Send context card
      </Button>
    </div>
  );
}

function QuickReplies({ data, onPick }: { data: LiveChatInboxView; onPick: (body: string) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {data.quickReplies.filter((reply) => reply.active).slice(0, 8).map((reply) => (
        <button key={reply.id} type="button" onClick={() => onPick(reply.body)} className="shrink-0 rounded-full border border-white/10 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-300 hover:border-emerald-400 hover:text-emerald-200">
          {reply.shortcut} {reply.title}
        </button>
      ))}
    </div>
  );
}

function ContextPanel({ conversation, events, visitors, startConversation }: { conversation: LiveChatConversationView | null; events: LiveChatInboxView["events"]; visitors: LiveChatInboxView["activeVisitors"]; startConversation: (visitorId: string, message?: string) => Promise<void> }) {
  return (
    <section className="rounded-lg border border-white/10 bg-slate-900 p-4">
      <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-300"><Users className="size-4" /> Visitor context</h3>
      {conversation ? (
        <div className="mt-4 space-y-3 text-sm">
          <Info label="Contact" value={[conversation.visitor.phone, conversation.visitor.email].filter(Boolean).join(" / ") || "Not captured"} />
          <Info label="Current page" value={conversation.visitor.currentTitle || conversation.visitor.currentPath || "Unknown"} />
          <Info label="Source" value={conversation.visitor.utmSource || conversation.visitor.source || "Direct / Unknown"} />
          <Info label="Landing page" value={conversation.visitor.landingPage || "Unknown"} />
          <Info label="Device" value={conversation.visitor.deviceType || "Unknown"} />
          <Button variant="secondary" onClick={() => void startConversation(conversation.visitor.id)}><Bell className="size-4" /> Send proactive nudge</Button>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {visitors.slice(0, 8).map((visitor) => (
            <div key={visitor.id} className="rounded-md border border-white/10 bg-slate-950 p-3">
              <p className="text-sm font-bold">{visitor.name || "Guest visitor"}</p>
              <p className="truncate text-xs text-slate-400">{visitor.currentTitle || visitor.currentPath || "Browsing"}</p>
              <Button className="mt-2" variant="secondary" onClick={() => void startConversation(visitor.id)}><Send className="size-4" /> Start chat</Button>
            </div>
          ))}
        </div>
      )}
      {events.length ? (
        <div className="mt-5 border-t border-white/10 pt-4">
          <p className="text-xs font-bold uppercase text-slate-500">Recent journey</p>
          <div className="mt-2 space-y-2">
            {events.slice(0, 10).map((event) => (
              <div key={event.id} className="border-l border-emerald-500/40 pl-3">
                <p className="text-xs font-bold text-slate-200">{event.eventType.replace(/_/g, " ")}</p>
                <p className="truncate text-[11px] text-slate-500">{event.title || event.path || new Date(event.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function VisitorsPanel({ visitors, startConversation, busy }: { visitors: LiveChatInboxView["activeVisitors"]; startConversation: (visitorId: string, message?: string) => Promise<void>; busy: string | null }) {
  return (
    <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
      {visitors.length ? visitors.map((visitor) => (
        <article key={visitor.id} className="rounded-lg border border-white/10 bg-slate-900 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-black text-white">{visitor.name || "Guest visitor"}</p>
              <p className="mt-1 truncate text-sm text-slate-400">{visitor.currentTitle || visitor.currentPath || "Browsing HouseLink"}</p>
            </div>
            <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-[11px] font-black text-emerald-200">LIVE</span>
          </div>
          <div className="mt-4 grid gap-2 text-xs text-slate-400">
            <Info label="Contact" value={[visitor.phone, visitor.email].filter(Boolean).join(" / ") || "Not captured yet"} />
            <Info label="Source" value={visitor.utmSource || visitor.source || "Direct / Unknown"} />
            <Info label="Journey" value={`${Math.round(visitor.sessionSeconds / 60)} min session, ${Math.round(visitor.pageSeconds / 60)} min on page`} />
          </div>
          <Button className="mt-4 w-full" onClick={() => void startConversation(visitor.id)} disabled={busy === "start_conversation"}>
            {busy === "start_conversation" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Start helpful chat
          </Button>
        </article>
      )) : <Empty label="No live visitors in the last five minutes." />}
    </div>
  );
}

function ProfilePanel({ data, action, busy }: { data: LiveChatInboxView; action: (body: Record<string, unknown>, success?: string) => Promise<void>; busy: string | null }) {
  const agent = data.currentAgent;
  const [displayName, setDisplayName] = useState(agent?.displayName || "");
  const [title, setTitle] = useState(agent?.title || "");
  const [avatarUrl, setAvatarUrl] = useState(agent?.avatarUrl || "");
  const [availability, setAvailability] = useState(agent?.availability || "ONLINE");
  const [departmentId, setDepartmentId] = useState(agent?.department?.id || "");
  const [publicIntro, setPublicIntro] = useState("");
  return (
    <div className="grid gap-4 p-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <section className="rounded-lg border border-white/10 bg-slate-900 p-4">
        <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-300"><UserCog className="size-4" /> Public team profile</h3>
        <div className="mt-4 flex items-center gap-3">
          <span
            className="flex size-14 items-center justify-center overflow-hidden rounded-lg bg-emerald-500 bg-cover bg-center text-xl font-black text-white"
            style={avatarUrl ? { backgroundImage: `url(${avatarUrl})` } : undefined}
          >
            {avatarUrl ? null : (displayName || "H").slice(0, 1).toUpperCase()}
          </span>
          <div>
            <p className="font-black text-white">{displayName || "HouseLink Team"}</p>
            <p className="text-sm text-slate-400">{title || "HouseLink Support"}</p>
            <p className="mt-1 text-xs text-emerald-300">{availability}</p>
          </div>
        </div>
      </section>
      <section className="rounded-lg border border-white/10 bg-slate-900 p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Display name" value={displayName} onChange={setDisplayName} placeholder="e.g. Tendai from HouseLink" />
          <Field label="Title" value={title} onChange={setTitle} placeholder="e.g. Property & Library Support" />
          <Field label="Profile photo URL" value={avatarUrl} onChange={setAvatarUrl} placeholder="https://..." />
          <label className="block">
            <span className="text-xs font-black uppercase text-slate-500">Availability</span>
            <select className="mt-1 h-11 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none" value={availability} onChange={(event) => setAvailability(event.target.value)}>
              {["ONLINE", "AWAY", "BUSY", "OFFLINE"].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label className="block md:col-span-2">
            <span className="text-xs font-black uppercase text-slate-500">Department</span>
            <select className="mt-1 h-11 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none" value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>
              <option value="">General support</option>
              {data.departments.filter((department) => department.active).map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
            </select>
          </label>
          <label className="block md:col-span-2">
            <span className="text-xs font-black uppercase text-slate-500">Short public intro</span>
            <textarea className="mt-1 min-h-24 w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none" value={publicIntro} onChange={(event) => setPublicIntro(event.target.value)} placeholder="Friendly line shown internally for consistent support tone." />
          </label>
        </div>
        <Button className="mt-4" onClick={() => void action({ action: "profile", displayName, title, avatarUrl, availability, departmentId, publicIntro }, "Profile saved.")} disabled={busy === "profile"}>
          {busy === "profile" ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save profile
        </Button>
      </section>
    </div>
  );
}

function SettingsPanel({ data, action, busy }: { data: LiveChatInboxView; action: (body: Record<string, unknown>, success?: string) => Promise<void>; busy: string | null }) {
  const [enabled, setEnabled] = useState(data.settings.enabled);
  const [proactiveEnabled, setProactiveEnabled] = useState(data.settings.proactiveEnabled);
  const [soundEnabled, setSoundEnabled] = useState(data.settings.soundEnabled);
  const [requireContact, setRequireContact] = useState(data.settings.requireContact);
  const [widgetGreeting, setWidgetGreeting] = useState(data.settings.widgetGreeting);
  const [welcomeMessage, setWelcomeMessage] = useState(data.settings.welcomeMessage);
  const [offlineMessage, setOfflineMessage] = useState(data.settings.offlineMessage);
  const [privacyNotice, setPrivacyNotice] = useState(data.settings.privacyNotice);
  return (
    <div className="p-4">
      <section className="rounded-lg border border-white/10 bg-slate-900 p-4">
        <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-300"><SlidersHorizontal className="size-4" /> Live Chat settings</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Toggle label="Chat enabled" checked={enabled} onChange={setEnabled} />
          <Toggle label="Proactive messages" checked={proactiveEnabled} onChange={setProactiveEnabled} />
          <Toggle label="Sound alerts" checked={soundEnabled} onChange={setSoundEnabled} />
          <Toggle label="Require contact before chat" checked={requireContact} onChange={setRequireContact} />
          <Field label="Launcher greeting" value={widgetGreeting} onChange={setWidgetGreeting} placeholder="Hi, need help with HouseLink?" />
          <Field label="Privacy note" value={privacyNotice} onChange={setPrivacyNotice} placeholder="How chat context is used" />
          <TextField label="Welcome message" value={welcomeMessage} onChange={setWelcomeMessage} />
          <TextField label="Offline message" value={offlineMessage} onChange={setOfflineMessage} />
        </div>
        <Button className="mt-4" onClick={() => void action({ action: "settings", enabled, proactiveEnabled, soundEnabled, requireContact, widgetGreeting, welcomeMessage, offlineMessage, privacyNotice }, "Live Chat settings saved.")} disabled={busy === "settings"}>
          {busy === "settings" ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save settings
        </Button>
      </section>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase text-slate-500">{label}</span>
      <input className="mt-1 h-11 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none focus:border-emerald-400" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase text-slate-500">{label}</span>
      <textarea className="mt-1 min-h-24 w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-slate-950 px-3 py-3">
      <span className="text-sm font-bold text-slate-200">{label}</span>
      <input type="checkbox" className="size-5 accent-emerald-500" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

function ManagementPanel({ data, activeConversation, action, busy }: { data: LiveChatInboxView; activeConversation: LiveChatConversationView | null; action: (body: Record<string, unknown>, success?: string) => Promise<void>; busy: string | null }) {
  const [leadType, setLeadType] = useState("GENERAL");
  const [leadNote, setLeadNote] = useState("");
  const [replyTitle, setReplyTitle] = useState("");
  const [replyBody, setReplyBody] = useState("");
  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-white/10 bg-slate-900 p-4">
        <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-300"><Tag className="size-4" /> Tags and leads</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {data.tags.filter((tag) => tag.active).slice(0, 10).map((tag) => <span key={tag.id} className="rounded-full px-2 py-1 text-[11px] font-bold" style={{ backgroundColor: `${tag.color}22`, color: tag.color }}>{tag.name}</span>)}
        </div>
        {activeConversation ? (
          <div className="mt-4 space-y-2">
            <select className="h-10 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-sm" value={leadType} onChange={(event) => setLeadType(event.target.value)}>
              {["GENERAL", "LIBRARY", "PROPERTY", "ACADEMY", "SUPPORT"].map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            <textarea className="min-h-20 w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-sm outline-none" placeholder="Lead note or follow-up context" value={leadNote} onChange={(event) => setLeadNote(event.target.value)} />
            <Button onClick={() => void action({ action: "lead", conversationId: activeConversation.id, leadType, notes: leadNote }, "Lead created.")} disabled={busy === "lead"}><UserPlus className="size-4" /> Convert to lead</Button>
          </div>
        ) : null}
      </section>

      <section className="rounded-lg border border-white/10 bg-slate-900 p-4">
        <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-300"><Shield className="size-4" /> Settings</h3>
        <div className="mt-3 space-y-2 text-sm text-slate-400">
          <p><CheckCircle2 className="mr-1 inline size-4 text-emerald-300" /> Widget: {data.settings.enabled ? "enabled" : "disabled"}</p>
          <p><CheckCircle2 className="mr-1 inline size-4 text-emerald-300" /> Proactive rules: {data.settings.proactiveEnabled ? "enabled" : "disabled"}</p>
          <p><CheckCircle2 className="mr-1 inline size-4 text-emerald-300" /> Sound: {data.settings.soundEnabled ? "enabled" : "disabled"}</p>
        </div>
      </section>

      <section className="rounded-lg border border-white/10 bg-slate-900 p-4">
        <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-300"><Headphones className="size-4" /> Quick reply</h3>
        <input className="mt-3 h-10 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-sm outline-none" placeholder="Title" value={replyTitle} onChange={(event) => setReplyTitle(event.target.value)} />
        <textarea className="mt-2 min-h-20 w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-sm outline-none" placeholder="Response text" value={replyBody} onChange={(event) => setReplyBody(event.target.value)} />
        <Button className="mt-2" variant="secondary" onClick={() => void action({ action: "quick_reply", title: replyTitle, body: replyBody }, "Quick reply saved.").then(() => { setReplyTitle(""); setReplyBody(""); })} disabled={!replyTitle.trim() || !replyBody.trim()}>
          Save reply
        </Button>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-slate-950 p-3">
      <p className="text-[11px] font-black uppercase text-slate-500">{label}</p>
      <p className="mt-1 break-words font-semibold text-slate-100">{value}</p>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="p-6 text-center text-sm text-slate-500">{label}</div>;
}

function statusTone(status: string) {
  if (status === "NEW") return "bg-cyan-500/15 text-cyan-200";
  if (status === "WAITING_FOR_CUSTOMER") return "bg-amber-500/15 text-amber-200";
  if (status === "RESOLVED" || status === "CLOSED") return "bg-slate-700 text-slate-300";
  return "bg-emerald-500/15 text-emerald-200";
}
