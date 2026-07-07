"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bookmark,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  List,
  MessageSquare,
  Play,
  Sparkles,
  StickyNote,
  X,
} from "lucide-react";
import { HomeLinkBrand } from "@/components/brand/homelink-logo";
import { Button } from "@/components/ui/button";
import { AcademyProse } from "@/components/academy/academy-prose";
import { isFullTrainingManualUrl } from "@/lib/academy/academy-constants";
import { toAcademyFileDownloadUrl } from "@/lib/academy/academy-files";
import { cn } from "@/lib/utils";

type Lesson = {
  id: string;
  title: string;
  summary?: string;
  richText: string;
  transcript?: string | null;
  lessonNotes?: string | null;
  objectives?: string[];
  discussionPrompt?: string | null;
  videoUrl?: string | null;
  embeddedVideoUrl?: string | null;
  pdfUrl?: string | null;
  audioUrl?: string | null;
  estimatedMinutes: number;
  completionRequirement: string;
  lessonVideos?: Array<{ id: string; title: string; url: string; provider: string }>;
  lessonDownloads?: Array<{ id: string; title: string; url: string; type: string }>;
  lessonDocuments?: Array<{ id: string; title: string; fileType: string; downloadUrl: string }>;
  lessonResources?: Array<{ id: string; title: string; body: string; type: string }>;
  completed?: boolean;
  bookmarked?: boolean;
};

type Module = { id: string; title: string; lessons: Lesson[] };
type Course = { id: string; title: string; modules: Module[] };

type CourseTheme = {
  label: string;
  accent: string;
  gradient: string;
  sidebar: string;
  chip: string;
};

export function LessonViewer({
  course,
  initialLessonId,
  onBack,
  onCompleteLesson,
  onToggleBookmark,
  primaryColour = "#008b68",
  courseTheme,
}: {
  course: Course;
  initialLessonId?: string;
  onBack: () => void;
  onCompleteLesson?: (lessonId: string) => void;
  onToggleBookmark?: (lessonId: string, bookmarked: boolean) => void;
  primaryColour?: string;
  courseTheme?: CourseTheme;
}) {
  const [currentLessonId, setCurrentLessonId] = useState(initialLessonId || course.modules[0]?.lessons[0]?.id || "");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const allLessons = useMemo(
    () => course.modules.flatMap((module) => module.lessons.map((lesson) => ({ ...lesson, moduleName: module.title, moduleId: module.id }))),
    [course.modules],
  );
  const currentIndex = allLessons.findIndex((l) => l.id === currentLessonId);
  const currentLesson = allLessons[currentIndex];
  const previousLesson = allLessons[currentIndex - 1];
  const nextLesson = allLessons[currentIndex + 1];
  const progressPercent = allLessons.length ? Math.round(((currentIndex + 1) / allLessons.length) * 100) : 0;
  const accent = courseTheme?.accent ?? primaryColour;
  const stageLabel = courseTheme?.label ?? extractStageLabel(currentLesson.moduleName);
  const heroGradient = courseTheme?.gradient ?? "from-emerald-600 via-emerald-700 to-teal-800";
  const sidebarGradient = courseTheme?.sidebar ?? "from-emerald-50 via-white to-teal-50/60";
  const lessonNotes = useMemo(() => collectLessonNotes(currentLesson), [currentLesson]);
  const fieldForms = useMemo(() => collectFieldForms(currentLesson), [currentLesson]);

  if (!currentLesson) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <BookOpen className="size-12 text-slate-300" />
        <p className="mt-4 text-lg font-semibold">Lesson not found</p>
        <Button className="mt-6" onClick={onBack}>Back to course</Button>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen bg-gradient-to-br", sidebarGradient, "dark:from-ink dark:via-slate-950 dark:to-slate-950")}>
      <header className="sticky top-0 z-40 border-b border-white/20 bg-white/85 backdrop-blur-xl shadow-sm dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <Button variant="ghost" className="shrink-0 px-2" onClick={onBack}>
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline ml-2">Course</span>
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium" style={{ color: accent }}>{course.title}</p>
            <h1 className="truncate text-sm font-bold sm:text-base">{currentLesson.title}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {onToggleBookmark && (
              <Button variant="ghost" className="px-2" onClick={() => onToggleBookmark(currentLesson.id, !currentLesson.bookmarked)} aria-label="Bookmark">
                <Bookmark className={cn("size-4", currentLesson.bookmarked && "fill-amber-400 text-amber-500")} />
              </Button>
            )}
            <Button variant="ghost" className="px-2 lg:hidden" onClick={() => setSidebarOpen(true)}>
              <List className="size-4" />
            </Button>
          </div>
        </div>
          <div className="h-1.5 bg-white/50 dark:bg-slate-800">
          <div className="h-full transition-all duration-500 shadow-sm" style={{ width: `${progressPercent}%`, backgroundColor: accent }} />
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col lg:flex-row">
        {/* Desktop sidebar */}
        <aside className={cn("hidden w-full shrink-0 border-r border-white/40 bg-gradient-to-b lg:block lg:w-80 xl:w-96", sidebarGradient)}>
          <SidebarContent
            course={course}
            currentLessonId={currentLessonId}
            onSelect={(id) => setCurrentLessonId(id)}
            accent={accent}
            chipClass={courseTheme?.chip}
          />
        </aside>

        {/* Mobile drawer */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button type="button" className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} aria-label="Close menu" />
            <div className={cn("absolute inset-y-0 left-0 w-[min(100%,20rem)] shadow-hero bg-gradient-to-b", sidebarGradient)}>
              <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">
                <p className="font-bold">Course content</p>
                <Button variant="ghost" className="px-2" onClick={() => setSidebarOpen(false)}><X className="size-4" /></Button>
              </div>
              <SidebarContent
                course={course}
                currentLessonId={currentLessonId}
                onSelect={(id) => { setCurrentLessonId(id); setSidebarOpen(false); }}
                accent={accent}
                chipClass={courseTheme?.chip}
              />
            </div>
          </div>
        )}

        {/* Main reading column */}
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
          <div className="mx-auto max-w-3xl">
            {/* Branded lesson hero */}
            <div className={cn("relative overflow-hidden rounded-3xl bg-gradient-to-br p-6 text-white shadow-hero sm:p-8", heroGradient)}>
              <div className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full bg-white/10 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-10 left-1/3 size-32 rounded-full bg-teal-300/20 blur-2xl" />
              <div className="relative z-10">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="rounded-2xl bg-white/95 p-2 shadow-lg ring-1 ring-white/40">
                    <HomeLinkBrand variant="icon" iconOnly />
                  </div>
                  {stageLabel && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
                      <Sparkles className="size-3.5" /> {stageLabel}
                    </span>
                  )}
                </div>
                <h2 className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">{currentLesson.title}</h2>
                <p className="mt-2 text-sm font-medium text-emerald-100/90">{currentLesson.moduleName.replace(/^\[[^\]]+\]\s*/, "")}</p>
                <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-emerald-50/90">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 backdrop-blur-sm">
                    <Clock className="size-3.5" /> {currentLesson.estimatedMinutes} min
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 backdrop-blur-sm">
                    Lesson {currentIndex + 1} of {allLessons.length}
                  </span>
                  {currentLesson.completed && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 font-medium">
                      <CheckCircle2 className="size-3.5" /> Completed
                    </span>
                  )}
                </div>
              </div>
            </div>

            {currentLesson.summary && (
              <div className="mt-6 rounded-2xl border bg-white/80 p-5 shadow-soft backdrop-blur-sm" style={{ borderColor: `${accent}44` }}>
                <p className="text-base leading-relaxed text-slate-700">{currentLesson.summary.split(/\n/)[0]}</p>
              </div>
            )}

            {/* Video */}
            {(currentLesson.embeddedVideoUrl || currentLesson.videoUrl) && (
              <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-black shadow-card-hover dark:border-slate-800">
                {currentLesson.embeddedVideoUrl ? (
                  <div className="aspect-video">
                    <iframe src={currentLesson.embeddedVideoUrl} className="h-full w-full" allowFullScreen title={currentLesson.title} />
                  </div>
                ) : (
                  <video src={currentLesson.videoUrl!} controls className="aspect-video w-full" />
                )}
              </div>
            )}

            {!currentLesson.embeddedVideoUrl && !currentLesson.videoUrl && (
              <div className="mt-8 flex aspect-video items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50">
                <div className="text-center px-6">
                  <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/40">
                    <Play className="size-8 text-emerald-600" />
                  </div>
                  <p className="mt-4 font-semibold text-slate-700 dark:text-slate-200">Video lesson coming soon</p>
                  <p className="mt-1 text-sm text-slate-500">Read the material below while the video is being produced.</p>
                </div>
              </div>
            )}

            {/* Objectives */}
            {!!currentLesson.objectives?.length && (
              <section className="mt-10">
                <h3 className="text-lg font-bold text-ink dark:text-white">Learning objectives</h3>
                <ul className="mt-4 space-y-3">
                  {currentLesson.objectives.map((item) => (
                    <li key={item} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm leading-relaxed dark:border-slate-800 dark:bg-slate-900/50">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Reading material — premium typography */}
            <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-soft sm:p-8 lg:p-10 dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-6 flex items-center gap-2 border-b border-slate-100 pb-4 dark:border-slate-800">
                <BookOpen className="size-5 text-emerald-600" />
                <h3 className="text-lg font-bold">Reading material</h3>
              </div>
              <AcademyProse
                richText={currentLesson.richText}
                transcript={currentLesson.transcript}
                summary={currentLesson.summary}
                title={currentLesson.title}
              />
            </section>

            {/* Lesson notes */}
            {currentLesson.lessonNotes && (
              <section className="mt-8 rounded-2xl border border-amber-200/60 bg-amber-50/50 p-6 dark:border-amber-900/40 dark:bg-amber-950/20">
                <div className="flex items-center gap-2 mb-3">
                  <StickyNote className="size-5 text-amber-600" />
                  <h3 className="font-bold text-amber-900 dark:text-amber-100">Instructor notes</h3>
                </div>
                <p className="text-sm leading-relaxed text-amber-900/90 dark:text-amber-100/90 whitespace-pre-wrap">{currentLesson.lessonNotes}</p>
              </section>
            )}

            {/* Discussion prompt */}
            {currentLesson.discussionPrompt && (
              <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="size-5 text-emerald-600" />
                  <h3 className="font-bold">Reflect & discuss</h3>
                </div>
                <p className="text-base leading-relaxed text-slate-600 dark:text-slate-300">{currentLesson.discussionPrompt}</p>
              </section>
            )}

            {/* Lesson notes PDF */}
            {!!lessonNotes.length && (
              <section className="mt-10">
                <div className="mb-4">
                  <h3 className="flex items-center gap-2 text-lg font-bold">
                    <FileText className="size-5 text-sky-600" /> Lesson Notes
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">Branded PDF study guide for this lesson — overview, takeaways, and field application.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {lessonNotes.map((resource) => (
                    <DownloadCard key={resource.id} href={resource.url} title={resource.title} subtitle={resource.subtitle} />
                  ))}
                </div>
              </section>
            )}

            {/* Field forms */}
            {!!fieldForms.length && (
              <section className="mt-10">
                <div className="mb-4">
                  <h3 className="flex items-center gap-2 text-lg font-bold">
                    <Download className="size-5 text-emerald-600" /> Field Forms & Tools
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">Print-ready HomeLink forms and checklists — also available under the Toolkit tab.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {fieldForms.map((resource) => (
                    <DownloadCard key={resource.id} href={resource.url} title={resource.title} subtitle={resource.subtitle} />
                  ))}
                </div>
              </section>
            )}

            {/* Footer nav */}
            <div className="mt-12 flex flex-col gap-3 border-t border-slate-200 pt-8 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
              {previousLesson ? (
                <Button variant="secondary" className="w-full sm:w-auto justify-start" onClick={() => setCurrentLessonId(previousLesson.id)}>
                  <ArrowLeft className="size-4 mr-2 shrink-0" />
                  <span className="truncate">Previous: {previousLesson.title}</span>
                </Button>
              ) : <div />}
              <div className="flex flex-col gap-2 sm:flex-row">
                {onCompleteLesson && !currentLesson.completed && (
                  <Button variant="secondary" className="w-full sm:w-auto" onClick={() => onCompleteLesson(currentLesson.id)}>
                    <CheckCircle2 className="size-4 mr-2" /> Mark complete
                  </Button>
                )}
                {nextLesson ? (
                  <Button className="w-full sm:w-auto" style={{ backgroundColor: accent }} onClick={() => setCurrentLessonId(nextLesson.id)}>
                    <span className="truncate">Next: {nextLesson.title}</span>
                    <ArrowRight className="size-4 ml-2 shrink-0" />
                  </Button>
                ) : (
                  <Button className="w-full sm:w-auto" onClick={onBack} style={{ backgroundColor: accent }}>
                    <CheckCircle2 className="size-4 mr-2" /> Finish course
                  </Button>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  course,
  currentLessonId,
  onSelect,
  accent,
  chipClass,
}: {
  course: Course;
  currentLessonId: string;
  onSelect: (id: string) => void;
  accent: string;
  chipClass?: string;
}) {
  return (
    <div className="max-h-[calc(100vh-4rem)] overflow-y-auto p-4">
      <div className={cn("mb-4 rounded-2xl px-4 py-3 text-sm font-semibold leading-snug shadow-sm break-words", chipClass ?? "bg-emerald-100 text-emerald-900")}>
        {course.title}
      </div>
      {course.modules.map((module) => (
        <div key={module.id} className="mb-6">
          <p className="mb-2 px-2 text-xs font-bold uppercase tracking-wider" style={{ color: accent }}>{module.title}</p>
          <div className="space-y-1">
            {module.lessons.map((lesson) => (
              <button
                key={lesson.id}
                type="button"
                onClick={() => onSelect(lesson.id)}
                className={cn(
                  "flex w-full items-start gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-all",
                  lesson.id === currentLessonId
                    ? "bg-white font-semibold text-slate-900 shadow-md ring-1 ring-black/5"
                    : "bg-white/60 text-slate-700 hover:bg-white hover:shadow-sm",
                )}
                style={lesson.id === currentLessonId ? { borderLeft: `4px solid ${accent}` } : undefined}
              >
                {lesson.completed ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                ) : (
                  <BookOpen className="mt-0.5 size-4 shrink-0 opacity-50" />
                )}
                <span className="line-clamp-2 leading-snug">{lesson.title}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function extractStageLabel(moduleName: string) {
  const match = moduleName.match(/^\[([^\]]+)\]/);
  return match?.[1] ?? null;
}

function collectLessonNotes(lesson: Lesson) {
  if (!lesson.pdfUrl || isFullTrainingManualUrl(lesson.pdfUrl)) return [];
  const url = toAcademyFileDownloadUrl(lesson.pdfUrl.startsWith("/api/") ? lesson.pdfUrl : lesson.pdfUrl);
  return [{
    id: `pdf-${lesson.id}`,
    url,
    viewUrl: `${url}${url.includes("?") ? "&" : "?"}inline=1`,
    title: `${lesson.title} — Lesson Notes`,
    subtitle: "HomeLink branded study guide · Print or save",
  }];
}

function collectFieldForms(lesson: Lesson) {
  const seen = new Set<string>();
  const items: Array<{ id: string; url: string; viewUrl: string; title: string; subtitle: string }> = [];

  for (const download of lesson.lessonDownloads ?? []) {
    if (!download.url || isFullTrainingManualUrl(download.url) || seen.has(download.url)) continue;
    seen.add(download.url);
    const url = toAcademyFileDownloadUrl(download.url);
    items.push({
      id: download.id,
      url,
      viewUrl: `${url}${url.includes("?") ? "&" : "?"}inline=1`,
      title: download.title,
      subtitle: "HomeLink field form · Print-ready PDF",
    });
  }

  return items;
}

function DownloadCard({ href, title, subtitle }: { href: string; title: string; subtitle: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative overflow-hidden rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-white to-emerald-50/40 p-4 transition-all hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-card-hover dark:border-emerald-900/40 dark:from-slate-950 dark:to-emerald-950/20 dark:hover:border-emerald-700"
    >
      <div className="flex items-center gap-4">
        <div className="rounded-xl bg-white p-2 shadow-sm ring-1 ring-emerald-100 group-hover:ring-emerald-200 dark:bg-slate-900 dark:ring-emerald-900/60">
          <HomeLinkBrand variant="icon" iconOnly className="scale-75" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold truncate text-ink dark:text-white">{title}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
        <div className="rounded-full bg-emerald-100 p-2 text-emerald-700 transition group-hover:bg-emerald-600 group-hover:text-white dark:bg-emerald-900/40 dark:text-emerald-300">
          <FileText className="size-4" />
        </div>
      </div>
    </a>
  );
}
