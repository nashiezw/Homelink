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
    <main className="academy-shell bg-mist dark:bg-slate-950">
      <section className="relative isolate overflow-hidden border-b border-emerald-900/20 bg-ink text-white">
        <div className="absolute inset-0 academy-dark-hero" />
        <div className="absolute inset-0 hidden bg-[linear-gradient(90deg,rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:42px_42px] lg:block" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-mist/15 to-transparent" />
        <div className="relative z-10 mx-auto flex max-w-7xl flex-col justify-between gap-8 px-4 py-12 sm:px-6 lg:flex-row lg:items-end lg:px-8 lg:py-14">
          <div className="w-full min-w-0 sm:max-w-3xl lg:max-w-none">
            <p className="inline-flex rounded-full border border-emerald-300/25 bg-emerald-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-normal text-emerald-100 shadow-sm lg:bg-emerald-400/10 lg:backdrop-blur">
              {eyebrow}
            </p>
            <h1 className="mt-4 max-w-4xl text-3xl font-semibold leading-tight tracking-normal text-white sm:text-4xl lg:text-5xl">
              {title}
            </h1>
            {description && <p className="mt-4 max-w-2xl leading-7 text-slate-300">{description}</p>}
            {highlights && highlights.length > 0 && (
              <div className="mt-7 grid max-w-2xl grid-cols-2 gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 sm:grid-cols-3">
                {highlights.map((item) => (
                  <div key={item.label} className="bg-ink/80 px-4 py-3 lg:bg-ink/55 lg:backdrop-blur">
                    <p className="text-lg font-semibold text-white">{item.value}</p>
                    <p className="mt-1 text-xs text-slate-300">{item.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          {actions && (
            <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:max-w-none sm:shrink-0 [&_a]:inline-flex [&_a]:min-h-10 [&_a]:w-auto [&_a]:items-center [&_a]:justify-center [&_a]:rounded-full [&_a]:px-4 [&_a]:py-2 [&_a]:shadow-none sm:[&_a]:min-h-11 sm:[&_a]:rounded-lg sm:[&_a]:px-5 sm:[&_a]:shadow-lg [&_button]:w-auto [&_button]:rounded-full sm:[&_button]:w-auto sm:[&_button]:rounded-lg">
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
