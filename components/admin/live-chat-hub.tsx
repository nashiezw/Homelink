"use client";

import { Activity, Bell, BookOpen, Building2, CheckCircle2, Clock, Globe2, GraduationCap, Headphones, Loader2, Mail, MapPin, MessageSquare, NotebookPen, Phone, RefreshCw, Save, Search, Send, Settings, Shield, SlidersHorizontal, Sparkles, Tag, Timer, Trash2, Upload, UserCog, UserPlus, Users, Wifi } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import { playLiveChatNotificationSound, unlockLiveChatNotificationSound } from "@/lib/live-chat/notification-sound";
import { cn } from "@/lib/utils";
import type { LiveChatConversationView, LiveChatInboxView, LiveChatMessageView } from "@/lib/live-chat/types";

const FILTERS = [
  ["all", "All"],
  ["needs-reply", "Needs reply"],
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
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [queryDraft, setQueryDraft] = useState("");
  const [panel, setPanel] = useState<LiveChatPanel>("inbox");
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [startingVisitorId, setStartingVisitorId] = useState<string | null>(null);
  const [deletedVisitorIds, setDeletedVisitorIds] = useState<string[]>([]);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const loadInFlightRef = useRef(false);
  const lastNeedsReplyCountRef = useRef(0);
  const notifiedVisitorMessageIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    const unlock = () => unlockLiveChatNotificationSound();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const load = useCallback(async (options?: { conversationId?: string | null; silent?: boolean }) => {
    if (loadInFlightRef.current) return;
    loadInFlightRef.current = true;
    if (!options?.silent) setLoadingInbox(true);
    try {
      const params = new URLSearchParams();
      const conversationId = options?.conversationId ?? activeIdRef.current;
      if (conversationId) params.set("conversationId", conversationId);
      if (filter) params.set("filter", filter);
      if (query.trim()) params.set("q", query.trim());
      const result = await apiFetch<LiveChatInboxView>(`/api/v1/admin/live-chat?${params.toString()}`, { cache: "no-store" });
      if (result.data) {
        setData(result.data);
        setError(null);
        const nextActive = activeIdRef.current;
        if (nextActive && !result.data.conversations.some((conversation) => conversation.id === nextActive)) {
          setActiveId(result.data.conversations[0]?.id ?? null);
          activeIdRef.current = result.data.conversations[0]?.id ?? null;
        } else if (!nextActive && result.data.conversations[0]) {
          setActiveId(result.data.conversations[0].id);
          activeIdRef.current = result.data.conversations[0].id;
        }
      } else {
        setError(result.error?.message ?? "Live Chat could not be loaded.");
      }
    } finally {
      if (!options?.silent) setLoadingInbox(false);
      loadInFlightRef.current = false;
    }
  }, [filter, query]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible" && panel === "inbox") void load({ silent: true });
    }, activeId ? 20000 : 30000);
    return () => window.clearInterval(interval);
  }, [activeId, load, panel]);

  const activeConversation = useMemo(
    () => data?.conversations.find((conversation) => conversation.id === activeId) ?? data?.conversations[0] ?? null,
    [activeId, data?.conversations],
  );
  const needsReplyCount = useMemo(() => data?.conversations.filter(needsReply).length ?? 0, [data?.conversations]);

  useEffect(() => {
    if (!data) return;
    const newVisitorReplies = data.conversations.filter((conversation) => {
      if (!needsReply(conversation) || !conversation.lastMessageAt) return false;
      const messageKey = `${conversation.id}:${conversation.lastMessageAt}`;
      if (notifiedVisitorMessageIdsRef.current.has(messageKey)) return false;
      notifiedVisitorMessageIdsRef.current.add(messageKey);
      return true;
    });
    if (lastNeedsReplyCountRef.current > 0 && newVisitorReplies.length) {
      if (data.settings.soundEnabled) playLiveChatNotificationSound();
      notifyInbox(newVisitorReplies[0] ?? conversationNeedingReply(data.conversations));
    }
    lastNeedsReplyCountRef.current = needsReplyCount;
    document.title = needsReplyCount ? `(${needsReplyCount}) HouseLink Live` : "HouseLink Live";
  }, [data, needsReplyCount]);

  useEffect(() => {
    if (!activeConversation?.id || !activeConversation.unreadForStaff) return;
    void apiFetch("/api/v1/admin/live-chat", {
      method: "POST",
      body: JSON.stringify({ action: "mark_staff_read", conversationId: activeConversation.id }),
    });
    setData((current) => current
      ? {
          ...current,
          conversations: current.conversations.map((conversation) => conversation.id === activeConversation.id ? { ...conversation, unreadForStaff: 0 } : conversation),
        }
      : current);
  }, [activeConversation?.id, activeConversation?.unreadForStaff]);

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
    setStartingVisitorId(visitorId);
    setError(null);
    const result = await apiFetch<{ conversationId: string }>("/api/v1/admin/live-chat", {
      method: "POST",
      body: JSON.stringify({
        action: "start_conversation",
        visitorId,
        body: message || "Hi, I am from HouseLink. I noticed you are browsing and can help if you have questions.",
      }),
    });
    if (result.error) {
      setError(result.error.message);
    } else {
      const conversationId = result.data?.conversationId;
      setNotice("Proactive message sent.");
      window.setTimeout(() => setNotice(null), 2500);
      if (conversationId) {
        setActiveId(conversationId);
        activeIdRef.current = conversationId;
        setPanel("inbox");
        await load({ conversationId });
      } else {
        await load();
      }
    }
    setStartingVisitorId(null);
  }

  function openConversation(conversationId: string) {
    setActiveId(conversationId);
    activeIdRef.current = conversationId;
    setPanel("inbox");
    void load({ conversationId });
  }

  function changeFilter(nextFilter: string) {
    setFilter(nextFilter);
    setActiveId(null);
    activeIdRef.current = null;
    setDraft("");
    setNote("");
  }

  async function deleteConversation(conversation: LiveChatConversationView) {
    if (!window.confirm("Delete this conversation from the inbox? This removes the chat history for the team, but does not block the visitor from using support later.")) return;
    setBusy(`delete_conversation:${conversation.id}`);
    setError(null);
    const result = await apiFetch<{ ok: boolean }>("/api/v1/admin/live-chat", {
      method: "POST",
      body: JSON.stringify({ action: "delete_conversation", conversationId: conversation.id }),
    });
    if (result.error) {
      setError(result.error.message);
    } else {
      setNotice("Conversation deleted.");
      window.setTimeout(() => setNotice(null), 2500);
      setDeletedVisitorIds((current) => [...new Set([...current, conversation.visitor.id])]);
      setActiveId(null);
      activeIdRef.current = null;
      setDraft("");
      setNote("");
      await load({ conversationId: null });
    }
    setBusy(null);
  }

  async function deleteConversationsInFilter() {
    if (!window.confirm(`Delete all conversations currently matching "${filterLabel(filter)}"${query.trim() ? ` and "${query.trim()}"` : ""}?`)) return;
    setBusy("delete_conversations");
    setError(null);
    const result = await apiFetch<{ count: number }>("/api/v1/admin/live-chat", {
      method: "POST",
      body: JSON.stringify({ action: "delete_conversations", filter, query }),
    });
    if (result.error) {
      setError(result.error.message);
    } else {
      setNotice(`${result.data?.count ?? 0} conversation${result.data?.count === 1 ? "" : "s"} deleted.`);
      window.setTimeout(() => setNotice(null), 2500);
      setActiveId(null);
      activeIdRef.current = null;
      setDraft("");
      setNote("");
      await load({ conversationId: null });
    }
    setBusy(null);
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

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950 text-slate-100 shadow-2xl shadow-slate-950/20">
        <div className="flex flex-col gap-3 border-b border-white/10 bg-slate-900/70 p-4 lg:flex-row lg:items-center lg:justify-between">
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
        {panel === "inbox" && needsReplyCount ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            <span className="flex items-center gap-2 font-bold"><Bell className="size-4" /> {needsReplyCount} visitor{needsReplyCount === 1 ? "" : "s"} need{needsReplyCount === 1 ? "s" : ""} a reply now</span>
            {filter !== "needs-reply" ? <button type="button" onClick={() => changeFilter("needs-reply")} className="rounded-full bg-amber-300 px-3 py-1 text-xs font-black text-slate-950">View now</button> : null}
          </div>
        ) : null}

        {panel === "profile" ? <ProfilePanel data={data} action={action} busy={busy} /> : null}
        {panel === "settings" ? <SettingsPanel data={data} action={action} busy={busy} /> : null}
        {panel === "visitors" ? <VisitorsPanel visitors={data.activeVisitors.filter((visitor) => !deletedVisitorIds.includes(visitor.id))} startConversation={startConversation} openConversation={openConversation} startingVisitorId={startingVisitorId} /> : null}

        {panel === "inbox" ? <div className="grid min-h-[660px] lg:grid-cols-[330px_minmax(0,1fr)_380px]">
          <aside className="border-b border-white/10 bg-slate-950/80 lg:border-b-0 lg:border-r lg:border-white/10">
            <div className="space-y-3 p-3">
              <label className="flex h-10 items-center gap-2 rounded-md border border-white/10 bg-slate-900 px-3 text-sm">
                <Search className="size-4 text-slate-500" />
                <input className="min-w-0 flex-1 bg-transparent outline-none" placeholder="Search name, phone, message..." value={queryDraft} onChange={(event) => setQueryDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") setQuery(queryDraft); }} />
                <button type="button" onClick={() => setQuery(queryDraft)} className="text-xs font-bold text-emerald-300">Search</button>
              </label>
              <div className="flex flex-wrap gap-2">
                {FILTERS.map(([id, label]) => (
                  <button key={id} type="button" onClick={() => changeFilter(id)} className={cn("rounded-md border px-2.5 py-1.5 text-xs font-bold", filter === id ? "border-emerald-400 bg-emerald-500/15 text-emerald-200" : "border-white/10 bg-slate-900 text-slate-400")}>{label}</button>
                ))}
              </div>
              <button
                type="button"
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-red-500/50 bg-red-600 px-3 py-2.5 text-center text-sm font-black leading-tight text-white shadow-sm shadow-red-950/20 transition hover:bg-red-500 disabled:cursor-not-allowed disabled:border-red-400/30 disabled:bg-red-950/70 disabled:text-red-100 disabled:shadow-none"
                onClick={() => void deleteConversationsInFilter()}
                disabled={!data.conversations.length || busy === "delete_conversations"}
                title={!data.conversations.length ? `No conversations in ${filterLabel(filter)} to delete` : `Delete conversations in ${filterLabel(filter)}`}
              >
                {busy === "delete_conversations" ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                {data.conversations.length ? `Delete all in ${filterLabel(filter)}` : `No chats to delete in ${filterLabel(filter)}`}
              </button>
            </div>
            <div className="max-h-[560px] overflow-y-auto border-t border-white/10">
              {loadingInbox ? <div className="flex items-center gap-2 border-b border-white/10 p-3 text-xs text-slate-400"><Loader2 className="size-3 animate-spin" /> Refreshing inbox...</div> : null}
              {data.conversations.length ? data.conversations.map((conversation) => (
                <ConversationRow
                  key={conversation.id}
                  conversation={conversation}
                  active={activeConversation?.id === conversation.id}
                  onOpen={() => {
                    setActiveId(conversation.id);
                    void load({ conversationId: conversation.id });
                  }}
                />
              )) : <Empty label="No conversations in this filter." />}
            </div>
          </aside>

          <main className="flex min-h-[620px] flex-col">
            <ConversationHeader conversation={activeConversation} data={data} action={action} busy={busy} onDelete={deleteConversation} />
            <div className="flex-1 space-y-4 overflow-y-auto bg-slate-950/70 p-4">
              {data.messages.length ? data.messages.map((message) => <AdminMessage key={message.id} message={message} />) : <Empty label="Select a conversation or start one from Active Visitors." />}
            </div>
            {activeConversation ? (
              <div className="space-y-3 border-t border-white/10 p-3">
                <QuickReplies data={data} onPick={(body) => setDraft((current) => current ? `${current}\n${body}` : body)} />
                <ContextActions conversation={activeConversation} action={action} />
                <div className="rounded-xl border border-white/10 bg-slate-900 p-2">
                  <textarea className="min-h-20 w-full resize-none rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm outline-none placeholder:text-slate-500 focus:border-emerald-400" placeholder="Reply to visitor..." value={draft} onChange={(event) => setDraft(event.target.value)} />
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="text-xs text-slate-500">Replies are visible to the visitor.</p>
                    <Button onClick={() => void sendMessage()} disabled={!draft.trim() || busy === "send_message"}>{busy === "send_message" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Send reply</Button>
                  </div>
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

function ConversationRow({ conversation, active, onOpen }: { conversation: LiveChatConversationView; active: boolean; onOpen: () => void }) {
  const urgent = needsReply(conversation);
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "block w-full border-b border-white/10 p-3 text-left transition hover:bg-white/5",
        active && "bg-emerald-500/10 shadow-[inset_3px_0_0_rgba(52,211,153,0.85)]",
        urgent && !active && "bg-amber-400/10 shadow-[inset_3px_0_0_rgba(251,191,36,0.95)]",
      )}
    >
      <div className="flex gap-3">
        <span className={cn("relative grid size-10 shrink-0 place-items-center rounded-full text-sm font-black text-slate-950", urgent ? "bg-gradient-to-br from-amber-300 to-emerald-300" : "bg-gradient-to-br from-emerald-400 to-cyan-400")}>
          {visitorInitials(conversation.visitor)}
          <span className={cn("absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-slate-950", urgent ? "bg-amber-300" : "bg-emerald-400")} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-3">
            <span className={cn("truncate text-sm", urgent ? "font-black text-white" : "font-black text-slate-100")}>{visitorDisplayName(conversation.visitor)}</span>
            <span className="flex shrink-0 items-center gap-1.5">
              {urgent ? <span className="rounded-full bg-amber-300 px-2 py-0.5 text-[10px] font-black uppercase text-slate-950">New reply</span> : null}
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-black", statusTone(conversation.status))}>{conversation.status.replace(/_/g, " ")}</span>
            </span>
          </span>
          <span className={cn("mt-1 block truncate text-xs", urgent ? "font-black text-amber-50" : "text-slate-300")}>{lastPreviewLabel(conversation)}</span>
          <span className="mt-2 flex items-center gap-1 truncate text-[11px] text-slate-500"><Globe2 className="size-3" /> {pageLabel(conversation.visitor.currentTitle || conversation.currentTitle, conversation.visitor.currentPath || conversation.currentPath)}</span>
        </span>
      </div>
    </button>
  );
}

function ConversationHeader({ conversation, data, action, busy, onDelete }: { conversation: LiveChatConversationView | null; data: LiveChatInboxView; action: (body: Record<string, unknown>, success?: string) => Promise<void>; busy: string | null; onDelete: (conversation: LiveChatConversationView) => Promise<void> }) {
  if (!conversation) return <div className="border-b border-white/10 p-4 text-sm text-slate-400">No conversation selected.</div>;
  const lastSeen = new Date(conversation.visitor.lastSeenAt);
  const lastSeenLabel = Number.isNaN(lastSeen.getTime()) ? "Recently active" : `Last seen ${lastSeen.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  return (
    <div className="border-b border-white/10 bg-slate-950 p-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-400 text-base font-black text-slate-950 shadow-lg shadow-emerald-950/20">
              {visitorInitials(conversation.visitor)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-xl font-black text-white">{visitorDisplayName(conversation.visitor)}</p>
                <span className={cn("rounded-full px-2 py-1 text-[10px] font-black uppercase", statusTone(conversation.status))}>{conversation.status.replace(/_/g, " ")}</span>
                <span className="rounded-full bg-slate-800 px-2 py-1 text-[10px] font-black uppercase text-slate-300">{conversation.priority}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-slate-400">{conversation.subject || conversation.currentTitle || "Live conversation"}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <MiniFact icon={Phone} label="Phone" value={conversation.visitor.phone || "Not captured"} />
            <MiniFact icon={Mail} label="Email" value={conversation.visitor.email || "Not captured"} />
            <MiniFact icon={MapPin} label="Current page" value={conversation.visitor.currentTitle || conversation.visitor.currentPath || "Unknown"} />
            <MiniFact icon={Timer} label="Activity" value={lastSeenLabel} />
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-900 p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">Routing</p>
            <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] font-black uppercase text-emerald-200">Live desk</span>
          </div>
          <div className="grid gap-2">
            <ControlSelect label="Status" value={conversation.status} onChange={(value) => void action({ action: "status", conversationId: conversation.id, status: value }, "Status updated.")}>
              {["NEW", "OPEN", "WAITING_FOR_CUSTOMER", "FOLLOW_UP", "RESOLVED", "CLOSED"].map((status) => <option key={status} value={status}>{status.replace(/_/g, " ")}</option>)}
            </ControlSelect>
            <ControlSelect label="Team" value={conversation.department?.id || ""} onChange={(value) => void action({ action: "transfer", conversationId: conversation.id, departmentId: value || undefined, agentId: conversation.assignedAgent?.id }, "Conversation transferred.")}>
              <option value="">General support</option>
              {data.departments.filter((department) => department.active).map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
            </ControlSelect>
            <ControlSelect label="Agent" value={conversation.assignedAgent?.id || ""} onChange={(value) => void action({ action: "assign", conversationId: conversation.id, agentId: value || undefined, departmentId: conversation.department?.id }, "Conversation assigned.")}>
              <option value="">Unassigned</option>
              {data.agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.displayName}</option>)}
            </ControlSelect>
            <Button
              variant="secondary"
              onClick={() => void onDelete(conversation)}
              disabled={busy === `delete_conversation:${conversation.id}`}
              className="mt-1 justify-self-start"
            >
              {busy === `delete_conversation:${conversation.id}` ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniFact({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-slate-900 px-3 py-2">
      <p className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-500"><Icon className="size-3 text-emerald-300" /> {label}</p>
      <p className="mt-1 truncate text-xs font-semibold text-slate-200" title={value}>{value}</p>
    </div>
  );
}

function ControlSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <label className="grid gap-1 sm:grid-cols-[6rem_minmax(0,1fr)] sm:items-center">
      <span className="text-[10px] font-black uppercase text-slate-500">{label}</span>
      <select className="h-10 min-w-0 rounded-md border border-white/10 bg-slate-950 px-2 text-sm text-white outline-none focus:border-emerald-400" value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  );
}

function AdminMessage({ message }: { message: LiveChatMessageView }) {
  const system = message.messageType === "SYSTEM";
  const internal = message.internal;
  const staff = message.senderKind === "STAFF";
  if (system) return <p className="mx-auto max-w-xl rounded-full bg-slate-800 px-4 py-2 text-center text-xs font-semibold text-slate-300 shadow-sm ring-1 ring-white/10">{message.body}</p>;
  const card = message.metadata && typeof message.metadata === "object" ? message.metadata as { url?: string; title?: string; kind?: string } : null;
  return (
    <div className={cn("flex", staff ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[78%] rounded-[18px] border px-3.5 py-2.5 text-sm shadow-sm", internal ? "rounded-bl-md border-amber-400/30 bg-amber-400/10 text-amber-100" : staff ? "rounded-br-md border-emerald-500/20 bg-emerald-600 text-white" : "rounded-bl-md border-white/10 bg-slate-900 text-slate-100")}>
        <p className={cn("mb-1 text-[10px] font-black uppercase", staff ? "text-emerald-50/80" : "text-emerald-600 dark:text-emerald-300")}>{internal ? "Internal note" : message.senderName || message.senderKind}</p>
        <p className="whitespace-pre-wrap leading-6">{message.body}</p>
        {card?.url ? <a className="mt-2 block rounded-md bg-white/15 px-3 py-2 text-xs font-bold underline-offset-2 hover:underline" href={card.url} target="_blank" rel="noreferrer">{card.title || card.url}</a> : null}
        <p className={cn("mt-1 text-[10px]", staff ? "text-emerald-50/80" : "text-slate-400")}>{new Date(message.createdAt).toLocaleString()}</p>
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
    <section className="rounded-2xl border border-white/10 bg-slate-900 p-4">
      <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-300"><Users className="size-4 text-emerald-300" /> Visitor profile</h3>
      {conversation ? (
        <div className="mt-4 space-y-3 text-sm">
          <div className="rounded-xl border border-white/10 bg-slate-950 p-3">
            <p className="text-base font-black text-white">{visitorDisplayName(conversation.visitor)}</p>
            <p className="mt-1 text-xs text-slate-400">{conversation.visitor.deviceType || "Unknown device"} visitor</p>
          </div>
          <Info label="Contact" value={[conversation.visitor.phone, conversation.visitor.email].filter(Boolean).join(" / ") || "Not captured yet"} />
          <Info label="Current page" value={pageLabel(conversation.visitor.currentTitle || conversation.currentTitle, conversation.visitor.currentPath || conversation.currentPath)} />
          <Info label="Source" value={conversation.visitor.utmSource || conversation.visitor.source || "Direct / Unknown"} />
          <Info label="Landing page" value={pageLabel(null, conversation.visitor.landingPage)} />
          <Button variant="secondary" className="w-full justify-center" onClick={() => void startConversation(conversation.visitor.id)}><Bell className="size-4" /> Send proactive nudge</Button>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {visitors.slice(0, 8).map((visitor) => (
            <div key={visitor.id} className="rounded-md border border-white/10 bg-slate-950 p-3">
              <p className="text-sm font-bold">{visitorDisplayName(visitor)}</p>
              <p className="truncate text-xs text-slate-400">{pageLabel(visitor.currentTitle, visitor.currentPath)}</p>
              <Button className="mt-2" variant="secondary" onClick={() => void startConversation(visitor.id)}><Send className="size-4" /> Start chat</Button>
            </div>
          ))}
        </div>
      )}
      {events.length ? (
        <div className="mt-5 border-t border-white/10 pt-4">
          <p className="text-xs font-bold uppercase text-slate-500">Visited pages and actions</p>
          <div className="mt-3 space-y-3">
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

function VisitorsPanel({
  visitors,
  startConversation,
  openConversation,
  startingVisitorId,
}: {
  visitors: LiveChatInboxView["activeVisitors"];
  startConversation: (visitorId: string, message?: string) => Promise<void>;
  openConversation: (conversationId: string) => void;
  startingVisitorId: string | null;
}) {
  return (
    <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
      {visitors.length ? visitors.map((visitor) => {
        const hasConversation = Boolean(visitor.conversationId);
        const loading = startingVisitorId === visitor.id;
        const actionLabel = visitor.conversation ? visitorActionLabel(visitor.conversation.status) : "Start helpful chat";
        return (
          <article key={visitor.id} className={cn("rounded-2xl border bg-slate-900 p-4", hasConversation ? "border-emerald-400/30" : "border-white/10")}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 gap-3">
                <span className="relative grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 text-sm font-black text-slate-950">
                  {visitorInitials(visitor)}
                  <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-slate-900 bg-emerald-400" />
                </span>
                <div className="min-w-0">
                  <p className="font-black text-white">{visitorDisplayName(visitor)}</p>
                  <p className="mt-1 truncate text-sm text-slate-400">{visitor.currentTitle || visitor.currentPath || "Browsing HouseLink"}</p>
                </div>
              </div>
              <span className={cn("rounded-full px-2 py-1 text-[11px] font-black uppercase", hasConversation ? statusTone(visitor.conversation?.status || "OPEN") : "bg-emerald-500/15 text-emerald-200")}>
                {hasConversation ? visitor.conversation?.status.replace(/_/g, " ") : "LIVE"}
              </span>
            </div>
            {visitor.conversation?.lastMessagePreview ? (
              <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3">
                <p className="text-[10px] font-black uppercase text-emerald-200">Latest conversation</p>
                <p className="mt-1 line-clamp-2 text-xs font-semibold text-emerald-50">{visitor.conversation.lastMessagePreview}</p>
              </div>
            ) : null}
            <div className="mt-4 grid gap-2 text-xs text-slate-400">
              <Info label="Contact" value={[visitor.phone, visitor.email].filter(Boolean).join(" / ") || "Not captured yet"} />
              <Info label="Source" value={visitor.utmSource || visitor.source || "Direct / Unknown"} />
              <Info label="Journey" value={`${Math.round(visitor.sessionSeconds / 60)} min session, ${Math.round(visitor.pageSeconds / 60)} min on page`} />
            </div>
            <Button className="mt-4 w-full" onClick={() => hasConversation && visitor.conversationId ? openConversation(visitor.conversationId) : void startConversation(visitor.id)} disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : hasConversation ? <MessageSquare className="size-4" /> : <Send className="size-4" />} {loading ? "Starting..." : actionLabel}
            </Button>
          </article>
        );
      }) : <Empty label="No live visitors in the last five minutes." />}
    </div>
  );
}

function ProfilePanel({ data, action, busy }: { data: LiveChatInboxView; action: (body: Record<string, unknown>, success?: string) => Promise<void>; busy: string | null }) {
  const agent = data.currentAgent;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [displayName, setDisplayName] = useState(agent?.displayName || "");
  const [title, setTitle] = useState(agent?.title || "");
  const [avatarUrl, setAvatarUrl] = useState(agent?.avatarUrl || "");
  const [availability, setAvailability] = useState(agent?.availability || "ONLINE");
  const [departmentId, setDepartmentId] = useState(agent?.department?.id || "");
  const [publicIntro, setPublicIntro] = useState(agent?.publicIntro || "");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  async function uploadAvatar(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const dataUrl = await readProfileImageFile(file);
      const result = await apiFetch<{ url: string }>("/api/v1/uploads", {
        method: "POST",
        body: JSON.stringify({
          dataUrl,
          kind: "image",
          folder: "live-chat/avatars",
          filename: file.name,
        }),
      });
      if (result.data?.url) setAvatarUrl(result.data.url);
      else throw new Error(result.error?.message ?? "Profile photo upload failed.");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Profile photo upload failed.");
    } finally {
      setUploadingAvatar(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="grid gap-4 p-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <section className="overflow-hidden rounded-lg border border-white/10 bg-slate-900">
        <div className="border-b border-white/10 bg-gradient-to-br from-emerald-500/20 via-slate-900 to-slate-950 p-4">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-200"><UserCog className="size-4" /> Public team profile</p>
          <div className="mt-5 flex items-center gap-4">
            <span
              className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/15 bg-emerald-500 bg-cover bg-center text-2xl font-black text-white shadow-lg shadow-emerald-950/30"
              style={avatarUrl ? { backgroundImage: `url(${avatarUrl})` } : undefined}
            >
              {avatarUrl ? null : (displayName || "H").slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-lg font-black text-white">{displayName || "HouseLink Team"}</p>
              <p className="text-sm text-slate-300">{title || "HouseLink Support"}</p>
              <p className="mt-2 inline-flex rounded-full bg-emerald-400/15 px-2 py-1 text-[11px] font-black uppercase text-emerald-200">{availability}</p>
            </div>
          </div>
        </div>
        <div className="space-y-3 p-4 text-sm text-slate-300">
          <p className="leading-6">{publicIntro || "Add a short intro so the public widget sounds personal, helpful, and unmistakably HouseLink."}</p>
          <div className="rounded-md border border-emerald-400/20 bg-emerald-400/10 p-3 text-emerald-100">
            <p className="font-bold">Shown to visitors</p>
            <p className="mt-1 text-xs leading-5 text-emerald-100/80">Photo, name, title, and online state appear in the public chat header when this agent is available.</p>
          </div>
        </div>
      </section>
      <section className="rounded-lg border border-white/10 bg-slate-900 p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Display name" value={displayName} onChange={setDisplayName} placeholder="e.g. Tendai from HouseLink" />
          <Field label="Title" value={title} onChange={setTitle} placeholder="e.g. Property & Library Support" />
          <label className="block">
            <span className="text-xs font-black uppercase text-slate-500">Profile photo</span>
            <div className="mt-1 flex gap-2">
              <input className="h-11 min-w-0 flex-1 rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none focus:border-emerald-400" value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} placeholder="Paste image URL or upload" />
              <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()} disabled={uploadingAvatar} className="shrink-0">
                {uploadingAvatar ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                {uploadingAvatar ? "Uploading" : "Upload"}
              </Button>
            </div>
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(event) => void uploadAvatar(event.currentTarget.files)} />
          </label>
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
  const [defaultDepartmentId, setDefaultDepartmentId] = useState(data.settings.defaultDepartmentId || "");
  const [businessTimezone, setBusinessTimezone] = useState(data.settings.businessTimezone || "Africa/Harare");
  const [retentionDays, setRetentionDays] = useState(String(data.settings.retentionDays || 180));
  const [mobilePosition, setMobilePosition] = useState(data.settings.mobilePosition || "bottom-right");
  return (
    <div className="p-4">
      <section className="overflow-hidden rounded-lg border border-white/10 bg-slate-900">
        <div className="border-b border-white/10 bg-slate-950/70 p-4">
          <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-200"><SlidersHorizontal className="size-4 text-emerald-300" /> Live Chat settings</h3>
          <p className="mt-1 text-sm text-slate-400">Control the public widget, routing defaults, contact capture, retention, and the exact words visitors see.</p>
        </div>
        <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Toggle label="Chat enabled" checked={enabled} onChange={setEnabled} />
              <Toggle label="Proactive messages" checked={proactiveEnabled} onChange={setProactiveEnabled} />
              <Toggle label="Sound alerts" checked={soundEnabled} onChange={setSoundEnabled} />
              <Toggle label="Require contact before chat" checked={requireContact} onChange={setRequireContact} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Launcher greeting" value={widgetGreeting} onChange={setWidgetGreeting} placeholder="Hi, need help with HouseLink?" />
              <Field label="Privacy note" value={privacyNotice} onChange={setPrivacyNotice} placeholder="How chat context is used" />
              <TextField label="Welcome message" value={welcomeMessage} onChange={setWelcomeMessage} />
              <TextField label="Offline message" value={offlineMessage} onChange={setOfflineMessage} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="text-xs font-black uppercase text-slate-500">Default department</span>
                <select className="mt-1 h-11 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none focus:border-emerald-400" value={defaultDepartmentId} onChange={(event) => setDefaultDepartmentId(event.target.value)}>
                  <option value="">General routing</option>
                  {data.departments.filter((department) => department.active).map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase text-slate-500">Business timezone</span>
                <select className="mt-1 h-11 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none focus:border-emerald-400" value={businessTimezone} onChange={(event) => setBusinessTimezone(event.target.value)}>
                  {["Africa/Harare", "Africa/Johannesburg", "UTC"].map((zone) => <option key={zone} value={zone}>{zone}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase text-slate-500">Keep chat history</span>
                <input className="mt-1 h-11 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none focus:border-emerald-400" inputMode="numeric" value={retentionDays} onChange={(event) => setRetentionDays(event.target.value.replace(/\D/g, "").slice(0, 3))} placeholder="180" />
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase text-slate-500">Mobile launcher position</span>
                <select className="mt-1 h-11 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none focus:border-emerald-400" value={mobilePosition} onChange={(event) => setMobilePosition(event.target.value)}>
                  <option value="bottom-right">Bottom right</option>
                  <option value="bottom-left">Bottom left</option>
                </select>
              </label>
            </div>
          </div>
          <aside className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-4 text-emerald-50">
            <p className="flex items-center gap-2 text-sm font-black"><Sparkles className="size-4" /> HouseLink standard</p>
            <div className="mt-4 space-y-3 text-sm leading-6 text-emerald-50/85">
              <p>Use proactive messages for checkout, Library samples, payment help, and high-intent listing visitors.</p>
              <p>Require contact only when your team wants every chat to become a follow-up lead before the first message.</p>
              <p>Keep retention long enough for payments and disputes, but short enough to avoid unnecessary database growth.</p>
            </div>
          </aside>
        </div>
        <div className="border-t border-white/10 p-4">
          <Button onClick={() => void action({ action: "settings", enabled, proactiveEnabled, soundEnabled, requireContact, widgetGreeting, welcomeMessage, offlineMessage, privacyNotice, defaultDepartmentId, businessTimezone, retentionDays: Number(retentionDays) || 180, mobilePosition }, "Live Chat settings saved.")} disabled={busy === "settings"}>
            {busy === "settings" ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save settings
          </Button>
        </div>
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

function visitorDisplayName(visitor: LiveChatConversationView["visitor"]) {
  return visitor.name?.trim() || visitor.email?.trim() || visitor.phone?.trim() || (visitor.userId ? "Registered member" : "Guest visitor");
}

function visitorInitials(visitor: LiveChatConversationView["visitor"]) {
  const name = visitorDisplayName(visitor);
  const parts = name.split(/[\s@.]+/).filter(Boolean);
  return (parts[0]?.[0] || "V").toUpperCase() + (parts[1]?.[0] || "").toUpperCase();
}

function needsReply(conversation: LiveChatConversationView) {
  return conversation.unreadForStaff > 0 && conversation.lastMessageSenderKind === "VISITOR";
}

function lastPreviewLabel(conversation: LiveChatConversationView) {
  const preview = conversation.lastMessagePreview || conversation.subject || conversation.currentTitle || "No messages yet";
  if (conversation.lastMessageSenderKind === "VISITOR") return `Visitor: ${preview}`;
  if (conversation.lastMessageSenderKind === "STAFF") return `You: ${preview}`;
  return preview;
}

function conversationNeedingReply(conversations: LiveChatConversationView[]) {
  return conversations.find(needsReply) ?? null;
}

function notifyInbox(conversation: LiveChatConversationView | null) {
  if (!conversation || typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return;
  new Notification("New HouseLink Live message", {
    body: `${visitorDisplayName(conversation.visitor)}: ${conversation.lastMessagePreview || "Visitor replied"}`,
    tag: `houselink-live-${conversation.id}`,
  });
}

function filterLabel(filter: string) {
  return FILTERS.find(([id]) => id === filter)?.[1] ?? "current filter";
}

function pageLabel(title?: string | null, path?: string | null) {
  const cleanTitle = title?.replace(/\s*\|\s*HouseLink.*$/i, "").trim();
  if (cleanTitle) return cleanTitle;
  const cleanPath = cleanJourneyPath(path);
  const parts = cleanPath.split("/").filter(Boolean);
  if (!parts.length) return "Homepage";
  if (parts[0] === "library" && parts[1]) return `Library product: ${humanize(parts[1])}`;
  if (parts[0] === "library") return "HouseLink Library";
  if (parts[0] === "listings" && parts[1]) return `Property listing ${parts[1].slice(0, 8)}`;
  if (parts[0] === "academy") return parts[1] ? `Academy: ${humanize(parts[1])}` : "HouseLink Academy";
  if (parts[0] === "blog" && parts[1]) return `Blog: ${humanize(parts[1])}`;
  return humanize(parts.join(" "));
}

function cleanJourneyPath(value?: string | null) {
  const raw = String(value || "").trim();
  if (!raw) return "/";
  const decoded = safeDecode(raw);
  try {
    return new URL(decoded, "https://www.houselink.co.zw").pathname || "/";
  } catch {
    return decoded.split("?")[0].split("#")[0] || "/";
  }
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function humanize(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function visitorActionLabel(status: string) {
  if (status === "WAITING_FOR_CUSTOMER") return "Waiting for visitor";
  if (status === "FOLLOW_UP") return "Continue follow-up";
  if (status === "RESOLVED") return "Review resolved chat";
  if (status === "CLOSED") return "View closed chat";
  return "Open conversation";
}

function statusTone(status: string) {
  if (status === "NEW") return "bg-cyan-500/15 text-cyan-200";
  if (status === "WAITING_FOR_CUSTOMER") return "bg-amber-500/15 text-amber-200";
  if (status === "RESOLVED" || status === "CLOSED") return "bg-slate-700 text-slate-300";
  return "bg-emerald-500/15 text-emerald-200";
}

function readProfileImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read profile photo."));
    reader.readAsDataURL(file);
  });
}
