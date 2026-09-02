"use client";

import { Bell, Check, CheckCheck, ChevronDown, Headphones, Loader2, Mail, MessageCircle, Phone, Send, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useApp } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import { getOrCreateSessionId, getOrCreateVisitorId } from "@/lib/analytics/visitor-client";
import { displayImageUrl } from "@/lib/images/display-image";
import { isLiveChatFloatingOpen, setLiveChatFloatingOpen, useLibraryBagFloatingOpen } from "@/lib/live-chat/floating-state";
import { playLiveChatNotificationSound, unlockLiveChatNotificationSound } from "@/lib/live-chat/notification-sound";
import { useHouseLinkBottomDock } from "@/lib/ui/bottom-dock";
import { cn } from "@/lib/utils";
import type { LiveChatBootstrapView, LiveChatMessageView, LiveChatTypingView, LiveChatVisitorContext } from "@/lib/live-chat/types";

type ContactState = { name?: string; phone?: string; email?: string };
type LiveChatRealtimeEvent = {
  type?: "message" | "typing" | "receipt";
  conversationId?: string;
  message?: LiveChatMessageView;
  typing?: LiveChatTypingView;
  messageIds?: string[];
  readAt?: string | null;
  deliveredAt?: string | null;
};

const UNREAD_STORAGE_KEY = "hl_live_unread_count";

export function LiveChatWidget() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useApp();
  const [open, setOpen] = useState(false);
  const [boot, setBoot] = useState<LiveChatBootstrapView | null>(null);
  const [messages, setMessages] = useState<LiveChatMessageView[]>([]);
  const [draft, setDraft] = useState("");
  const [contact, setContact] = useState<ContactState>({});
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contactNotice, setContactNotice] = useState<string | null>(null);
  const [pendingContactField, setPendingContactField] = useState<"phone" | "email" | null>(null);
  const [suggested, setSuggested] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const [previewMessage, setPreviewMessage] = useState<LiveChatMessageView | null>(null);
  const [typing, setTyping] = useState<LiveChatTypingView | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const contactRef = useRef(contact);
  const openRef = useRef(open);
  const bootRef = useRef<LiveChatBootstrapView | null>(null);
  const previewTimerRef = useRef<number | null>(null);
  const typingTimerRef = useRef<number | null>(null);
  const typingActiveRef = useRef(false);
  const notifiedStaffMessageIdsRef = useRef<Set<string>>(new Set());
  const startedAtRef = useRef(new Date().toISOString());
  const bottomDock = useHouseLinkBottomDock();
  const libraryBagOpen = useLibraryBagFloatingOpen();
  const lastMessageId = messages[messages.length - 1]?.id;
  const hiddenOnThisRoute = pathname?.startsWith("/dashboard") || pathname?.startsWith("/auth") || pathname?.startsWith("/maintenance");

  const context = useMemo<LiveChatVisitorContext>(() => {
    const params = searchParams;
    const path = `${pathname || "/"}${params?.toString() ? `?${params.toString()}` : ""}`;
    return {
      analyticsVisitorId: typeof window === "undefined" ? undefined : getOrCreateVisitorId(),
      analyticsSessionId: typeof window === "undefined" ? undefined : getOrCreateSessionId(),
      path,
      title: typeof document === "undefined" ? path : document.title,
      referrer: typeof document === "undefined" ? "" : document.referrer,
      landingPage: typeof window === "undefined" ? path : window.sessionStorage.getItem("hl_live_landing") || path,
      utmSource: params?.get("utm_source") || undefined,
      utmMedium: params?.get("utm_medium") || undefined,
      utmCampaign: params?.get("utm_campaign") || undefined,
      pageStartedAt: startedAtRef.current,
      deviceType: typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches ? "mobile" : "desktop",
      viewed: inferViewedContext(path),
    };
  }, [pathname, searchParams]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.sessionStorage.getItem("hl_live_landing")) window.sessionStorage.setItem("hl_live_landing", `${pathname || "/"}${window.location.search}`);
    setOpen(isLiveChatFloatingOpen());
    setUnread(readStoredUnreadCount());
  }, [pathname]);

  useEffect(() => {
    contactRef.current = contact;
  }, [contact]);

  useEffect(() => {
    const unlock = () => unlockLiveChatNotificationSound();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    bootRef.current = boot;
  }, [boot]);

  const showPreviewMessage = useCallback((message: LiveChatMessageView, soundEnabled: boolean) => {
    setPreviewMessage(message);
    if (soundEnabled) playLiveChatNotificationSound();
    if (previewTimerRef.current) window.clearTimeout(previewTimerRef.current);
    previewTimerRef.current = window.setTimeout(() => setPreviewMessage(null), 12000);
  }, []);

  const bootstrap = useCallback(async () => {
    if (hiddenOnThisRoute) return;
    const result = await apiFetch<LiveChatBootstrapView>("/api/v1/live-chat/bootstrap", {
      method: "POST",
      body: JSON.stringify({
        context,
        contact: normalizeContact(contactRef.current),
      }),
    });
    if (result.data) {
      setBoot(result.data);
      setMessages(result.data.messages);
      setTyping(result.data.typing ?? null);
      setSuggested(result.data.suggestedMessage || null);
      if (!openRef.current && result.data.conversation?.unreadForVisitor) {
        const latestStaffMessage = [...result.data.messages].reverse().find(isVisitorPreviewMessage) ?? null;
        if (latestStaffMessage && !notifiedStaffMessageIdsRef.current.has(latestStaffMessage.id)) {
          notifiedStaffMessageIdsRef.current.add(latestStaffMessage.id);
          showPreviewMessage(latestStaffMessage, result.data.settings.soundEnabled);
        }
        const nextUnread = Math.max(readStoredUnreadCount(), unreadStaffMessageCount(result.data.messages));
        setUnread(nextUnread);
        storeUnreadCount(nextUnread);
      }
      setError(null);
    } else {
      setError(result.error?.code === "NETWORK_ERROR" ? "HouseLink Live is taking longer than expected. You can still type your message and try again." : result.error?.message ?? "Live Chat is unavailable.");
    }
  }, [context, hiddenOnThisRoute, showPreviewMessage]);

  useEffect(() => {
    if (hiddenOnThisRoute) return;
    void bootstrap();
  }, [bootstrap, hiddenOnThisRoute]);

  useEffect(() => {
    if (hiddenOnThisRoute) return;
    startedAtRef.current = new Date().toISOString();
    const id = window.setTimeout(() => {
      void apiFetch("/api/v1/live-chat/activity", {
        method: "POST",
        body: JSON.stringify({ context, contact: normalizeContact(contactRef.current) }),
      });
    }, 1400);
    return () => window.clearTimeout(id);
  }, [context, hiddenOnThisRoute]);

  useEffect(() => {
    if (!boot?.conversation?.id) return;
    let cancelled = false;
    const poll = async () => {
      if (document.visibilityState !== "visible") return;
      const [result, typingResult] = await Promise.all([
        apiFetch<LiveChatMessageView[]>(`/api/v1/live-chat/messages?conversationId=${encodeURIComponent(boot.conversation!.id)}`, { cache: "no-store" }),
        apiFetch<LiveChatTypingView | null>(`/api/v1/live-chat/typing?conversationId=${encodeURIComponent(boot.conversation!.id)}`, { cache: "no-store" }),
      ]);
      if (cancelled) return;
      if (typingResult.data) setTyping(typingResult.data);
      if (!result.data) return;
      setMessages((current) => {
        const hadLast = current[current.length - 1]?.id;
        const nextLast = result.data![result.data!.length - 1]?.id;
        if (nextLast && hadLast && nextLast !== hadLast) {
          const latest = result.data![result.data!.length - 1];
          if (isVisitorPreviewMessage(latest) && !notifiedStaffMessageIdsRef.current.has(latest.id)) {
            notifiedStaffMessageIdsRef.current.add(latest.id);
          if (open) {
            if (boot.settings.soundEnabled) playLiveChatNotificationSound();
          } else {
            setUnread((value) => {
              const next = value + 1;
              storeUnreadCount(next);
              return next;
            });
            showPreviewMessage(latest, boot.settings.soundEnabled);
          }
          }
        }
        return result.data!;
      });
    };
    const interval = window.setInterval(() => void poll(), open ? 7000 : 15000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [boot?.conversation, boot?.settings.soundEnabled, open, showPreviewMessage]);

  useEffect(() => {
    if (hiddenOnThisRoute || !boot?.visitorId || typeof window === "undefined" || !("EventSource" in window)) return;
    const params = new URLSearchParams();
    if (boot.conversation?.id) params.set("conversationId", boot.conversation.id);
    const source = new EventSource(`/api/v1/live-chat/stream${params.toString() ? `?${params.toString()}` : ""}`);
    source.addEventListener("message", (event) => {
      const payload = parseRealtimeEvent(event);
      const message = payload?.message;
      if (!message) return;
      setMessages((current) => mergeIncomingMessage(current, message));
      if (payload?.conversationId && bootRef.current?.conversation?.id !== payload.conversationId) void bootstrap();
      if (isVisitorPreviewMessage(message) && !notifiedStaffMessageIdsRef.current.has(message.id)) {
        notifiedStaffMessageIdsRef.current.add(message.id);
        const soundEnabled = bootRef.current?.settings.soundEnabled ?? true;
        if (openRef.current) {
          if (soundEnabled) playLiveChatNotificationSound();
        } else {
          setUnread((value) => {
            const next = value + 1;
            storeUnreadCount(next);
            return next;
          });
          showPreviewMessage(message, soundEnabled);
        }
      }
    });
    source.addEventListener("typing", (event) => {
      const payload = parseRealtimeEvent(event);
      if (payload?.typing) setTyping(payload.typing);
    });
    source.addEventListener("receipt", (event) => {
      const payload = parseRealtimeEvent(event);
      if (payload) setMessages((current) => applyReceiptToMessages(current, payload));
    });
    source.onerror = () => source.close();
    return () => source.close();
  }, [boot?.visitorId, boot?.conversation?.id, bootstrap, hiddenOnThisRoute, showPreviewMessage]);

  useEffect(() => {
    const conversationId = boot?.conversation?.id;
    if (!conversationId) return;
    if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
    if (draft.trim()) {
      if (!typingActiveRef.current) {
        typingActiveRef.current = true;
        void apiFetch("/api/v1/live-chat/typing", { method: "POST", body: JSON.stringify({ conversationId, typing: true }) });
      }
      typingTimerRef.current = window.setTimeout(() => {
        typingActiveRef.current = false;
        void apiFetch("/api/v1/live-chat/typing", { method: "POST", body: JSON.stringify({ conversationId, typing: false }) });
      }, 1800);
    } else if (typingActiveRef.current) {
      typingActiveRef.current = false;
      void apiFetch("/api/v1/live-chat/typing", { method: "POST", body: JSON.stringify({ conversationId, typing: false }) });
    }
    return () => {
      if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
    };
  }, [boot?.conversation?.id, draft]);

  useEffect(() => {
    if (!open) return;
    bottomRef.current?.scrollIntoView({ block: "end" });
    setUnread(0);
    if (boot?.conversation?.id) {
      void apiFetch("/api/v1/live-chat/read", { method: "POST", body: JSON.stringify({ conversationId: boot.conversation.id }) });
    }
  }, [boot?.conversation?.id, lastMessageId, open]);

  useEffect(() => {
    return () => {
      if (previewTimerRef.current) window.clearTimeout(previewTimerRef.current);
      if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
    };
  }, []);

  function toggleOpen(next: boolean) {
    setOpen(next);
    setLiveChatFloatingOpen(next);
      if (next) {
        setUnread(0);
        storeUnreadCount(0);
        dismissPreviewMessage();
      }
  }

  async function sendMessage(body = draft) {
    const text = body.trim();
    if (!text || sending) return;
    const nextContact = mergeContactFromMessage({ ...contactRef.current }, text, pendingContactField);
    const capturedPhone = !contactRef.current.phone && nextContact.phone;
    const capturedEmail = !contactRef.current.email && nextContact.email;
    if (capturedPhone || capturedEmail) {
      setContact(nextContact);
      setContactNotice(capturedPhone ? "Saved your WhatsApp number with this chat." : "Saved your email with this chat.");
    }
    const idempotencyKey = crypto.randomUUID();
    const optimistic: LiveChatMessageView = {
      id: `pending-${idempotencyKey}`,
      conversationId: boot?.conversation?.id || "pending",
      senderKind: "VISITOR",
      senderName: nextContact.name || user?.name || "You",
      body: text,
      messageType: "TEXT",
      internal: false,
      automated: false,
      createdAt: new Date().toISOString(),
      deliveredAt: null,
      readAt: null,
      metadata: { deliveryStatus: "sending" },
    };
    setMessages((current) => [...current, optimistic]);
    setDraft("");
    typingActiveRef.current = false;
    if (boot?.conversation?.id) void apiFetch("/api/v1/live-chat/typing", { method: "POST", body: JSON.stringify({ conversationId: boot.conversation.id, typing: false }) });
    setSending(true);
    setError(null);
    const result = await apiFetch<LiveChatMessageView>("/api/v1/live-chat/messages", {
      method: "POST",
      body: JSON.stringify({
        body: text,
        idempotencyKey,
        contact: normalizeContact(nextContact),
        context,
      }),
    });
    if (result.data) {
      setMessages((current) => [...current.filter((message) => message.id !== optimistic.id && message.id !== result.data!.id), result.data!]);
      setSuggested(null);
      setPendingContactField(null);
      if (!boot?.conversation) void bootstrap();
    } else {
      setMessages((current) => current.map((message) => message.id === optimistic.id ? { ...message, metadata: { deliveryStatus: "failed", error: result.error?.message ?? "Message failed. Please try again." } } : message));
      setError(result.error?.message ?? "Message failed. Please try again.");
    }
    setSending(false);
  }

  async function retryMessage(message: LiveChatMessageView) {
    setMessages((current) => current.filter((item) => item.id !== message.id));
    await sendMessage(message.body);
  }

  function handleQuickReply(body: string, contactField?: "phone" | "email") {
    if (contactField) {
      setPendingContactField(contactField);
      setDraft(contactField === "phone" ? "My WhatsApp number is " : "My email is ");
      setContactNotice(contactField === "phone" ? "Type your WhatsApp number in the message box and send it. We will save it with this chat." : "Type your email in the message box and send it. We will save it with this chat.");
      return;
    }
    void sendMessage(body);
  }

  function dismissPreviewMessage() {
    setPreviewMessage(null);
    if (previewTimerRef.current) {
      window.clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
  }

  if (hiddenOnThisRoute || libraryBagOpen || (boot && !boot.settings.enabled)) return null;

  const launcherOnLeft = boot?.settings.mobilePosition === "bottom-left";
  const launcherPosition = launcherOnLeft ? "left-4 items-start sm:left-5" : "right-4 items-end sm:right-5";
  const agentName = boot?.supportAgent?.displayName || boot?.settings.teamDisplayName || "HouseLink Live";
  const supportAvatarUrl = displayImageUrl(boot?.supportAgent?.avatarUrl, { width: 96, height: 96, crop: "fill" });
  const agentTitle = boot?.supportAgent?.title || "HouseLink Support";
  const agentDepartment = boot?.conversation?.department?.name || boot?.supportAgent?.department?.name || "Support team";
  const availabilityLabel = boot?.supportAgent ? "Online" : "After hours";
  const agentIntro = boot?.supportAgent
    ? boot.supportAgent.publicIntro || `${agentTitle} is online`
    : "Leave your name and WhatsApp number, the team will follow up";
  const currentContext = context.viewed?.productTitle || context.viewed?.propertyTitle || context.viewed?.courseTitle || "this page";
  const quickReplies: Array<{ label: string; body: string; icon: typeof Sparkles; contactField?: "phone" | "email" }> = [
    ...(!boot?.supportAgent ? [{ label: "Request callback", body: "Hi, please call or WhatsApp me back. My name is ", icon: Phone }] : []),
    { label: "Is this right for me?", body: `Hi, I am looking at ${currentContext}. Can you help me decide if it is the right fit for what I need?`, icon: Sparkles },
    { label: "Payment help", body: `Hi, I want to buy ${currentContext}, but I need help with payment or proof upload.`, icon: ShieldCheck },
    { label: "WhatsApp me", body: "", icon: Phone, contactField: "phone" as const },
    { label: "Email me details", body: "", icon: Mail, contactField: "email" as const },
  ];
  const bottomClass = open
    ? "bottom-4 sm:bottom-5"
    : bottomDock
      ? "bottom-[calc(5.75rem+env(safe-area-inset-bottom))]"
      : "bottom-[max(1.25rem,env(safe-area-inset-bottom))] sm:bottom-5";

  return (
    <div className={cn("fixed z-[70] flex max-w-[calc(100vw-2rem)] flex-col gap-3 transition-[bottom] duration-200", bottomClass, launcherPosition)}>
      {open ? (
        <section className="flex h-[min(700px,calc(100dvh-1rem))] w-[min(440px,calc(100vw-0.75rem))] flex-col overflow-hidden rounded-[1.35rem] border border-white/60 bg-white shadow-[0_24px_90px_rgba(2,6,23,0.34)] ring-1 ring-emerald-900/10 dark:border-slate-700 dark:bg-slate-950">
          <header className="relative overflow-hidden bg-[#07121f] px-4 py-4 text-white">
            <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#14b8a6,#22c55e,#38bdf8)]" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(20,184,166,0.24),transparent_42%,rgba(56,189,248,0.16))]" />
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-emerald-500 bg-cover bg-center text-white shadow-lg shadow-emerald-950/30 ring-1 ring-white/20"
                  style={supportAvatarUrl ? { backgroundImage: `url(${supportAvatarUrl})` } : undefined}
                >
                  {supportAvatarUrl ? null : <Headphones className="size-5" />}
                  <span className={`absolute bottom-1.5 right-1.5 size-2.5 rounded-full ring-2 ring-slate-950 ${boot?.supportAgent ? "bg-emerald-300" : "bg-amber-300"}`} />
                </span>
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate text-[15px] font-black">{agentName}</p>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-black uppercase", boot?.supportAgent ? "bg-emerald-400/15 text-emerald-100" : "bg-amber-400/15 text-amber-100")}>{availabilityLabel}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-300">{agentTitle} / {agentDepartment}</p>
                  <p className="mt-0.5 truncate text-[11px] text-slate-400">{agentIntro}</p>
                </div>
              </div>
              <button type="button" onClick={() => toggleOpen(false)} className="rounded-full p-2 text-slate-200 transition hover:bg-white/10" aria-label="Minimise live chat">
                <ChevronDown className="size-5" />
              </button>
            </div>
          </header>

          <div className="flex items-start gap-2 border-b border-emerald-100 bg-emerald-50 px-4 py-2.5 text-xs font-semibold leading-5 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-100">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200">
              <ShieldCheck className="size-3" />
            </span>
            <span className="min-w-0">Ready now. Type your message anytime; we will attach this page context for the team.</span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-[linear-gradient(180deg,#f7fbfa_0%,#eefaf5_42%,#f8fafc_100%)] p-4 dark:bg-slate-900/90">
            {messages.length === 0 ? (
              <div className="space-y-3">
                <div className="flex justify-start">
                  <div className="max-w-[88%] rounded-[22px] rounded-tl-md bg-white px-4 py-3 text-sm text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.08)] ring-1 ring-slate-200 dark:bg-slate-950 dark:text-slate-100 dark:ring-slate-800">
                    <p className="font-black text-slate-950 dark:text-white">Hi, welcome to HouseLink.</p>
                    <p className="mt-1 leading-6">{boot?.supportAgent ? `Ask about ${currentContext}, payment, delivery, or the next best step. If we need your number, we will ask nicely.` : `Tell us what you need about ${currentContext}, then leave your WhatsApp number so the team can recover the sale even if you leave this page.`}</p>
                    <span className="mt-3 inline-flex max-w-full items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">
                      <Sparkles className="size-3" /> <span className="truncate">Viewing: {currentContext}</span>
                    </span>
                  </div>
                </div>
                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                  {quickReplies.map((reply) => {
                    const Icon = reply.icon;
                    return (
                      <button
                        key={reply.label}
                        type="button"
                        onClick={() => handleQuickReply(reply.body, reply.contactField)}
                        className="flex min-h-9 shrink-0 items-center gap-2 rounded-full border border-emerald-100 bg-white px-3.5 py-2 text-left text-xs font-black text-slate-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                      >
                        <Icon className="size-3.5 shrink-0 text-emerald-600" />
                        <span>{reply.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
            {contactNotice ? <p className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm ring-1 ring-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-100 dark:ring-emerald-900">{contactNotice}</p> : null}
            {suggested ? (
              <button type="button" onClick={() => void sendMessage(suggested)} className="w-full rounded-lg border border-emerald-200 bg-white p-3 text-left text-sm text-emerald-900 shadow-sm transition hover:border-emerald-400 hover:shadow-md dark:border-emerald-800 dark:bg-slate-950 dark:text-emerald-100">
                <span className="flex items-center gap-1.5 text-xs font-black uppercase text-emerald-600"><Sparkles className="size-3.5" /> Suggested help</span>
                <span className="mt-1 block">{suggested}</span>
              </button>
            ) : null}
            {messages.map((message, index) => <ChatBubble key={message.id} message={message} showReceipt={message.senderKind === "VISITOR" && index === latestVisitorMessageIndex(messages)} onRetry={isFailedLocalMessage(message) ? () => void retryMessage(message) : undefined} />)}
            {sending ? (
              <div className="flex justify-end">
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">Sending...</span>
              </div>
            ) : null}
            {typing?.staffTyping.length ? <TypingIndicator names={typing.staffTyping.map((item) => item.displayName)} /> : null}
            <div ref={bottomRef} />
          </div>

          {error ? (
            <div className="border-t border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">{error}</div>
          ) : null}
          <footer className="border-t border-slate-200 bg-white p-3 shadow-[0_-10px_30px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950">
            {messages.length ? (
              <div className="-mx-1 mb-2 flex gap-2 overflow-x-auto px-1 pb-1">
                {quickReplies.slice(0, 3).map((reply) => {
                  const Icon = reply.icon;
                  return (
                    <button key={reply.label} type="button" onClick={() => handleQuickReply(reply.body, reply.contactField)} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700">
                      <Icon className="size-3.5 text-emerald-600" /> {reply.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
            <div className="flex gap-2">
              <textarea
                aria-label="Chat message"
                rows={1}
                className="max-h-28 min-h-12 flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/15 dark:border-slate-700 dark:bg-slate-900"
                placeholder="Type your message..."
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
              />
              <Button className="size-12 shrink-0 rounded-2xl p-0 shadow-lg shadow-emerald-900/10" onClick={() => void sendMessage()} disabled={!draft.trim() || sending} aria-label="Send live chat message">
                {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </Button>
            </div>
            <p className="mt-2 flex items-start gap-1 text-[11px] leading-4 text-slate-500">
              <ShieldCheck className="size-3" /> {boot?.settings.privacyNotice || "HouseLink uses this chat to provide support."}
            </p>
          </footer>
        </section>
      ) : (
        <>
          {previewMessage ? (
            <button
              type="button"
              onClick={() => toggleOpen(true)}
              className="relative w-[min(360px,calc(100vw-1.25rem))] overflow-hidden rounded-2xl border border-emerald-200 bg-white p-3.5 text-left shadow-[0_22px_60px_rgba(6,95,70,0.28)] ring-1 ring-emerald-100 transition hover:-translate-y-0.5 hover:border-emerald-300 dark:border-emerald-800 dark:bg-slate-950 dark:ring-emerald-900"
            >
              <span className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#14b8a6,#22c55e,#38bdf8)]" />
              <span className="flex gap-3">
                <span className="relative grid size-10 shrink-0 place-items-center rounded-2xl bg-[#07121f] text-white shadow-lg shadow-slate-950/20">
                  <MessageCircle className="size-5" />
                  <span className="absolute -right-0.5 -top-0.5 size-3 rounded-full bg-red-500 ring-2 ring-white" />
                  <span className="absolute bottom-1 right-1 size-2.5 rounded-full bg-emerald-300 ring-2 ring-slate-950" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-[11px] font-black uppercase text-emerald-700 dark:text-emerald-200">
                    <Bell className="size-3.5 animate-pulse" /> New message from {previewMessage.senderName || agentName}
                  </span>
                  <span className="mt-1 line-clamp-3 block text-sm font-black leading-5 text-slate-900 dark:text-slate-100">{previewMessage.body}</span>
                  <span className="mt-2 inline-flex rounded-full bg-emerald-600 px-3 py-1 text-xs font-black text-white">Open chat to reply</span>
                </span>
              </span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => toggleOpen(true)}
            className="group flex w-[8.75rem] items-center gap-2 rounded-2xl border border-emerald-100 bg-white/95 p-2 text-left shadow-[0_18px_45px_rgba(15,23,42,0.18)] ring-1 ring-white/80 backdrop-blur transition hover:-translate-y-0.5 hover:border-emerald-300 sm:w-[17.5rem] sm:max-w-[280px] sm:gap-2.5 sm:p-2.5 dark:border-emerald-900 dark:bg-slate-950/95 dark:ring-slate-800"
            aria-label="Open HouseLink live chat"
          >
            <span className="relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#06111f] text-white shadow-lg shadow-slate-900/20 sm:size-10 dark:bg-emerald-600">
              <MessageCircle className="size-4.5 sm:size-5" />
              {unread ? <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold">{unread}</span> : null}
              <span className="absolute bottom-1 right-1 size-2.5 rounded-full bg-emerald-300 ring-2 ring-slate-950" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[12px] font-black text-slate-950 sm:text-[13px] dark:text-white">HouseLink Live</span>
              <span className="hidden truncate text-[11px] text-slate-600 sm:block dark:text-slate-300">{previewMessage?.body || messages[messages.length - 1]?.body || boot?.settings.widgetGreeting || "Need help choosing?"}</span>
            </span>
            {unread ? <Bell className="hidden size-4 shrink-0 text-red-500 sm:block" /> : null}
          </button>
        </>
      )}
    </div>
  );
}

function ChatBubble({ message, showReceipt = false, onRetry }: { message: LiveChatMessageView; showReceipt?: boolean; onRetry?: () => void }) {
  if (message.messageType === "SYSTEM") {
    return <p className="mx-auto max-w-[90%] rounded-full bg-white/90 px-3 py-1.5 text-center text-xs font-semibold text-slate-500 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">{message.body}</p>;
  }
  const mine = message.senderKind === "VISITOR";
  const card = message.metadata && typeof message.metadata === "object" ? message.metadata as { url?: string; title?: string } : null;
  const failed = isFailedLocalMessage(message);
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[82%] rounded-[18px] px-3.5 py-2.5 text-sm shadow-sm ring-1 ${failed ? "rounded-br-md bg-red-600 text-white ring-red-700/20" : mine ? "rounded-br-md bg-emerald-600 text-white ring-emerald-700/20" : "rounded-bl-md bg-white text-slate-800 ring-slate-200 dark:bg-slate-950 dark:text-slate-100 dark:ring-slate-800"}`}>
        {!mine ? <p className="mb-1 flex items-center gap-1 text-[10px] font-black uppercase text-emerald-600"><UserRound className="size-3" /> {message.senderName || "HouseLink"}</p> : null}
        <p className="whitespace-pre-wrap leading-6">{message.body}</p>
        {card?.url ? (
          <a href={card.url} className={`mt-2 block rounded-xl px-3 py-2 text-xs font-bold underline-offset-2 hover:underline ${mine ? "bg-white/15" : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100"}`}>
            {card.title || "Open HouseLink page"}
          </a>
        ) : null}
        <p className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${mine ? "text-emerald-50" : "text-slate-400"}`}>
          <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          {mine && showReceipt ? <MessageReceipt message={message} /> : null}
        </p>
        {failed && onRetry ? (
          <button type="button" onClick={onRetry} className="mt-2 rounded-full bg-white px-3 py-1 text-xs font-black text-red-700">
            Failed to send. Tap to retry.
          </button>
        ) : null}
      </div>
    </div>
  );
}

function MessageReceipt({ message }: { message: LiveChatMessageView }) {
  if (message.readAt) return <span className="inline-flex items-center gap-1 font-bold text-[#34b7f1]"><CheckCheck className="size-3.5" /> Read</span>;
  if (message.deliveredAt) return <span className="inline-flex items-center gap-1 font-bold"><CheckCheck className="size-3.5" /> Delivered</span>;
  return <span className="inline-flex items-center gap-1 font-bold"><Check className="size-3.5" /> Sent</span>;
}

function TypingIndicator({ names }: { names: string[] }) {
  const label = names.length > 1 ? `${names.slice(0, 2).join(" and ")} are typing...` : `${names[0] || "HouseLink"} is typing...`;
  return (
    <div className="flex justify-start">
      <div className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-500 shadow-sm ring-1 ring-slate-200 dark:bg-slate-950 dark:text-slate-300 dark:ring-slate-800">
        {label}
      </div>
    </div>
  );
}

function latestVisitorMessageIndex(messages: LiveChatMessageView[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].senderKind === "VISITOR" && messages[index].messageType !== "SYSTEM") return index;
  }
  return -1;
}

function isFailedLocalMessage(message: LiveChatMessageView) {
  return Boolean(message.id.startsWith("pending-") && message.metadata && typeof message.metadata === "object" && (message.metadata as { deliveryStatus?: string }).deliveryStatus === "failed");
}

function parseRealtimeEvent(event: Event) {
  try {
    return JSON.parse((event as MessageEvent<string>).data) as LiveChatRealtimeEvent;
  } catch {
    return null;
  }
}

function mergeIncomingMessage(messages: LiveChatMessageView[], message: LiveChatMessageView) {
  if (messages.some((item) => item.id === message.id)) return messages;
  return [...messages, message].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

function applyReceiptToMessages(messages: LiveChatMessageView[], receipt: LiveChatRealtimeEvent) {
  const ids = new Set(receipt.messageIds ?? []);
  if (!ids.size && !receipt.readAt && !receipt.deliveredAt) return messages;
  return messages.map((message) => {
    if (ids.size && !ids.has(message.id)) return message;
    return {
      ...message,
      deliveredAt: receipt.deliveredAt ?? message.deliveredAt,
      readAt: receipt.readAt ?? message.readAt,
    };
  });
}

function unreadStaffMessageCount(messages: LiveChatMessageView[]) {
  return messages.filter((message) => isVisitorPreviewMessage(message) && !message.readAt).length;
}

function readStoredUnreadCount() {
  if (typeof window === "undefined") return 0;
  const value = Number(window.localStorage.getItem(UNREAD_STORAGE_KEY));
  return Number.isFinite(value) && value > 0 ? Math.min(99, Math.round(value)) : 0;
}

function storeUnreadCount(value: number) {
  if (typeof window === "undefined") return;
  if (value > 0) window.localStorage.setItem(UNREAD_STORAGE_KEY, String(Math.min(99, value)));
  else window.localStorage.removeItem(UNREAD_STORAGE_KEY);
}

function normalizeContact(contact: { name?: string; phone?: string; email?: string }) {
  return {
    name: contact.name?.trim(),
    phone: contact.phone?.trim(),
    email: contact.email?.trim(),
  };
}

function mergeContactFromMessage(contact: ContactState, body: string, expectedField: "phone" | "email" | null) {
  const email = body.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  const phone = body.match(/(?:\+?\d[\d\s().-]{6,}\d)/)?.[0]?.replace(/[^\d+]/g, "");
  if ((expectedField === "email" || email) && email) contact.email = email;
  if ((expectedField === "phone" || phone) && phone) contact.phone = phone;
  return contact;
}

function isVisitorPreviewMessage(message: LiveChatMessageView) {
  return !message.internal && message.messageType !== "SYSTEM" && message.senderKind !== "VISITOR" && Boolean(message.body.trim());
}

function inferViewedContext(path: string) {
  const parts = path.split("?")[0].split("/").filter(Boolean);
  if (parts[0] === "library" && parts[1]) return { productTitle: humanize(parts[1]) };
  if (parts[0] === "listings" && parts[1]) return { propertyTitle: humanize(parts[1]) };
  if (parts[0] === "academy" && parts[1]) return { courseTitle: humanize(parts[1]) };
  return {};
}

function humanize(value: string) {
  return decodeURIComponent(value).replace(/-/g, " ").replace(/\b\w/g, (match) => match.toUpperCase());
}
