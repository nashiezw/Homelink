"use client";

import { Bell, ChevronDown, Headphones, Loader2, MessageCircle, Send, ShieldCheck, UserRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useApp } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import { useLibraryCart } from "@/lib/library/cart-client";
import { isLiveChatFloatingOpen, setLiveChatFloatingOpen } from "@/lib/live-chat/floating-state";
import { useHouseLinkBottomDock } from "@/lib/ui/bottom-dock";
import { cn } from "@/lib/utils";
import type { LiveChatBootstrapView, LiveChatMessageView, LiveChatVisitorContext } from "@/lib/live-chat/types";

export function LiveChatWidget() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useApp();
  const { count: libraryCartCount } = useLibraryCart();
  const [open, setOpen] = useState(false);
  const [boot, setBoot] = useState<LiveChatBootstrapView | null>(null);
  const [messages, setMessages] = useState<LiveChatMessageView[]>([]);
  const [draft, setDraft] = useState("");
  const [contact, setContact] = useState({ name: "", phone: "", email: "" });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggested, setSuggested] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const contactRef = useRef(contact);
  const startedAtRef = useRef(new Date().toISOString());
  const bottomDock = useHouseLinkBottomDock();
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
      setError(result.error?.message ?? "Live Chat is unavailable.");
    }
    setLoading(false);
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
    const idempotencyKey = crypto.randomUUID();
    const optimistic: LiveChatMessageView = {
      id: `pending-${idempotencyKey}`,
      conversationId: boot?.conversation?.id || "pending",
      senderKind: "VISITOR",
      senderName: contact.name || user?.name || "You",
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
        contact: normalizeContact(contactRef.current),
        context,
      }),
    });
    if (result.data) {
      setMessages((current) => [...current.filter((message) => message.id !== optimistic.id && message.id !== result.data!.id), result.data!]);
      setSuggested(null);
      if (!boot?.conversation) void bootstrap();
    } else {
      setMessages((current) => current.filter((message) => message.id !== optimistic.id));
      setDraft(text);
      setError(result.error?.message ?? "Message failed. Please try again.");
    }
    setSending(false);
  }

  if (hiddenOnThisRoute || (boot && !boot.settings.enabled)) return null;

  const launcherOnLeft = boot?.settings.mobilePosition === "bottom-left";
  const launcherPosition = launcherOnLeft ? "left-4 items-start sm:left-5" : "right-4 items-end sm:right-5";
  const closedLiftForCart = !open && !launcherOnLeft && libraryCartCount > 0;
  const bottomClass = open
    ? "bottom-4 sm:bottom-5"
    : closedLiftForCart && bottomDock
      ? "bottom-[calc(9.75rem+env(safe-area-inset-bottom))] sm:bottom-[calc(10rem+env(safe-area-inset-bottom))]"
      : closedLiftForCart
        ? "bottom-[calc(5.25rem+env(safe-area-inset-bottom))] sm:bottom-[calc(5.5rem+env(safe-area-inset-bottom))]"
        : "bottom-[max(1.25rem,env(safe-area-inset-bottom))] sm:bottom-5";

  return (
    <div className={cn("fixed z-[70] flex max-w-[calc(100vw-2rem)] flex-col gap-3 transition-[bottom] duration-200", bottomClass, launcherPosition)}>
      {open ? (
        <section className="flex h-[min(680px,calc(100vh-2rem))] w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl shadow-slate-900/25 dark:border-slate-700 dark:bg-slate-950">
          <header className="flex items-center justify-between gap-3 bg-slate-950 px-4 py-3 text-white">
            <div className="flex min-w-0 items-center gap-3">
              <span
                className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-emerald-500 bg-cover bg-center text-white"
                style={boot?.supportAgent?.avatarUrl ? { backgroundImage: `url(${boot.supportAgent.avatarUrl})` } : undefined}
              >
                {boot?.supportAgent?.avatarUrl ? null : <Headphones className="size-5" />}
                <span className={`absolute bottom-0 right-0 size-2.5 rounded-full ring-2 ring-slate-950 ${boot?.supportAgent ? "bg-emerald-300" : "bg-amber-300"}`} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{boot?.supportAgent?.displayName || boot?.settings.teamDisplayName || "HouseLink Live"}</p>
                <p className="truncate text-xs text-emerald-100">{boot?.supportAgent ? boot.supportAgent.publicIntro || `${boot.supportAgent.title || "Support"} is online` : "Leave a message, the team will reply here"}</p>
              </div>
            </div>
            <button type="button" onClick={() => toggleOpen(false)} className="rounded-md p-2 text-slate-200 hover:bg-white/10" aria-label="Minimise live chat">
              <ChevronDown className="size-5" />
            </button>
          </header>

          <div className="border-b border-slate-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 dark:border-slate-800 dark:bg-emerald-950/30 dark:text-emerald-100">
            {loading ? "Connecting you to HouseLink..." : boot?.settings.welcomeMessage}
          </div>

          <div className="grid gap-3 border-b border-slate-200 p-3 dark:border-slate-800 sm:grid-cols-3">
            <input aria-label="Your name" className="h-10 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900" placeholder="Name" value={contact.name || user?.name || ""} onChange={(event) => setContact((current) => ({ ...current, name: event.target.value }))} />
            <input aria-label="Phone or WhatsApp" className="h-10 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900" placeholder="WhatsApp" value={contact.phone || user?.phone || ""} onChange={(event) => setContact((current) => ({ ...current, phone: event.target.value }))} />
            <input aria-label="Email" className="h-10 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900" placeholder="Email" value={contact.email || user?.email || ""} onChange={(event) => setContact((current) => ({ ...current, email: event.target.value }))} />
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4 dark:bg-slate-900/80">
            {loading ? (
              <div className="flex items-center justify-center py-10 text-sm text-slate-500"><Loader2 className="mr-2 size-4 animate-spin" /> Loading chat</div>
            ) : null}
            {messages.length === 0 && !loading ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                <p className="font-semibold text-slate-900 dark:text-white">Ask freely.</p>
                <p className="mt-1">No account needed. We will use your page context so you do not have to explain where you are stuck.</p>
              </div>
            ) : null}
            {suggested ? (
              <button type="button" onClick={() => void sendMessage(suggested)} className="w-full rounded-lg border border-emerald-200 bg-white p-3 text-left text-sm text-emerald-900 shadow-sm hover:border-emerald-400 dark:border-emerald-800 dark:bg-slate-950 dark:text-emerald-100">
                <span className="text-xs font-bold uppercase text-emerald-600">Suggested help</span>
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
          <footer className="border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex gap-2">
              <textarea
                aria-label="Chat message"
                rows={1}
                className="max-h-28 min-h-11 flex-1 resize-none rounded-md border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 dark:border-slate-700 dark:bg-slate-900"
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
              <Button onClick={() => void sendMessage()} disabled={!draft.trim() || sending} aria-label="Send live chat message">
                {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </Button>
            </div>
            <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-500">
              <ShieldCheck className="size-3" /> {boot?.settings.privacyNotice || "HouseLink uses this chat to provide support."}
            </p>
          </footer>
        </section>
      ) : (
        <button
          type="button"
          onClick={() => toggleOpen(true)}
          className="group flex max-w-[320px] items-center gap-3 rounded-lg border border-emerald-200 bg-white p-3 text-left shadow-xl shadow-slate-900/15 transition hover:-translate-y-0.5 hover:border-emerald-400 dark:border-emerald-900 dark:bg-slate-950"
          aria-label="Open HouseLink live chat"
        >
          <span className="relative flex size-12 shrink-0 items-center justify-center rounded-md bg-emerald-600 text-white">
            <MessageCircle className="size-6" />
            {unread ? <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold">{unread}</span> : null}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold text-slate-950 dark:text-white">HouseLink Live</span>
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
    return <p className="mx-auto max-w-[86%] rounded-full bg-slate-200 px-3 py-1 text-center text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{message.body}</p>;
  }
  const mine = message.senderKind === "VISITOR";
  const card = message.metadata && typeof message.metadata === "object" ? message.metadata as { url?: string; title?: string } : null;
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[84%] rounded-lg px-3 py-2 text-sm shadow-sm ${mine ? "bg-emerald-600 text-white" : "bg-white text-slate-800 dark:bg-slate-950 dark:text-slate-100"}`}>
        {!mine ? <p className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase text-emerald-600"><UserRound className="size-3" /> {message.senderName || "HouseLink"}</p> : null}
        <p className="whitespace-pre-wrap leading-6">{message.body}</p>
        {card?.url ? (
          <a href={card.url} className={`mt-2 block rounded-md px-3 py-2 text-xs font-bold underline-offset-2 hover:underline ${mine ? "bg-white/15" : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100"}`}>
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
