"use client";

import { Activity, Bell, BookOpen, Building2, Check, CheckCheck, CheckCircle2, Clock, Copy, ExternalLink, Globe2, GraduationCap, Headphones, Keyboard, Loader2, LogOut, Mail, MapPin, MessageSquare, NotebookPen, Phone, RefreshCw, Save, Search, Send, Settings, Shield, SlidersHorizontal, Sparkles, Tag, Timer, Trash2, Upload, UserCog, UserPlus, Users, Volume2, Wifi } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import { displayImageUrl } from "@/lib/images/display-image";
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
  const notificationReadyRef = useRef(false);
  const notifiedVisitorMessageIdsRef = useRef<Set<string>>(new Set());
  const typingTimerRef = useRef<number | null>(null);
  const typingActiveRef = useRef(false);

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
    const conversationId = activeConversation?.id;
    if (!conversationId) return;
    if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
    if (draft.trim()) {
      if (!typingActiveRef.current) {
        typingActiveRef.current = true;
        void apiFetch("/api/v1/admin/live-chat", { method: "POST", body: JSON.stringify({ action: "typing", conversationId, typing: true }) });
      }
      typingTimerRef.current = window.setTimeout(() => {
        typingActiveRef.current = false;
        void apiFetch("/api/v1/admin/live-chat", { method: "POST", body: JSON.stringify({ action: "typing", conversationId, typing: false }) });
      }, 1800);
    } else if (typingActiveRef.current) {
      typingActiveRef.current = false;
      void apiFetch("/api/v1/admin/live-chat", { method: "POST", body: JSON.stringify({ action: "typing", conversationId, typing: false }) });
    }
    return () => {
      if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
    };
  }, [activeConversation?.id, draft]);

  useEffect(() => {
    if (!data) return;
    const newVisitorReplies = data.conversations.filter((conversation) => {
      if (!needsReply(conversation) || !conversation.lastMessageAt) return false;
      const messageKey = `${conversation.id}:${conversation.lastMessageAt}`;
      if (notifiedVisitorMessageIdsRef.current.has(messageKey)) return false;
      notifiedVisitorMessageIdsRef.current.add(messageKey);
      return true;
    });
    if (!notificationReadyRef.current) {
      notificationReadyRef.current = true;
      lastNeedsReplyCountRef.current = needsReplyCount;
      document.title = needsReplyCount ? `(${needsReplyCount}) HouseLink Live` : "HouseLink Live";
      return;
    }
    if (newVisitorReplies.length) {
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
    typingActiveRef.current = false;
    void apiFetch("/api/v1/admin/live-chat", { method: "POST", body: JSON.stringify({ action: "typing", conversationId: activeConversation.id, typing: false }) });
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
    const visitor = data?.activeVisitors.find((item) => item.id === visitorId) ?? data?.conversations.find((conversation) => conversation.visitor.id === visitorId)?.visitor;
    const result = await apiFetch<{ conversationId: string }>("/api/v1/admin/live-chat", {
      method: "POST",
      body: JSON.stringify({
        action: "start_conversation",
        visitorId,
        body: message || proactiveMessageForVisitor(visitor),
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
    <div className="min-w-0 space-y-4 overflow-hidden">
      {data.setupRequired ? (
        <section className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-4 text-amber-100">
          <p className="text-sm font-black uppercase tracking-wider">Live Chat database setup required</p>
          <p className="mt-2 text-sm leading-6">{data.setupMessage || "Run the Live Chat Prisma migration before using the inbox."}</p>
        </section>
      ) : null}
      <div className="grid min-w-0 grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-4">
        <Metric icon={MessageSquare} label="30-day chats" value={data.analytics.totalConversations} />
        <Metric icon={Activity} label="Active visitors" value={data.analytics.activeVisitors} tone="emerald" />
        <Metric icon={Clock} label="Waiting" value={data.analytics.waitingConversations} tone="amber" />
        <Metric icon={UserPlus} label="Leads created" value={data.analytics.leadsCreated} tone="cyan" />
      </div>

      <section className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-slate-950 text-slate-100 shadow-2xl shadow-slate-950/20">
        <div className="flex flex-col gap-3 border-b border-white/10 bg-slate-900/70 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">HouseLink Live</p>
            <h2 className="text-xl font-black leading-tight">Support and sales inbox</h2>
            <p className="text-sm leading-6 text-slate-400">Live conversations, visitor journeys, proactive help, and follow-up leads.</p>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
            <Button className="w-full sm:w-auto" variant="secondary" onClick={() => void load()} disabled={loadingInbox}>{loadingInbox ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} Refresh</Button>
            <Button className="w-full sm:w-auto" variant="secondary" onClick={() => void action({ action: "settings", ...data.settings, enabled: !data.settings.enabled }, data.settings.enabled ? "Live Chat disabled." : "Live Chat enabled.")}>
              <Settings className="size-4" /> {data.settings.enabled ? "Disable" : "Enable"}
            </Button>
          </div>
        </div>
        <div className="flex min-w-0 gap-2 overflow-x-auto border-b border-white/10 px-3 py-3 [scrollbar-width:none] sm:px-4">
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
        {panel === "visitors" ? <VisitorsPanel visitors={data.activeVisitors.filter((visitor) => !deletedVisitorIds.includes(visitor.id))} startConversation={startConversation} openConversation={openConversation} startingVisitorId={startingVisitorId} currentAgentName={data.currentAgent?.displayName} /> : null}

        {panel === "inbox" ? <div className="grid min-w-0 gap-0 lg:min-h-[660px] lg:grid-cols-[minmax(280px,330px)_minmax(0,1fr)_minmax(320px,380px)]">
          <aside className="border-b border-white/10 bg-slate-950/80 lg:border-b-0 lg:border-r lg:border-white/10">
            <div className="space-y-3 p-3">
              <label className="flex min-h-10 min-w-0 items-center gap-2 rounded-md border border-white/10 bg-slate-900 px-3 text-sm">
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
            <div className="max-h-[42dvh] overflow-y-auto border-t border-white/10 lg:max-h-[560px]">
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

          <main className="flex min-h-[70dvh] min-w-0 flex-col lg:min-h-[620px]">
            <ConversationHeader conversation={activeConversation} data={data} action={action} busy={busy} onDelete={deleteConversation} />
            <div className="max-h-[52dvh] flex-1 space-y-4 overflow-y-auto bg-slate-950/70 p-3 sm:p-4 lg:max-h-none">
              {data.messages.length ? data.messages.map((message) => <AdminMessage key={message.id} message={message} />) : <Empty label="Select a conversation or start one from Active Visitors." />}
              {data.typing?.visitorTyping ? <AdminTypingIndicator /> : null}
            </div>
            {activeConversation ? (
              <div className="space-y-3 border-t border-white/10 p-3">
                <QuickReplies data={data} onPick={(body) => setDraft((current) => current ? `${current}\n${body}` : body)} />
                <ContextActions conversation={activeConversation} action={action} />
                <div className="rounded-xl border border-white/10 bg-slate-900 p-2">
                  <textarea className="min-h-20 w-full resize-none rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm outline-none placeholder:text-slate-500 focus:border-emerald-400" placeholder="Reply to visitor..." value={draft} onChange={(event) => setDraft(event.target.value)} />
                  <div className="mt-2 grid gap-2 sm:flex sm:items-center sm:justify-between">
                    <p className="text-xs text-slate-500">Replies are visible to the visitor.</p>
                    <Button className="w-full sm:w-auto" onClick={() => void sendMessage()} disabled={!draft.trim() || busy === "send_message"}>{busy === "send_message" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Send reply</Button>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <input className="h-10 min-w-0 rounded-md border border-amber-400/20 bg-amber-400/10 px-3 text-sm outline-none placeholder:text-amber-100/50" placeholder="Internal note - never shown to visitor" value={note} onChange={(event) => setNote(event.target.value)} />
                  <Button className="w-full sm:w-auto" variant="secondary" onClick={() => void addNote()} disabled={!note.trim() || busy === "internal_note"}>{busy === "internal_note" ? <Loader2 className="size-4 animate-spin" /> : <NotebookPen className="size-4" />} Note</Button>
                </div>
              </div>
            ) : null}
          </main>

          <aside className="border-t border-white/10 lg:border-l lg:border-t-0">
            <div className="max-h-none space-y-4 overflow-y-visible p-3 sm:p-4 lg:max-h-[680px] lg:overflow-y-auto">
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
    <div className="min-w-0 rounded-lg border border-white/10 bg-slate-900/70 p-4">
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
      <div className="flex min-w-0 gap-3">
        <span className={cn("relative grid size-10 shrink-0 place-items-center rounded-full text-sm font-black text-slate-950", urgent ? "bg-gradient-to-br from-amber-300 to-emerald-300" : "bg-gradient-to-br from-emerald-400 to-cyan-400")}>
          {visitorInitials(conversation.visitor)}
          <span className={cn("absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-slate-950", urgent ? "bg-amber-300" : "bg-emerald-400")} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="grid min-w-0 gap-2 min-[420px]:grid-cols-[minmax(0,1fr)_auto] min-[420px]:items-center">
            <span className={cn("min-w-0 truncate text-sm", urgent ? "font-black text-white" : "font-black text-slate-100")}>{visitorDisplayName(conversation.visitor)}</span>
            <span className="flex min-w-0 flex-wrap items-center gap-1.5">
              {urgent ? <span className="rounded-full bg-amber-300 px-2 py-0.5 text-[10px] font-black uppercase text-slate-950">New reply</span> : null}
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-black", statusTone(conversation.status))}>{conversation.status.replace(/_/g, " ")}</span>
            </span>
          </span>
          <span className={cn("mt-1 block truncate text-xs", urgent ? "font-black text-amber-50" : "text-slate-300")}>{lastPreviewLabel(conversation)}</span>
          <span className="mt-2 flex min-w-0 items-center gap-1 text-[11px] text-slate-500"><Globe2 className="size-3 shrink-0" /> <span className="truncate">{pageLabel(conversation.visitor.currentTitle || conversation.currentTitle, conversation.visitor.currentPath || conversation.currentPath)}</span></span>
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
    <div className="border-b border-white/10 bg-slate-950 p-3 sm:p-4">
      <div className="grid gap-4 min-[1180px]:grid-cols-[minmax(0,1fr)_minmax(18rem,20rem)]">
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-400 text-base font-black text-slate-950 shadow-lg shadow-emerald-950/20">
              {visitorInitials(conversation.visitor)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="min-w-0 break-words text-lg font-black leading-tight text-white sm:text-xl">{visitorDisplayName(conversation.visitor)}</p>
                <span className={cn("rounded-full px-2 py-1 text-[10px] font-black uppercase", statusTone(conversation.status))}>{conversation.status.replace(/_/g, " ")}</span>
                <span className="rounded-full bg-slate-800 px-2 py-1 text-[10px] font-black uppercase text-slate-300">{conversation.priority}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-slate-400">{conversation.subject || conversation.currentTitle || "Live conversation"}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(min(100%,10.75rem),1fr))]">
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
            <div className="mt-1 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => void action({ action: "leave_conversation", conversationId: conversation.id }, "You left the conversation.")} disabled={busy === "leave_conversation"} className="w-full justify-self-start sm:w-auto">
                {busy === "leave_conversation" ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />} Leave
              </Button>
              <Button
                variant="secondary"
                onClick={() => void onDelete(conversation)}
                disabled={busy === `delete_conversation:${conversation.id}`}
                className="w-full justify-self-start sm:w-auto"
              >
                {busy === `delete_conversation:${conversation.id}` ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Delete
              </Button>
            </div>
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
      <p className="mt-1 break-words text-xs font-semibold text-slate-200 [overflow-wrap:anywhere]" title={value}>{value}</p>
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
    <div className={cn("flex min-w-0", staff ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[92%] break-words rounded-[18px] border px-3.5 py-2.5 text-sm shadow-sm [overflow-wrap:anywhere] sm:max-w-[78%]", internal ? "rounded-bl-md border-amber-400/30 bg-amber-400/10 text-amber-100" : staff ? "rounded-br-md border-emerald-500/20 bg-emerald-600 text-white" : "rounded-bl-md border-white/10 bg-slate-900 text-slate-100")}>
        <p className={cn("mb-1 text-[10px] font-black uppercase", staff ? "text-emerald-50/80" : "text-emerald-600 dark:text-emerald-300")}>{internal ? "Internal note" : message.senderName || message.senderKind}</p>
        <p className="whitespace-pre-wrap leading-6">{message.body}</p>
        {card?.url ? <a className="mt-2 block break-words rounded-md bg-white/15 px-3 py-2 text-xs font-bold underline-offset-2 [overflow-wrap:anywhere] hover:underline" href={card.url} target="_blank" rel="noreferrer">{card.title || card.url}</a> : null}
        <p className={cn("mt-1 flex items-center justify-end gap-1 text-[10px]", staff ? "text-emerald-50/80" : "text-slate-400")}>
          <span>{new Date(message.createdAt).toLocaleString()}</span>
          {staff && !internal ? <AdminMessageReceipt message={message} /> : null}
        </p>
      </div>
    </div>
  );
}

function AdminMessageReceipt({ message }: { message: LiveChatMessageView }) {
  if (message.readAt) return <span className="inline-flex items-center gap-1 font-bold text-cyan-100"><CheckCheck className="size-3.5" /> Read</span>;
  if (message.deliveredAt) return <span className="inline-flex items-center gap-1 font-bold"><CheckCheck className="size-3.5" /> Delivered</span>;
  return <span className="inline-flex items-center gap-1 font-bold"><Check className="size-3.5" /> Sent</span>;
}

function AdminTypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300">
        <Keyboard className="size-3.5 text-emerald-300" /> Visitor is typing...
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
    <div className="grid gap-2 sm:flex sm:flex-wrap">
      <Button
        className="w-full sm:w-auto"
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
    <div className="flex min-w-0 gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
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
    <section className="min-w-0 rounded-2xl border border-white/10 bg-slate-900 p-3 sm:p-4">
      <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-300"><Users className="size-4 text-emerald-300" /> Visitor profile</h3>
      {conversation ? (
        <div className="mt-4 space-y-3 text-sm">
          <div className="rounded-xl border border-white/10 bg-slate-950 p-3">
            <p className="text-base font-black text-white">{visitorDisplayName(conversation.visitor)}</p>
            <p className="mt-1 text-xs text-slate-400">{conversation.visitor.deviceType || "Unknown device"} visitor</p>
          </div>
          <Info label="Contact" value={[conversation.visitor.phone, conversation.visitor.email].filter(Boolean).join(" / ") || "Not captured yet"} />
          <Info label="Current page" value={pageLabel(conversation.visitor.currentTitle || conversation.currentTitle, conversation.visitor.currentPath || conversation.currentPath)} />
          <Info label="Source" value={visitorSourceLabel(conversation.visitor)} action={<UrlActions url={fullHouseLinkUrl(conversation.visitor.source)} label="source" />} />
          <Info label="Landing page" value={pageLabel(null, conversation.visitor.landingPage)} action={<UrlActions url={fullHouseLinkUrl(conversation.visitor.landingPage)} label="landing page" />} />
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
              <p className="break-words text-[11px] text-slate-500 [overflow-wrap:anywhere]">{event.title || event.path || new Date(event.createdAt).toLocaleString()}</p>
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
  currentAgentName,
}: {
  visitors: LiveChatInboxView["activeVisitors"];
  startConversation: (visitorId: string, message?: string) => Promise<void>;
  openConversation: (conversationId: string) => void;
  startingVisitorId: string | null;
  currentAgentName?: string | null;
}) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 p-3 sm:p-4 md:grid-cols-2 xl:grid-cols-3">
      {visitors.length ? visitors.map((visitor) => {
        const hasConversation = Boolean(visitor.conversationId);
        const loading = startingVisitorId === visitor.id;
        const page = pageLabel(visitor.currentTitle, visitor.currentPath);
        const pagePath = cleanJourneyPath(visitor.currentPath);
        const pageUrl = fullHouseLinkUrl(visitor.currentPath);
        const source = visitorSourceLabel(visitor);
        const sourceUrl = fullHouseLinkUrl(visitor.source);
        const contact = visitorContactLabel(visitor);
        const intent = visitorIntentLabel(visitor);
        const stage = visitorStageLabel(visitor);
        const pageTime = formatVisitorDuration(visitor.pageSeconds);
        const lastSeen = formatRelativeVisitorTime(visitor.lastSeenAt);
        const suggestedMessage = proactiveMessageForVisitor(visitor, currentAgentName);
        const actionLabel = visitor.conversation ? visitorActionLabel(visitor.conversation.status) : "Send helpful message";
        return (
          <article key={visitor.id} className={cn("min-w-0 overflow-hidden rounded-2xl border bg-slate-900 shadow-[0_18px_50px_rgba(0,0,0,0.18)]", hasConversation ? "border-emerald-400/30" : "border-white/10")}>
            <div className="border-b border-white/10 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 p-3 sm:p-4">
              <div className="grid min-w-0 gap-3 min-[420px]:grid-cols-[minmax(0,1fr)_auto]">
                <div className="flex min-w-0 gap-3">
                  <span className="relative grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-300 to-cyan-300 text-sm font-black text-slate-950">
                    {visitorInitials(visitor)}
                    <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-slate-900 bg-emerald-400" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <p className="break-words font-black text-white [overflow-wrap:anywhere]">{visitorDisplayName(visitor)}</p>
                      <span className="rounded-full bg-cyan-400/10 px-2 py-0.5 text-[10px] font-black uppercase text-cyan-200">{stage}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-300">{intent}</p>
                  </div>
                </div>
                <LiveStatusBadge status={hasConversation ? visitor.conversation?.status : "LIVE"} />
              </div>
              <div className="mt-3 flex min-w-0 flex-wrap gap-2">
                <MiniBadge icon={Activity} label={visitor.deviceType ? humanize(visitor.deviceType) : "Visitor"} />
                <MiniBadge icon={Globe2} label={source} />
                <MiniBadge icon={contact === "Not captured yet" ? UserPlus : Phone} label={contact === "Not captured yet" ? "No contact yet" : "Contact captured"} tone={contact === "Not captured yet" ? "amber" : "emerald"} />
              </div>
            </div>
            <div className="space-y-3 p-3 sm:p-4">
              <div className="rounded-xl border border-white/10 bg-slate-950/70 p-3">
                <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wide text-slate-500"><MapPin className="size-3.5" /> Current page</p>
                <p className="mt-1 line-clamp-2 text-sm font-black leading-5 text-white">{page}</p>
                <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2">
                  <span className="max-w-full truncate rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-bold text-slate-300" title={pagePath}>
                    {pagePath}
                  </span>
                  <UrlActions url={pageUrl} label="current page" />
                </div>
                <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-slate-400">
                  <span className="inline-flex items-center gap-1"><Clock className="size-3.5" /> {pageTime ? `On this page ${pageTime}` : "Just arrived"}</span>
                  <span>{lastSeen}</span>
                </p>
              </div>
              <div className="grid gap-2 text-xs text-slate-400">
                <Info label="Contact" value={contact} />
                <Info label="Source" value={source} action={<UrlActions url={sourceUrl} label="source" />} />
              </div>
              {visitor.conversation?.lastMessagePreview ? (
                <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3">
                  <p className="text-[10px] font-black uppercase text-emerald-200">Latest conversation</p>
                  <p className="mt-1 line-clamp-2 text-xs font-semibold text-emerald-50">{visitor.conversation.lastMessagePreview}</p>
                </div>
              ) : (
                <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-3">
                  <p className="flex items-center gap-1.5 text-[10px] font-black uppercase text-cyan-200"><Sparkles className="size-3.5" /> Suggested first message</p>
                  <p className="mt-1 line-clamp-3 text-xs leading-5 text-cyan-50">{suggestedMessage}</p>
                </div>
              )}
              <div className="flex min-w-0 gap-3">
                <Button className="w-full" onClick={() => hasConversation && visitor.conversationId ? openConversation(visitor.conversationId) : void startConversation(visitor.id, suggestedMessage)} disabled={loading}>
                  {loading ? <Loader2 className="size-4 animate-spin" /> : hasConversation ? <MessageSquare className="size-4" /> : <Send className="size-4" />} {loading ? "Sending..." : actionLabel}
                </Button>
              </div>
            </div>
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
  const avatarPreviewUrl = displayImageUrl(avatarUrl, { width: 128, height: 128, crop: "fill" });

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
    <div className="grid min-w-0 grid-cols-1 gap-4 p-3 sm:p-4 xl:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
      <section className="min-w-0 overflow-hidden rounded-lg border border-white/10 bg-slate-900">
        <div className="border-b border-white/10 bg-gradient-to-br from-emerald-500/20 via-slate-900 to-slate-950 p-4">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-200"><UserCog className="size-4" /> Public team profile</p>
          <div className="mt-5 flex min-w-0 items-center gap-4">
            <span
              className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/15 bg-emerald-500 bg-cover bg-center text-2xl font-black text-white shadow-lg shadow-emerald-950/30"
              style={avatarPreviewUrl ? { backgroundImage: `url(${avatarPreviewUrl})` } : undefined}
            >
              {avatarPreviewUrl ? null : (displayName || "H").slice(0, 1).toUpperCase()}
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
      <section className="min-w-0 rounded-lg border border-white/10 bg-slate-900 p-3 sm:p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Display name" value={displayName} onChange={setDisplayName} placeholder="e.g. Tendai from HouseLink" />
          <Field label="Title" value={title} onChange={setTitle} placeholder="e.g. Property & Library Support" />
          <label className="block">
            <span className="text-xs font-black uppercase text-slate-500">Profile photo</span>
            <div className="mt-1 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <input className="h-11 min-w-0 rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none focus:border-emerald-400" value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} placeholder="Paste image URL or upload" />
              <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()} disabled={uploadingAvatar} className="w-full sm:w-auto sm:shrink-0">
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
    <div className="min-w-0 p-3 sm:p-4">
      <section className="min-w-0 overflow-hidden rounded-lg border border-white/10 bg-slate-900">
        <div className="border-b border-white/10 bg-slate-950/70 p-4">
          <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-200"><SlidersHorizontal className="size-4 text-emerald-300" /> Live Chat settings</h3>
          <p className="mt-1 text-sm text-slate-400">Control the public widget, routing defaults, contact capture, retention, and the exact words visitors see.</p>
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-4 p-3 sm:p-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Toggle label="Chat enabled" checked={enabled} onChange={setEnabled} />
              <Toggle label="Proactive messages" checked={proactiveEnabled} onChange={setProactiveEnabled} />
              <Toggle label="Sound alerts" checked={soundEnabled} onChange={setSoundEnabled} />
              <Toggle label="Require contact before chat" checked={requireContact} onChange={setRequireContact} />
            </div>
            <button
              type="button"
              onClick={() => playLiveChatNotificationSound()}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm font-black text-emerald-100 transition hover:border-emerald-300 hover:bg-emerald-500/20"
            >
              <Volume2 className="size-4" /> Test notification sound
            </button>
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
          <aside className="min-w-0 rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-4 text-emerald-50">
            <p className="flex items-center gap-2 text-sm font-black"><Sparkles className="size-4" /> HouseLink standard</p>
            <div className="mt-4 space-y-3 text-sm leading-6 text-emerald-50/85">
              <p>Use proactive messages for checkout, Library samples, payment help, and high-intent listing visitors.</p>
              <p>Require contact only when your team wants every chat to become a follow-up lead before the first message.</p>
              <p>Keep retention long enough for payments and disputes, but short enough to avoid unnecessary database growth.</p>
            </div>
          </aside>
        </div>
        <div className="border-t border-white/10 p-4">
          <Button className="w-full sm:w-auto" onClick={() => void action({ action: "settings", enabled, proactiveEnabled, soundEnabled, requireContact, widgetGreeting, welcomeMessage, offlineMessage, privacyNotice, defaultDepartmentId, businessTimezone, retentionDays: Number(retentionDays) || 180, mobilePosition }, "Live Chat settings saved.")} disabled={busy === "settings"}>
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
      <input className="mt-1 h-11 w-full min-w-0 rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none focus:border-emerald-400" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase text-slate-500">{label}</span>
      <textarea className="mt-1 min-h-24 w-full min-w-0 rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-white/10 bg-slate-950 px-3 py-3">
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
    <div className="min-w-0 space-y-4">
      <section className="min-w-0 rounded-lg border border-white/10 bg-slate-900 p-3 sm:p-4">
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
            <Button className="w-full sm:w-auto" onClick={() => void action({ action: "lead", conversationId: activeConversation.id, leadType, notes: leadNote }, "Lead created.")} disabled={busy === "lead"}><UserPlus className="size-4" /> Convert to lead</Button>
          </div>
        ) : null}
      </section>

      <section className="min-w-0 rounded-lg border border-white/10 bg-slate-900 p-3 sm:p-4">
        <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-300"><Shield className="size-4" /> Settings</h3>
        <div className="mt-3 space-y-2 text-sm text-slate-400">
          <p><CheckCircle2 className="mr-1 inline size-4 text-emerald-300" /> Widget: {data.settings.enabled ? "enabled" : "disabled"}</p>
          <p><CheckCircle2 className="mr-1 inline size-4 text-emerald-300" /> Proactive rules: {data.settings.proactiveEnabled ? "enabled" : "disabled"}</p>
          <p><CheckCircle2 className="mr-1 inline size-4 text-emerald-300" /> Sound: {data.settings.soundEnabled ? "enabled" : "disabled"}</p>
        </div>
      </section>

      <section className="min-w-0 rounded-lg border border-white/10 bg-slate-900 p-3 sm:p-4">
        <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-300"><Headphones className="size-4" /> Quick reply</h3>
        <input className="mt-3 h-10 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-sm outline-none" placeholder="Title" value={replyTitle} onChange={(event) => setReplyTitle(event.target.value)} />
        <textarea className="mt-2 min-h-20 w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-sm outline-none" placeholder="Response text" value={replyBody} onChange={(event) => setReplyBody(event.target.value)} />
        <Button className="mt-2 w-full sm:w-auto" variant="secondary" onClick={() => void action({ action: "quick_reply", title: replyTitle, body: replyBody }, "Quick reply saved.").then(() => { setReplyTitle(""); setReplyBody(""); })} disabled={!replyTitle.trim() || !replyBody.trim()}>
          Save reply
        </Button>
      </section>
    </div>
  );
}

function Info({ label, value, action }: { label: string; value: string; action?: ReactNode }) {
  return (
    <div className="min-w-0 rounded-md border border-white/10 bg-slate-950 p-3">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <p className="text-[11px] font-black uppercase text-slate-500">{label}</p>
        {action}
      </div>
      <p className="mt-1 break-words font-semibold text-slate-100 [overflow-wrap:anywhere]">{value}</p>
    </div>
  );
}

function LiveStatusBadge({ status }: { status?: string | null }) {
  const normalized = String(status || "LIVE").toUpperCase();
  const label = normalized === "LIVE" ? "Live now" : normalized.replace(/_/g, " ");
  const isLive = normalized === "LIVE" || normalized === "OPEN" || normalized === "NEW";
  return (
    <span className={cn("inline-flex h-7 w-fit shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-black uppercase", isLive ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-100" : statusTone(normalized))}>
      <span className={cn("size-2 rounded-full", isLive ? "bg-emerald-300 shadow-[0_0_0_3px_rgba(52,211,153,0.14)]" : "bg-current")} />
      {label}
    </span>
  );
}

function UrlActions({ url, label }: { url: string | null; label: string }) {
  if (!url) return null;
  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        className="grid size-7 place-items-center rounded-full border border-white/10 bg-white/5 text-slate-300 hover:border-emerald-300/40 hover:text-emerald-100"
        aria-label={`Copy ${label} link`}
        title={`Copy ${label} link`}
        onClick={(event) => {
          event.stopPropagation();
          void navigator.clipboard?.writeText(url);
        }}
      >
        <Copy className="size-3.5" />
      </button>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="grid size-7 place-items-center rounded-full border border-white/10 bg-white/5 text-slate-300 hover:border-emerald-300/40 hover:text-emerald-100"
        aria-label={`Open ${label}`}
        title={`Open ${label}`}
        onClick={(event) => event.stopPropagation()}
      >
        <ExternalLink className="size-3.5" />
      </a>
    </span>
  );
}

function MiniBadge({ icon: Icon, label, tone = "slate" }: { icon: LucideIcon; label: string; tone?: "slate" | "emerald" | "amber" }) {
  const toneClass = tone === "emerald"
    ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
    : tone === "amber"
      ? "border-amber-400/20 bg-amber-400/10 text-amber-100"
      : "border-white/10 bg-white/5 text-slate-300";
  return (
    <span className={cn("inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black", toneClass)}>
      <Icon className="size-3.5 shrink-0" />
      <span className="truncate">{label}</span>
    </span>
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

function visitorContactLabel(visitor: LiveChatConversationView["visitor"]) {
  return [visitor.phone, visitor.email].filter(Boolean).join(" / ") || "Not captured yet";
}

function visitorSourceLabel(visitor: Pick<LiveChatConversationView["visitor"], "utmSource" | "utmMedium" | "source">) {
  if (visitor.utmSource) {
    const medium = visitor.utmMedium ? ` / ${visitor.utmMedium}` : "";
    return humanize(`${visitor.utmSource}${medium}`.replace(/^an$/i, "Analytics").replace(/^fb$/i, "Facebook"));
  }
  const sourceKind = sourceKindLabel(visitor.source);
  if (sourceKind) return sourceKind;
  const raw = visitor.source || "Direct / Unknown";
  const medium = visitor.utmMedium ? ` / ${visitor.utmMedium}` : "";
  return humanize(`${raw}${medium}`.replace(/^an$/i, "Analytics").replace(/^fb$/i, "Facebook"));
}

function visitorIntentLabel(visitor: Pick<LiveChatConversationView["visitor"], "currentPath" | "currentTitle">) {
  const page = pageLabel(visitor.currentTitle, visitor.currentPath);
  const path = cleanJourneyPath(visitor.currentPath).toLowerCase();
  if (path.includes("/library/checkout")) return `Checkout intent on ${page}`;
  if (path.includes("/library/")) return `Considering ${page}`;
  if (path.includes("/academy")) return `Exploring Academy help for ${page}`;
  if (path.includes("/listings/")) return `Viewing property details for ${page}`;
  if (path.includes("/rent/") || path.includes("/property-for-sale/") || path.includes("/search")) return `Searching for property on ${page}`;
  return `Browsing ${page}`;
}

function visitorStageLabel(visitor: LiveChatConversationView["visitor"] & { sessionSeconds?: number }) {
  if (visitor.userId) return "Registered";
  const firstSeen = new Date(visitor.firstSeenAt).getTime();
  if (Number.isFinite(firstSeen) && Date.now() - firstSeen > 30 * 60 * 1000) return "Returning";
  if ((visitor.sessionSeconds ?? 0) > 10 * 60) return "Engaged";
  return "New";
}

function formatVisitorDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.round(Number(seconds) || 0));
  if (safeSeconds < 45) return "";
  const minutes = Math.round(safeSeconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function formatRelativeVisitorTime(value: string) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "Last seen recently";
  const seconds = Math.max(0, Math.round((Date.now() - time) / 1000));
  if (seconds < 30) return "Last seen just now";
  if (seconds < 90) return "Last seen 1 min ago";
  const minutes = Math.round(seconds / 60);
  return `Last seen ${minutes} min ago`;
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

function fullHouseLinkUrl(value?: string | null) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const decoded = safeDecode(raw);
  if (!/^https?:\/\//i.test(decoded) && !decoded.startsWith("/")) return null;
  try {
    const parsed = new URL(decoded, "https://www.houselink.co.zw");
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function sourceKindLabel(value?: string | null) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const path = cleanJourneyPath(raw).toLowerCase();
  const host = hostLabel(raw);
  if (path.startsWith("/dashboard/admin/live-chat")) return "Admin dashboard";
  if (path.startsWith("/dashboard")) return "HouseLink dashboard";
  if (path.startsWith("/library/checkout")) return "Library checkout";
  if (path.startsWith("/library/")) return "Library product";
  if (path === "/library") return "HouseLink Library";
  if (path.startsWith("/academy")) return "HouseLink Academy";
  if (path.startsWith("/listings/")) return "Property listing";
  if (path.startsWith("/search")) return "HouseLink search";
  if (host) return host;
  return null;
}

function hostLabel(value: string) {
  try {
    const host = new URL(value).hostname.replace(/^www\./, "").toLowerCase();
    if (!host) return null;
    if (host.includes("houselink.co.zw")) return "HouseLink";
    if (host.includes("facebook.com") || host === "fb") return "Facebook";
    if (host.includes("google.")) return "Google";
    if (host.includes("wa.me") || host.includes("whatsapp.")) return "WhatsApp";
    return humanize(host.split(".")[0] || host);
  } catch {
    return null;
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

function proactiveMessageForVisitor(visitor?: Pick<LiveChatConversationView["visitor"], "currentPath" | "currentTitle"> | null, agentName?: string | null) {
  const title = pageLabel(visitor?.currentTitle, visitor?.currentPath);
  const path = cleanJourneyPath(visitor?.currentPath).toLowerCase();
  const intro = agentName ? `Hi, this is ${agentName} from HouseLink.` : "Hi, welcome to HouseLink.";
  if (path.includes("/library/checkout") || path.includes("payment")) {
    return `${intro}\n\nI can help with payment, proof upload, or choosing another payment option so your order is completed smoothly.`;
  }
  if (path.includes("/library/")) {
    return `${intro}\n\nI noticed you are viewing ${title}. I can help you choose the right format, confirm payment steps, or answer any questions before you buy.`;
  }
  if (path.includes("/academy")) {
    return `${intro}\n\nI can help with course details, registration, payment, or choosing the right course${title !== "HouseLink Academy" ? ` for ${title}` : ""}.`;
  }
  if (path.includes("/listings/") || path.includes("/rent/") || path.includes("/property-for-sale/")) {
    return `${intro}\n\nI noticed you are viewing ${title}. I can help with viewing details, location questions, price checks, or the next step.`;
  }
  return `${intro}\n\nI can help with the next step, pricing, payment, delivery, viewings, or any question before you decide.`;
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
