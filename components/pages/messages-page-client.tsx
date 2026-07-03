"use client";

import { MessageCircle, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { useApp } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";

type Conversation = {
  id: string;
  listingTitle: string;
  participantNames: string[];
  updatedAt: string;
};

type Message = {
  id: string;
  senderName: string;
  body: string;
  createdAt: string;
};

export function MessagesPageClient() {
  const { user, showToast } = useApp();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!user) {
      return;
    }
    void (async () => {
      const result = await apiFetch<Conversation[]>("/api/v1/messages");
      const list = result.data ?? [];
      setConversations(list);
      if (list[0]) {
        setActiveId(list[0].id);
      }
    })();
  }, [user]);

  useEffect(() => {
    if (!activeId) {
      return;
    }
    void (async () => {
      const result = await apiFetch<Message[]>(`/api/v1/messages/${activeId}`);
      setMessages(result.data ?? []);
    })();
  }, [activeId]);

  async function sendMessage() {
    if (!draft.trim() || !activeId) {
      return;
    }
    const result = await apiFetch<Message>("/api/v1/messages", {
      method: "POST",
      body: JSON.stringify({ conversationId: activeId, body: draft }),
    });
    if (result.data) {
      setMessages((current) => [...current, result.data as Message]);
      setDraft("");
    } else {
      showToast(result.error?.message ?? "Could not send message.", "error");
    }
  }

  const active = conversations.find((conversation) => conversation.id === activeId);

  return (
    <PageShell
      eyebrow="Messages"
      title="Tenant-landlord conversations"
      description="Messaging centralizes enquiries while preserving WhatsApp and call workflows."
    >
      {!user ? (
        <div className="premium-card rounded-lg p-8 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
            <MessageCircle className="size-6" aria-hidden="true" />
          </span>
          <p className="mt-4 text-lg font-semibold text-ink dark:text-white">Sign in to view conversations</p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Your landlord, tenant, and agent messages will appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <aside className="surface-panel overflow-hidden rounded-lg">
            <div className="border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-slate-50 p-4 dark:border-slate-700 dark:from-slate-800 dark:to-slate-900">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-200">Active enquiries</p>
            </div>
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => setActiveId(conversation.id)}
                className={`block w-full border-b border-slate-200 p-4 text-left last:border-b-0 dark:border-slate-700 ${
                  activeId === conversation.id ? "bg-emerald-50 dark:bg-emerald-950/30" : ""
                }`}
              >
                <p className="font-semibold">{conversation.participantNames.find((name) => name !== user.name) ?? "Contact"}</p>
                <p className="mt-1 text-sm text-slate-500">{conversation.listingTitle}</p>
              </button>
            ))}
          </aside>
          <section className="surface-panel overflow-hidden rounded-lg">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 p-5 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
                  <MessageCircle className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-semibold">{active?.participantNames.find((name) => name !== user.name) ?? "Conversation"}</h2>
                  <p className="text-sm text-slate-500">{active?.listingTitle}</p>
                </div>
              </div>
            </div>
            <div className="grid max-h-[420px] gap-4 overflow-y-auto p-5">
              {messages.map((message) => (
                <p
                  key={message.id}
                  className={`max-w-lg rounded-lg p-3 text-sm ${
                    message.senderName === user.name
                      ? "ml-auto bg-emerald-700 text-white"
                      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  }`}
                >
                  {message.body}
                </p>
              ))}
            </div>
            <div className="flex gap-3 border-t border-slate-200 p-4 dark:border-slate-700">
              <input
                className="h-11 flex-1 rounded-lg border border-slate-200 bg-white px-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 dark:border-slate-700 dark:bg-slate-950"
                placeholder="Write a message"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
              />
              <Button onClick={() => void sendMessage()}>
                <Send className="size-4" aria-hidden="true" />
                Send
              </Button>
            </div>
          </section>
        </div>
      )}
    </PageShell>
  );
}
