"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, GraduationCap, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/providers/app-provider";
import { apiFetch } from "@/lib/api/client";

type ExamQuestion = {
  id: string;
  prompt: string;
  answers: Array<{ id: string; label: string; value: string }>;
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
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const detail = await apiFetch<{ title: string; questions: ExamQuestion[] }>(`/api/v1/academy/exams/${examId}`);
    if (detail.data) {
      setTitle(detail.data.title);
      setQuestions(detail.data.questions);
    }
    if (detail.error) showToast(detail.error.message, "error");
  }, [examId, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit() {
    setBusy(true);
    const response = await apiFetch<{ score: number; passed: boolean }>(`/api/v1/academy/exams/${examId}/attempt`, {
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
            ? "You passed the Certified HouseLink Agent final examination."
            : `Pass mark is ${passingScore}%. Review the course material and try again when ready.`}
        </p>
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
        <Button disabled={busy || questions.length === 0} onClick={() => void submit()}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : "Submit Final Exam"}
        </Button>
      </div>
    </div>
  );
}
