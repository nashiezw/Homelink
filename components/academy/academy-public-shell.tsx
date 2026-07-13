import type { ReactNode } from "react";

type AcademyPublicShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  actions?: ReactNode;
  highlights?: Array<{ label: string; value: string }>;
};

export function AcademyPublicShell({
  eyebrow,
  title,
  description,
  children,
  actions,
  highlights,
}: AcademyPublicShellProps) {
  return (
    <main className="academy-public-page academy-shell min-w-0 max-w-full bg-mist dark:bg-slate-950">
      <section className="academy-public-hero relative overflow-x-clip border-b border-emerald-900/20 bg-ink text-white">
        <div className="absolute inset-0 academy-dark-hero" />
        <div className="absolute inset-0 hidden bg-[linear-gradient(90deg,rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:42px_42px] md:block" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-mist/15 to-transparent" />
        <div className="relative z-10 mx-auto flex w-full min-w-0 max-w-7xl flex-col justify-between gap-8 px-4 py-12 sm:px-6 md:flex-row md:items-end md:px-8 md:py-14">
          <div className="w-full min-w-0 md:max-w-none">
            <p className="max-w-full break-words rounded-full border border-emerald-300/25 bg-emerald-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-normal text-emerald-100 shadow-sm md:bg-emerald-400/10 md:backdrop-blur">
              {eyebrow}
            </p>
            <h1 className="mt-4 max-w-full break-words text-3xl font-semibold leading-tight tracking-normal text-white sm:text-4xl md:text-5xl">
              {title}
            </h1>
            {description && <p className="mt-4 max-w-full break-words leading-7 text-slate-300">{description}</p>}
            {highlights && highlights.length > 0 && (
              <div className="mt-7 grid w-full min-w-0 max-w-2xl grid-cols-1 gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 min-[420px]:grid-cols-2 md:grid-cols-3">
                {highlights.map((item) => (
                  <div key={item.label} className="academy-public-hero-highlight min-w-0 bg-ink/80 px-4 py-3 md:bg-ink/55 md:backdrop-blur">
                    <p className="break-words text-lg font-semibold text-white">{item.value}</p>
                    <p className="mt-1 break-words text-xs text-slate-300">{item.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          {actions && (
            <div className="flex w-full min-w-0 max-w-full flex-col gap-2 md:w-auto md:max-w-none md:shrink-0 [&_a]:block [&_a]:w-full md:[&_a]:inline-block md:[&_a]:w-auto [&_button]:w-full md:[&_button]:w-auto">
              {actions}
            </div>
          )}
        </div>
      </section>
      <section className="academy-public-content mx-auto w-full min-w-0 max-w-7xl px-4 py-12 sm:px-6 md:px-8">
        {children}
      </section>
    </main>
  );
}
