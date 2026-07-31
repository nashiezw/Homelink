export default function LibraryLoading() {
  return (
    <main className="min-h-screen bg-[#fafafa] px-4 py-8 sm:px-6 lg:px-8 dark:bg-slate-950">
      <div className="mx-auto max-w-[90rem] animate-pulse space-y-6">
        <div className="h-48 rounded-3xl bg-slate-200/80 dark:bg-slate-800/80 sm:h-64" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="aspect-[3/4] rounded-xl bg-slate-200 dark:bg-slate-800" />
              <div className="mt-4 h-3 w-1/3 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="mt-3 h-4 w-4/5 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="mt-2 h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="mt-5 h-11 rounded-full bg-slate-200 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      </div>
      <p className="sr-only">Loading Library…</p>
    </main>
  );
}
