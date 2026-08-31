"use client";

import { Bell, ChevronDown, Headphones, Loader2, Mail, MessageCircle, Phone, Send, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useApp } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import { isLiveChatFloatingOpen, setLiveChatFloatingOpen, useLibraryBagFloatingOpen } from "@/lib/live-chat/floating-state";
import { useHouseLinkBottomDock } from "@/lib/ui/bottom-dock";
import { cn } from "@/lib/utils";
import type { LiveChatBootstrapView, LiveChatMessageView, LiveChatVisitorContext } from "@/lib/live-chat/types";

type ContactState = { name?: string; phone?: string; email?: string };

export function LiveChatWidget() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useApp();
  const [open, setOpen] = useState(false);
  const [boot, setBoot] = useState<LiveChatBootstrapView | null>(null);
  const [messages, setMessages] = useState<LiveChatMessageView[]>([]);
  const [draft, setDraft] = useState("");
  const [contact, setContact] = useState<ContactState>({});
  const [loading, setLoading] = useState(true);
  const [slowBootstrap, setSlowBootstrap] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contactNotice, setContactNotice] = useState<string | null>(null);
  const [pendingContactField, setPendingContactField] = useState<"phone" | "email" | null>(null);
  const [suggested, setSuggested] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const contactRef = useRef(contact);
  const startedAtRef = useRef(new Date().toISOString());
  const bottomDock = useHouseLinkBottomDock();
  const libraryBagOpen = useLibraryBagFloatingOpen();
  const lastMessageId = messages[messages.length - 1]?.id;
  const hiddenOnThisRoute = pathname?.startsWith("/dashboard") || pathname?.startsWith("/auth") || pathname?.startsWith("/maintenance");

  const context = useMemo<LiveChatVisitorContext>(() => {
    const params = searchParams;
    const path = `${pathname || "/"}${params?.toString() ? `?${params.toString()}` : ""}`;
    return {
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
  }, [pathname]);

  useEffect(() => {
    contactRef.current = contact;
  }, [contact]);

  const bootstrap = useCallback(async () => {
    if (hiddenOnThisRoute) return;
    setLoading(true);
    setSlowBootstrap(false);
    const slowTimer = window.setTimeout(() => setSlowBootstrap(true), 2500);
    try {
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
        setSuggested(result.data.suggestedMessage || null);
        setError(null);
      } else {
        setError(result.error?.code === "NETWORK_ERROR" ? "HouseLink Live is taking longer than expected. You can still type your message and try again." : result.error?.message ?? "Live Chat is unavailable.");
      }
    } finally {
      window.clearTimeout(slowTimer);
      setLoading(false);
    }
  }, [context, hiddenOnThisRoute]);

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
      const result = await apiFetch<LiveChatMessageView[]>(`/api/v1/live-chat/messages?conversationId=${encodeURIComponent(boot.conversation!.id)}`, { cache: "no-store" });
      if (cancelled || !result.data) return;
      setMessages((current) => {
        const hadLast = current[current.length - 1]?.id;
        const nextLast = result.data![result.data!.length - 1]?.id;
        if (!open && nextLast && hadLast && nextLast !== hadLast) setUnread((value) => value + 1);
        return result.data!;
      });
    };
    const interval = window.setInterval(() => void poll(), open ? 7000 : 15000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [boot?.conversation, open]);

  useEffect(() => {
    if (!open) return;
    bottomRef.current?.scrollIntoView({ block: "end" });
    setUnread(0);
    if (boot?.conversation?.id) {
      void apiFetch("/api/v1/live-chat/read", { method: "POST", body: JSON.stringify({ conversationId: boot.conversation.id }) });
    }
  }, [boot?.conversation?.id, lastMessageId, open]);

  function toggleOpen(next: boolean) {
    setOpen(next);
    setLiveChatFloatingOpen(next);
    if (next) setUnread(0);
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
    };
    setMessages((current) => [...current, optimistic]);
    setDraft("");
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
      setMessages((current) => current.filter((message) => message.id !== optimistic.id));
      setDraft(text);
      setError(result.error?.message ?? "Message failed. Please try again.");
    }
    setSending(false);
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

  if (hiddenOnThisRoute || libraryBagOpen || (boot && !boot.settings.enabled)) return null;

  const launcherOnLeft = boot?.settings.mobilePosition === "bottom-left";
  const launcherPosition = launcherOnLeft ? "left-4 items-start sm:left-5" : "right-4 items-end sm:right-5";
  const agentName = boot?.supportAgent?.displayName || boot?.settings.teamDisplayName || "HouseLink Live";
  const agentIntro = boot?.supportAgent
    ? boot.supportAgent.publicIntro || `${boot.supportAgent.title || "Support"} is online`
    : "Leave a message, the team will reply here";
  const currentContext = context.viewed?.productTitle || context.viewed?.propertyTitle || context.viewed?.courseTitle || "this page";
  const quickReplies: Array<{ label: string; body: string; icon: typeof Sparkles; contactField?: "phone" | "email" }> = [
    { label: "Help me buy this", body: `Hi, I am interested in ${currentContext}. Please help me with the best next step.`, icon: Sparkles },
    { label: "Payment help", body: `Hi, I need help paying for ${currentContext}.`, icon: ShieldCheck },
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
        <section className="flex h-[min(690px,calc(100dvh-1.5rem))] w-[min(430px,calc(100vw-1rem))] flex-col overflow-hidden rounded-2xl border border-white/40 bg-white shadow-[0_24px_80px_rgba(2,6,23,0.32)] ring-1 ring-slate-950/5 dark:border-slate-700 dark:bg-slate-950">
          <header className="relative overflow-hidden bg-[#06111f] px-4 py-3.5 text-white">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300" />
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-emerald-500 bg-cover bg-center text-white shadow-lg shadow-emerald-950/30 ring-1 ring-white/15"
                  style={boot?.supportAgent?.avatarUrl ? { backgroundImage: `url(${boot.supportAgent.avatarUrl})` } : undefined}
                >
                  {boot?.supportAgent?.avatarUrl ? null : <Headphones className="size-5" />}
                  <span className={`absolute bottom-1.5 right-1.5 size-2.5 rounded-full ring-2 ring-slate-950 ${boot?.supportAgent ? "bg-emerald-300" : "bg-amber-300"}`} />
                </span>
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate text-[15px] font-black">{agentName}</p>
                    <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-100">Online</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-300">{agentIntro}</p>
                </div>
              </div>
              <button type="button" onClick={() => toggleOpen(false)} className="rounded-full p-2 text-slate-200 transition hover:bg-white/10" aria-label="Minimise live chat">
                <ChevronDown className="size-5" />
              </button>
            </div>
          </header>

          <div className="flex items-start gap-2 border-b border-slate-100 bg-white px-4 py-2.5 text-xs font-semibold leading-5 text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200">
              {loading ? <Loader2 className="size-3 animate-spin" /> : <ShieldCheck className="size-3" />}
            </span>
            <span className="min-w-0">{loading ? (slowBootstrap ? "Still connecting. You can type while we wake the team." : "Opening your HouseLink chat...") : "Your page context is shared so you do not repeat yourself."}</span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-[#f6f8fb] p-4 dark:bg-slate-900/90">
            {loading ? (
              <div className="mx-auto flex w-fit items-center rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-500 shadow-sm ring-1 ring-slate-200 dark:bg-slate-950 dark:text-slate-300 dark:ring-slate-800"><Loader2 className="mr-2 size-3.5 animate-spin" /> Syncing chat</div>
            ) : null}
            {messages.length === 0 ? (
              <div className="space-y-3">
                <div className="flex justify-start">
                  <div className="max-w-[86%] rounded-[18px] rounded-tl-md bg-white px-4 py-3 text-sm text-slate-700 shadow-sm ring-1 ring-slate-200 dark:bg-slate-950 dark:text-slate-100 dark:ring-slate-800">
                    <p className="font-black text-slate-950 dark:text-white">{loading ? "You can start typing." : "Hi, welcome to HouseLink."}</p>
                    <p className="mt-1 leading-6">{loading ? "HouseLink is opening your chat in the background." : `Ask about ${currentContext}, payment, delivery, or the next best step. If we need your number, we will ask nicely. No interrogation desk here.`}</p>
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
                        className="flex min-h-9 shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-left text-xs font-black text-slate-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                      >
                        <Icon className="size-3.5 shrink-0 text-emerald-600" />
                        <span>{reply.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
            {contactNotice ? <p className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-100 dark:ring-emerald-900">{contactNotice}</p> : null}
            {suggested ? (
              <button type="button" onClick={() => void sendMessage(suggested)} className="w-full rounded-lg border border-emerald-200 bg-white p-3 text-left text-sm text-emerald-900 shadow-sm transition hover:border-emerald-400 hover:shadow-md dark:border-emerald-800 dark:bg-slate-950 dark:text-emerald-100">
                <span className="flex items-center gap-1.5 text-xs font-black uppercase text-emerald-600"><Sparkles className="size-3.5" /> Suggested help</span>
                <span className="mt-1 block">{suggested}</span>
              </button>
            ) : null}
            {messages.map((message) => <ChatBubble key={message.id} message={message} />)}
            {sending ? (
              <div className="flex justify-end">
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">Sending...</span>
              </div>
            ) : null}
            {draft.trim() ? (
              <div className="text-xs text-slate-400">You are typing...</div>
            ) : null}
            <div ref={bottomRef} />
          </div>

          {error ? (
            <div className="border-t border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">{error}</div>
          ) : null}
          <footer className="border-t border-slate-200 bg-white p-3 shadow-[0_-10px_30px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950">
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
        <button
          type="button"
          onClick={() => toggleOpen(true)}
          className="group flex max-w-[330px] items-center gap-3 rounded-2xl border border-emerald-100 bg-white/95 p-3 text-left shadow-[0_18px_45px_rgba(15,23,42,0.18)] ring-1 ring-white/80 backdrop-blur transition hover:-translate-y-0.5 hover:border-emerald-300 dark:border-emerald-900 dark:bg-slate-950/95 dark:ring-slate-800"
          aria-label="Open HouseLink live chat"
        >
          <span className="relative flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#06111f] text-white shadow-lg shadow-slate-900/20 dark:bg-emerald-600">
            <MessageCircle className="size-6" />
            {unread ? <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold">{unread}</span> : null}
            <span className="absolute bottom-1 right-1 size-2.5 rounded-full bg-emerald-300 ring-2 ring-slate-950" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-black text-slate-950 dark:text-white">HouseLink Live</span>
            <span className="block truncate text-xs text-slate-600 dark:text-slate-300">{messages[messages.length - 1]?.body || boot?.settings.widgetGreeting || "Need help choosing?"}</span>
          </span>
          {unread ? <Bell className="size-4 shrink-0 text-red-500" /> : null}
        </button>
      )}
    </div>
  );
}

function ChatBubble({ message }: { message: LiveChatMessageView }) {
  if (message.messageType === "SYSTEM") {
    return <p className="mx-auto max-w-[90%] rounded-full bg-white/90 px-3 py-1.5 text-center text-xs font-semibold text-slate-500 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">{message.body}</p>;
  }
  const mine = message.senderKind === "VISITOR";
  const card = message.metadata && typeof message.metadata === "object" ? message.metadata as { url?: string; title?: string } : null;
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[82%] rounded-[18px] px-3.5 py-2.5 text-sm shadow-sm ring-1 ${mine ? "rounded-br-md bg-emerald-600 text-white ring-emerald-700/20" : "rounded-bl-md bg-white text-slate-800 ring-slate-200 dark:bg-slate-950 dark:text-slate-100 dark:ring-slate-800"}`}>
        {!mine ? <p className="mb-1 flex items-center gap-1 text-[10px] font-black uppercase text-emerald-600"><UserRound className="size-3" /> {message.senderName || "HouseLink"}</p> : null}
        <p className="whitespace-pre-wrap leading-6">{message.body}</p>
        {card?.url ? (
          <a href={card.url} className={`mt-2 block rounded-xl px-3 py-2 text-xs font-bold underline-offset-2 hover:underline ${mine ? "bg-white/15" : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100"}`}>
            {card.title || "Open HouseLink page"}
          </a>
        ) : null}
        <p className={`mt-1 text-[10px] ${mine ? "text-emerald-50" : "text-slate-400"}`}>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
      </div>
    </div>
  );
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
