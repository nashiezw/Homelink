"use client";

import { FormEvent, useMemo, useState } from "react";
import { MessageSquare, Reply, Send, ThumbsDown, ThumbsUp } from "lucide-react";

export type PublicBlogComment = {
  id: string;
  postId: string;
  parentId: string | null;
  authorName: string;
  body: string;
  status?: string;
  createdAt: string;
  replies: PublicBlogComment[];
};

type CommentDraft = {
  authorName: string;
  authorEmail: string;
  body: string;
  company: string;
};

const emptyDraft: CommentDraft = { authorName: "", authorEmail: "", body: "", company: "" };

export function BlogComments({ postId, initialComments }: { postId: string; initialComments: PublicBlogComment[] }) {
  const [comments, setComments] = useState(initialComments);
  const [replyTo, setReplyTo] = useState<PublicBlogComment | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const total = useMemo(() => comments.reduce((sum, comment) => sum + 1 + comment.replies.length, 0), [comments]);

  function addComment(comment: PublicBlogComment) {
    if (comment.parentId) {
      setComments((current) => current.map((item) => item.id === comment.parentId ? { ...item, replies: [...item.replies, comment] } : item));
      setReplyTo(null);
      return;
    }
    setComments((current) => [...current, comment]);
  }

  return (
    <section className="mt-12 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          <MessageSquare className="size-5" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Reader discussion</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-normal text-ink dark:text-white">Share your view</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Add your experience, ask a clear question, or reply to another reader. Please keep it respectful and useful for people making property decisions in Zimbabwe.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <CommentForm
          postId={postId}
          parentId={replyTo?.id ?? null}
          submitLabel={replyTo ? `Reply to ${replyTo.authorName}` : "Post comment"}
          onCancel={replyTo ? () => setReplyTo(null) : undefined}
          onSaved={(comment) => {
            if (comment.status === "APPROVED") addComment(comment);
            setStatus("Thank you. Your comment has been sent for review.");
            window.setTimeout(() => setStatus(null), 3500);
          }}
        />
        {status ? <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">{status}</p> : null}
      </div>

      <div className="mt-8 border-t border-slate-200 pt-6 dark:border-slate-800">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{total ? `${total} comment${total === 1 ? "" : "s"}` : "No comments yet"}</p>
        {comments.length ? (
          <div className="mt-4 space-y-4">
            {comments.map((comment) => <CommentCard key={comment.id} comment={comment} onReply={() => setReplyTo(comment)} />)}
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">Be the first to add something helpful for another reader.</p>
        )}
      </div>
    </section>
  );
}

export function BlogArticleFeedback({ postId }: { postId: string }) {
  const [choice, setChoice] = useState<"HELPFUL" | "NEEDS_WORK" | null>(null);
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);
  const [saving, setSaving] = useState(false);

  async function send(vote: "HELPFUL" | "NEEDS_WORK") {
    setChoice(vote);
    setSaving(true);
    try {
      await fetch("/api/v1/blog/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, vote, note }),
      });
      setSent(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-10 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Help us improve</p>
      <h2 className="mt-1 text-xl font-semibold text-ink dark:text-white">Was this article useful?</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Your answer helps us write deeper, clearer HouseLink guides for Zimbabwean readers.</p>
      {sent ? (
        <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">Thank you. We will use this to improve the blog.</p>
      ) : (
        <>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} maxLength={600} placeholder="Optional: what should we add or explain better?" className="mt-4 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={saving} onClick={() => void send("HELPFUL")} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60">
              <ThumbsUp className="size-4" />
              Helpful
            </button>
            <button type="button" disabled={saving} onClick={() => void send("NEEDS_WORK")} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
              <ThumbsDown className="size-4" />
              Needs more detail
            </button>
          </div>
          {choice ? <p className="mt-2 text-xs text-slate-500">Sending: {choice === "HELPFUL" ? "helpful" : "needs more detail"}</p> : null}
        </>
      )}
    </section>
  );
}

function CommentForm({ postId, parentId, submitLabel, onSaved, onCancel }: { postId: string; parentId: string | null; submitLabel: string; onSaved: (comment: PublicBlogComment) => void; onCancel?: () => void }) {
  const [draft, setDraft] = useState(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/blog/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, postId, parentId }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || "Comment could not be posted.");
      if (payload.data?.id) onSaved({ ...payload.data, createdAt: String(payload.data.createdAt), replies: payload.data.replies ?? [] });
      setDraft(emptyDraft);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Comment could not be posted.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      <input className="hidden" tabIndex={-1} autoComplete="off" value={draft.company} onChange={(event) => setDraft((current) => ({ ...current, company: event.target.value }))} aria-hidden="true" />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Name
          <input required minLength={2} value={draft.authorName} onChange={(event) => setDraft((current) => ({ ...current, authorName: event.target.value }))} className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal text-ink outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Email optional
          <input type="email" value={draft.authorEmail} onChange={(event) => setDraft((current) => ({ ...current, authorEmail: event.target.value }))} className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal text-ink outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
        </label>
      </div>
      <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
        Your comment
        <textarea required minLength={8} maxLength={1200} rows={4} value={draft.body} onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal leading-6 text-ink outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
      </label>
      {error ? <p className="text-sm font-semibold text-red-600 dark:text-red-300">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={saving} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60">
          <Send className="size-4" />
          {saving ? "Posting..." : submitLabel}
        </button>
        {onCancel ? <button type="button" onClick={onCancel} className="min-h-10 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Cancel reply</button> : null}
      </div>
    </form>
  );
}

function CommentCard({ comment, onReply }: { comment: PublicBlogComment; onReply: () => void }) {
  return (
    <article className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold text-ink dark:text-white">{comment.authorName}</p>
        <span className="text-xs text-slate-400">{formatCommentDate(comment.createdAt)}</span>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-300">{comment.body}</p>
      <button type="button" onClick={onReply} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-600 dark:text-emerald-300">
        <Reply className="size-4" />
        Reply
      </button>
      {comment.replies.length ? (
        <div className="mt-4 space-y-3 border-l border-slate-200 pl-4 dark:border-slate-800">
          {comment.replies.map((reply) => <CommentCard key={reply.id} comment={reply} onReply={onReply} />)}
        </div>
      ) : null}
    </article>
  );
}

function formatCommentDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-ZW", { day: "numeric", month: "short", year: "numeric" }).format(date);
}
