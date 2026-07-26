"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ChevronLeft, ClipboardList, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/providers/app-provider";
import { apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/utils";

type QuizQuestion = {
  id: string;
  prompt: string;
  answers: Array<{ id: string; label: string; value: string }>;
};

export function QuizPanel({
  quizId,
  title = "Checkpoint",
  description,
  questionCount,
  passingPercentage,
  timeLimitMinutes,
  onBack,
}: {
  quizId: string;
  title?: string;
  description?: string;
  questionCount?: number;
  passingPercentage: number;
  timeLimitMinutes?: number | null;
  onBack: () => void;
}) {
  const { showToast } = useApp();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const detail = await apiFetch<{ questions: QuizQuestion[] }>(`/api/v1/academy/quizzes/${quizId}`);
    if (detail.data?.questions) setQuestions(detail.data.questions);
  }, [quizId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit() {
    setBusy(true);
    const response = await apiFetch<{ score: number; passed: boolean }>(`/api/v1/academy/quizzes/${quizId}/attempt`, {
      method: "POST",
      body: JSON.stringify({ answers }),
    });
    setBusy(false);
    if (response.error) {
      showToast(response.error.message, "error");
      return;
    }
    if (response.data) {
      setResult(response.data);
      showToast(response.data.passed ? "Quiz passed!" : "Quiz submitted.");
    }
  }

  if (result) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-8">
        {result.passed ? <CheckCircle2 className="mx-auto size-16 text-emerald-500" /> : <XCircle className="mx-auto size-16 text-amber-500" />}
        <p className="mt-4 text-2xl font-bold text-slate-950 dark:text-white">Score: {result.score}%</p>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{result.passed ? "Passed. This checkpoint is complete." : `Pass mark is ${passingPercentage}%. Review the lesson and retake when ready.`}</p>
        <Button className="mt-6 w-full sm:w-auto" onClick={onBack}>Back to course</Button>
      </div>
    );
  }

  const resolvedQuestionCount = questionCount ?? questions.length;
  const answeredCount = questions.filter((question) => answers[question.id]).length;
  const canSubmit = questions.length > 0 && answeredCount === questions.length;

  return (
    <div className="mx-auto max-w-3xl pb-24 sm:pb-0">
      <div className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm dark:border-emerald-900/50 dark:bg-slate-950 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <ClipboardList className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-extrabold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Field-readiness checkpoint</p>
            <h2 className="mt-1 text-lg font-bold leading-tight text-slate-950 dark:text-white">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {description || "Answer as if you are advising a real client. Choose the safest professional decision from the facts given."}
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <QuizMeta label="Questions" value={String(resolvedQuestionCount || "-")} />
          <QuizMeta label="Answered" value={`${answeredCount}/${questions.length || resolvedQuestionCount || 0}`} />
          <QuizMeta label="Pass mark" value={`${passingPercentage}%`} />
        </div>
        {timeLimitMinutes ? (
          <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            Suggested time: {timeLimitMinutes} minutes
          </p>
        ) : null}
      </div>

      <div className="mt-5 space-y-4">
        {questions.map((question, index) => (
          <fieldset key={question.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-5">
            <legend className="float-left w-full p-0">
              <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                Question {index + 1} of {questions.length}
              </span>
              <span className="mt-3 block text-lg font-bold leading-7 text-slate-950 dark:text-white">{question.prompt}</span>
            </legend>
            <div className="clear-both mt-4 grid gap-2.5">
              {question.answers.map((answer) => {
                const selected = answers[question.id] === answer.value;
                return (
                  <label
                    key={answer.id}
                    className={cn(
                      "flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 text-sm leading-6 transition sm:px-4",
                      selected
                        ? "border-emerald-400 bg-emerald-50 text-emerald-950 shadow-sm dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-100"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/70 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:bg-emerald-950/20",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border",
                        selected ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-950",
                      )}
                      aria-hidden="true"
                    >
                      {selected ? <CheckCircle2 className="size-3.5" /> : null}
                    </span>
                    <input
                      className="sr-only"
                      type="radio"
                      name={question.id}
                      checked={selected}
                      onChange={() => setAnswers({ ...answers, [question.id]: answer.value })}
                    />
                    <span>{answer.label}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
        {!questions.length && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            Loading quiz questions...
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 sm:static sm:mt-6 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-0">
        <div className="mx-auto flex max-w-3xl flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button className="w-full sm:w-auto" variant="secondary" onClick={onBack}>
            <ChevronLeft className="size-4 mr-2" /> Back
          </Button>
          <Button className="w-full sm:w-auto" disabled={busy || !canSubmit} onClick={() => void submit()}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : "Submit checkpoint"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function QuizMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-center dark:border-slate-800 dark:bg-slate-900/60">
      <p className="text-base font-black leading-none text-slate-950 dark:text-white">{value}</p>
      <p className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}
