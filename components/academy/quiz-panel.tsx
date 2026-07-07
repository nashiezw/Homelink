"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/providers/app-provider";
import { apiFetch } from "@/lib/api/client";

type QuizQuestion = {
  id: string;
  prompt: string;
  answers: Array<{ id: string; label: string; value: string }>;
};

export function QuizPanel({
  quizId,
  passingPercentage,
  onBack,
}: {
  quizId: string;
  passingPercentage: number;
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
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-950">
        {result.passed ? <CheckCircle2 className="size-16 mx-auto text-emerald-500" /> : <XCircle className="size-16 mx-auto text-amber-500" />}
        <p className="mt-4 text-2xl font-bold">Score: {result.score}%</p>
        <p className="text-slate-600 mt-2">{result.passed ? "You passed this quiz." : `Pass mark is ${passingPercentage}%. You can retake the quiz.`}</p>
        <Button className="mt-6" onClick={onBack}>Back to course</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
                {answer.label}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      {!questions.length && <p className="text-slate-500">Loading quiz questions...</p>}
      <div className="flex gap-2">
        <Button variant="secondary" onClick={onBack}>Cancel</Button>
        <Button disabled={busy || questions.some((q) => !answers[q.id])} onClick={() => void submit()}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : "Submit Quiz"}
        </Button>
      </div>
    </div>
  );
}
