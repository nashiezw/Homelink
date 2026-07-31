export default function LibraryProductLoading() {
  return (
    <main className="min-h-screen bg-mist px-4 py-8 sm:px-6 lg:px-8 dark:bg-slate-950">
      <div className="mx-auto grid max-w-[88rem] animate-pulse gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-5">
          <div className="h-4 w-40 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="grid gap-6 md:grid-cols-[16rem_minmax(0,1fr)]">
            <div className="aspect-[3/4] rounded-2xl bg-slate-200 dark:bg-slate-800" />
            <div className="space-y-4">
              <div className="h-8 w-4/5 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-20 rounded-xl bg-slate-200 dark:bg-slate-800" />
              <div className="h-12 w-48 rounded-full bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
          <div className="h-48 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="h-72 rounded-2xl bg-slate-200 dark:bg-slate-800" />
      </div>
      <p className="sr-only">Loading product…</p>
    </main>
  );
}
