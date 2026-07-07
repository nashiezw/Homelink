import type { ReactNode } from "react";

type PageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  actions?: ReactNode;
  highlights?: Array<{ label: string; value: string }>;
};

export function PageShell({
  eyebrow,
  title,
  description,
  children,
  actions,
  highlights,
}: PageShellProps) {
  return (
    <main className="bg-mist dark:bg-slate-950">
      <section className="relative overflow-hidden border-b border-emerald-900/20 bg-ink text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_18%,rgba(16,185,129,0.26),transparent_27rem),radial-gradient(circle_at_88%_0%,rgba(14,165,233,0.18),transparent_30rem),linear-gradient(135deg,rgba(21,94,117,0.38),transparent_48%)]" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-mist/10 to-transparent" />
        <div className="relative mx-auto flex max-w-7xl flex-col justify-between gap-8 px-4 py-12 sm:px-6 lg:flex-row lg:items-end lg:px-8 lg:py-14">
          <div className="w-full min-w-0 sm:max-w-3xl lg:max-w-none">
            <p className="inline-flex rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-normal text-emerald-100 shadow-sm backdrop-blur">
              {eyebrow}
            </p>
            <h1 className="mt-4 max-w-4xl text-3xl font-semibold leading-tight tracking-normal text-white sm:text-4xl lg:text-5xl">
              {title}
            </h1>
            <p className="mt-4 max-w-2xl leading-7 text-slate-300">{description}</p>
            {highlights && highlights.length > 0 && (
              <div className="mt-7 grid max-w-2xl grid-cols-2 gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 sm:grid-cols-3">
                {highlights.map((item) => (
                  <div key={item.label} className="bg-ink/45 px-4 py-3 backdrop-blur">
                    <p className="text-lg font-semibold text-white">{item.value}</p>
                    <p className="mt-1 text-xs text-slate-300">{item.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          {actions && (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:max-w-none sm:shrink-0 [&_a]:block [&_a]:w-full sm:[&_a]:inline-block sm:[&_a]:w-auto [&_button]:w-full sm:[&_button]:w-auto">
              {actions}
            </div>
          )}
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {children}
      </section>
    </main>
  );
}
