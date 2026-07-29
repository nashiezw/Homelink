import type { ReactNode } from "react";

type PageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  actions?: ReactNode;
  highlights?: Array<{ label: string; value: string }>;
  compactHero?: boolean;
  heroAside?: ReactNode;
};

export function PageShell({
  eyebrow,
  title,
  description,
  children,
  actions,
  highlights,
  compactHero = false,
  heroAside,
}: PageShellProps) {
  return (
    <main className="academy-shell bg-mist dark:bg-slate-950">
      <section className="relative isolate overflow-hidden border-b border-emerald-900/20 bg-ink text-white">
        <div className="absolute inset-0 academy-dark-hero" />
        <div className="absolute inset-0 hidden bg-[linear-gradient(90deg,rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:42px_42px] lg:block" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-mist/15 to-transparent" />
        <div className={`relative z-10 mx-auto flex max-w-7xl flex-col justify-between gap-8 px-4 sm:px-6 lg:flex-row lg:items-center lg:gap-10 lg:px-8 ${compactHero ? "py-10 lg:py-14" : "py-12 lg:py-16"}`}>
          <div className="w-full min-w-0 sm:max-w-3xl lg:max-w-none">
            <p className="inline-flex rounded-full border border-emerald-300/25 bg-emerald-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-normal text-emerald-100 shadow-sm lg:bg-emerald-400/10 lg:backdrop-blur">
              {eyebrow}
            </p>
            <h1 className={`mt-4 max-w-4xl font-semibold leading-tight tracking-normal text-white ${compactHero ? "text-[2.1rem] sm:text-5xl lg:text-[3.35rem]" : "text-[2.25rem] sm:text-5xl lg:text-6xl"}`}>
              {title}
            </h1>
            {description && <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">{description}</p>}
            {actions && (
              <div className="mt-6 flex w-full max-w-full flex-col gap-2 sm:w-auto sm:max-w-none sm:flex-row sm:flex-wrap [&_a]:inline-flex [&_a]:min-h-11 [&_a]:w-full [&_a]:max-w-full [&_a]:items-center [&_a]:justify-center [&_a]:rounded-lg [&_a]:px-4 [&_a]:py-2.5 [&_a]:text-center [&_a]:shadow-none sm:[&_a]:w-auto sm:[&_a]:px-5 sm:[&_a]:shadow-lg [&_button]:w-full [&_button]:rounded-lg sm:[&_button]:w-auto">
                {actions}
              </div>
            )}
            {highlights && highlights.length > 0 && (
              <div className="mt-6 grid max-w-2xl grid-cols-3 gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10">
                {highlights.map((item) => (
                  <div key={item.label} className="min-w-0 bg-ink/80 px-3 py-2.5 lg:bg-ink/55 lg:backdrop-blur">
                    <p className="truncate text-sm font-semibold text-white sm:text-lg">{item.value}</p>
                    <p className="mt-1 text-[11px] leading-4 text-slate-300 sm:text-xs">{item.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          {heroAside && (
            <div className="hidden w-full max-w-lg shrink-0 lg:block">
              {heroAside}
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
