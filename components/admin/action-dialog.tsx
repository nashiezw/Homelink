"use client";

import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export type AdminDialogField = {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "datetime-local" | "textarea" | "select";
  defaultValue?: string | number;
  placeholder?: string;
  required?: boolean;
  min?: number;
  options?: Array<{ label: string; value: string }>;
};

export type AdminDialogValues = Record<string, string>;

export type AdminDialogConfig = {
  title: string;
  message: string;
  tone?: "success" | "warning" | "danger" | "info";
  confirmLabel?: string;
  cancelLabel?: string;
  fields?: AdminDialogField[];
  onConfirm: (values: AdminDialogValues) => void | Promise<void>;
};

type AdminActionDialogProps = {
  config: AdminDialogConfig | null;
  onClose: () => void;
};

export function AdminActionDialog({ config, onClose }: AdminActionDialogProps) {
  const [values, setValues] = useState<AdminDialogValues>({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!config) return;
    setValues(
      Object.fromEntries(
        (config.fields ?? []).map((field) => [field.name, String(field.defaultValue ?? "")]),
      ),
    );
    setError("");
    setSubmitting(false);
  }, [config]);

  if (!config) return null;
  const activeConfig = config;

  const Icon = activeConfig.tone === "danger" || activeConfig.tone === "warning" ? AlertTriangle : activeConfig.tone === "info" ? Info : CheckCircle2;
  const toneClass =
    activeConfig.tone === "danger"
      ? "bg-red-500/15 text-red-200 ring-red-400/30"
      : activeConfig.tone === "warning"
        ? "bg-amber-500/15 text-amber-100 ring-amber-400/30"
        : activeConfig.tone === "info"
          ? "bg-cyan-500/15 text-cyan-100 ring-cyan-400/30"
          : "bg-emerald-500/15 text-emerald-100 ring-emerald-400/30";

  async function submit() {
    const missing = (activeConfig.fields ?? []).find((field) => field.required && !values[field.name]?.trim());
    if (missing) {
      setError(`${missing.label} is required.`);
      return;
    }
    setSubmitting(true);
    try {
      await activeConfig.onConfirm(values);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
          <div className="flex gap-3">
            <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ring-1 ${toneClass}`}>
              <Icon className="size-5" />
            </span>
            <div>
              <h3 className="text-lg font-semibold text-white">{config.title}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-400">{config.message}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:bg-white/10 hover:text-white" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>

        {(config.fields?.length ?? 0) > 0 && (
          <div className="grid gap-3 p-5">
            {config.fields?.map((field) => (
              <label key={field.name} className="grid gap-1 text-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{field.label}</span>
                {field.type === "textarea" ? (
                  <textarea
                    value={values[field.name] ?? ""}
                    onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))}
                    placeholder={field.placeholder}
                    rows={3}
                    className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none transition focus:border-emerald-400/70"
                  />
                ) : field.type === "select" ? (
                  <select
                    value={values[field.name] ?? ""}
                    onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))}
                    className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none transition focus:border-emerald-400/70"
                  >
                    <option value="">Select...</option>
                    {(field.options ?? []).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={values[field.name] ?? ""}
                    onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))}
                    placeholder={field.placeholder}
                    type={field.type ?? "text"}
                    min={field.min}
                    className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none transition focus:border-emerald-400/70"
                  />
                )}
              </label>
            ))}
            {error ? <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">{error}</p> : null}
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2 border-t border-white/10 p-4">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            {config.cancelLabel ?? "Cancel"}
          </Button>
          <Button onClick={() => void submit()} disabled={submitting}>
            {submitting ? "Working..." : (config.confirmLabel ?? "Confirm")}
          </Button>
        </div>
      </div>
    </div>
  );
}
