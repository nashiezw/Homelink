"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, GraduationCap, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/providers/app-provider";
import { apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/utils";

type ExamQuestion = {
  id: string;
  prompt: string;
  answers: Array<{ id: string; label: string; value: string }>;
};

type ExamResult = {
  score: number;
  passed: boolean;
  reviewTopics?: string[];
};

export function ExamPanel({
  examId,
  passingScore,
  onBack,
}: {
  examId: string;
  passingScore: number;
  onBack: () => void;
}) {
  const { showToast } = useApp();
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ExamResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [securityEvents, setSecurityEvents] = useState<string[]>([]);

  const recordSecurityEvent = useCallback((event: string) => {
    setSecurityEvents((current) => [...current, `${event}:${new Date().toISOString()}`].slice(-20));
  }, []);

  const load = useCallback(async () => {
    const detail = await apiFetch<{ title: string; questions: ExamQuestion[] }>(`/api/v1/academy/exams/${examId}`);
    if (detail.data) {
      setTitle(detail.data.title);
      setQuestions(detail.data.questions);
      setStartedAt(Date.now());
      setSecurityEvents([]);
    }
    if (detail.error) showToast(detail.error.message, "error");
  }, [examId, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (result) return;
    const onVisibility = () => {
      if (document.hidden) recordSecurityEvent("tab_hidden");
    };
    const onCopy = () => recordSecurityEvent("copy");
    const onPaste = () => recordSecurityEvent("paste");
    const onContextMenu = () => recordSecurityEvent("context_menu");
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onContextMenu);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onContextMenu);
    };
  }, [recordSecurityEvent, result]);

  async function submit() {
    setBusy(true);
    const response = await apiFetch<{ score: number; passed: boolean }>(`/api/v1/academy/exams/${examId}/attempt`, {
      method: "POST",
      body: JSON.stringify({
        answers,
        elapsedSeconds: startedAt ? Math.max(0, Math.round((Date.now() - startedAt) / 1000)) : null,
        securityEvents,
      }),
    });
    setBusy(false);
    if (response.error) {
      showToast(response.error.message, "error");
      return;
    }
    if (response.data) {
      setResult(response.data);
      showToast(response.data.passed ? "Congratulations! You passed the final exam." : "Exam submitted.");
    }
  }

  if (result) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-950">
        {result.passed ? <CheckCircle2 className="size-16 mx-auto text-emerald-500" /> : <XCircle className="size-16 mx-auto text-amber-500" />}
        <p className="mt-4 text-2xl font-bold">Final Exam Score: {result.score}%</p>
        <p className="text-slate-600 mt-2">
          {result.passed
            ? "You passed the HouseLink Agent Foundations final examination."
            : `Pass mark is ${passingScore}%. Review the course material and try again when ready.`}
        </p>
        {!result.passed && !!result.reviewTopics?.length && (
          <div className="mx-auto mt-5 max-w-md rounded-xl border border-amber-200 bg-amber-50 p-4 text-left dark:border-amber-900/50 dark:bg-amber-950/20">
            <p className="text-sm font-bold text-amber-950 dark:text-amber-100">Review these areas before your next attempt</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {result.reviewTopics.map((topic) => (
                <span key={topic} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-amber-800 shadow-sm dark:bg-slate-900 dark:text-amber-200">
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}
        <Button className="mt-6" onClick={onBack}>Back to course</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center gap-3">
        <GraduationCap className="size-8 text-emerald-600" />
        <div>
          <p className="font-bold text-emerald-900 dark:text-emerald-100">{title || "Final Examination"}</p>
          <p className="text-sm text-emerald-800/80 dark:text-emerald-200/80">{questions.length} questions · {passingScore}% required to pass</p>
        </div>
      </div>
      <div className={cn("rounded-xl border p-4 text-sm", securityEvents.length ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100" : "border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300")}>
        <div className="flex items-start gap-3">
          {securityEvents.length ? <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-500" /> : <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-500" />}
          <div>
            <p className="font-semibold text-slate-950 dark:text-white">Exam integrity mode</p>
            <p className="mt-1 leading-6">Tab changes, copy, paste, and context-menu activity are recorded with the attempt for trainer review.</p>
            {securityEvents.length > 0 && <p className="mt-1 text-xs font-semibold">{securityEvents.length} integrity event{securityEvents.length === 1 ? "" : "s"} recorded.</p>}
          </div>
        </div>
      </div>
      {questions.map((question, index) => (
        <fieldset key={question.id} className="rounded-xl border border-slate-200 p-5 dark:border-slate-700">
          <legend className="px-1 font-semibold">Question {index + 1}: {question.prompt}</legend>
          <div className="mt-3 grid gap-2">
            {question.answers.map((answer) => (
              <label key={answer.id} className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
                <input
                  type="radio"
                  name={question.id}
                  checked={answers[question.id] === answer.value}
                  onChange={() => setAnswers({ ...answers, [question.id]: answer.value })}
                />
                <span>{answer.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <div className="flex gap-3">
        <Button variant="secondary" onClick={onBack}>Cancel</Button>
        <Button disabled={busy || questions.length === 0 || Object.keys(answers).length !== questions.length} onClick={() => void submit()}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : "Submit Final Exam"}
        </Button>
      </div>
    </div>
  );
}
