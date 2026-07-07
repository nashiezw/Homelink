"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, MessageSquare, Pin, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/providers/app-provider";
import { apiFetch } from "@/lib/api/client";

type Thread = {
  id: string;
  title: string;
  pinned: boolean;
  locked: boolean;
  authorId: string;
  createdAt: string;
  posts: Array<{ id: string; authorId: string; body: string; createdAt: string }>;
};

export function DiscussionPanel({ courseId }: { courseId: string }) {
  const { user, showToast } = useApp();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [busy, setBusy] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [replyBody, setReplyBody] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const result = await apiFetch<{ threads: Thread[] }>(`/api/v1/academy/discussions?courseId=${courseId}`);
    if (result.data?.threads) setThreads(result.data.threads);
  }, [courseId]);

  useEffect(() => { void load(); }, [load]);

  async function createThread() {
    if (!newTitle.trim() || !newBody.trim()) return;
    setBusy(true);
    const result = await apiFetch("/api/v1/academy/discussions", {
      method: "POST",
      body: JSON.stringify({ courseId, title: newTitle, body: newBody }),
    });
    setBusy(false);
    if (result.error) { showToast(result.error.message, "error"); return; }
    setNewTitle("");
    setNewBody("");
    showToast("Discussion started.");
    await load();
  }

  async function reply(threadId: string) {
    const body = replyBody[threadId]?.trim();
    if (!body) return;
    setBusy(true);
    const result = await apiFetch("/api/v1/academy/discussions", {
      method: "POST",
      body: JSON.stringify({ courseId, threadId, body }),
    });
    setBusy(false);
    if (result.error) { showToast(result.error.message, "error"); return; }
    setReplyBody({ ...replyBody, [threadId]: "" });
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
        <h3 className="font-bold flex items-center gap-2"><MessageSquare className="size-5 text-emerald-500" /> Start a discussion</h3>
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Topic title"
          className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
        />
        <textarea
          value={newBody}
          onChange={(e) => setNewBody(e.target.value)}
          rows={4}
          placeholder="Share your thoughts, questions, or insights..."
          className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
        />
        <Button className="mt-3" disabled={busy} onClick={() => void createThread()}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4 mr-2" />} Post discussion
        </Button>
      </div>

      {threads.map((thread) => (
        <article key={thread.id} className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-start gap-2">
            {thread.pinned && <Pin className="size-4 text-amber-500 mt-1" />}
            <div className="flex-1">
              <h4 className="font-bold text-lg">{thread.title}</h4>
              <p className="text-xs text-slate-500 mt-1">{new Date(thread.createdAt).toLocaleString()}</p>
            </div>
            {thread.locked && <span className="text-xs rounded-full bg-slate-100 px-2 py-1 dark:bg-slate-800">Locked</span>}
          </div>
          <div className="mt-4 space-y-4">
            {thread.posts.map((post) => (
              <div key={post.id} className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900/50">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{post.body}</p>
                <p className="mt-2 text-xs text-slate-500">{post.authorId === user?.id ? "You" : "Learner"} · {new Date(post.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
          {!thread.locked && (
            <div className="mt-4 flex gap-2">
              <input
                value={replyBody[thread.id] ?? ""}
                onChange={(e) => setReplyBody({ ...replyBody, [thread.id]: e.target.value })}
                placeholder="Write a reply..."
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
              <Button variant="secondary" disabled={busy} onClick={() => void reply(thread.id)}>Reply</Button>
            </div>
          )}
        </article>
      ))}
      {!threads.length && (
        <p className="text-center text-slate-500 py-8">No discussions yet. Be the first to start a conversation.</p>
      )}
    </div>
  );
}
