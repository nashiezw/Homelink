"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bookmark,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  FileText,
  List,
  MessageSquare,
  Play,
  StickyNote,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AcademyProse } from "@/components/academy/academy-prose";
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

export function LessonViewer({
  course,
  initialLessonId,
  onBack,
  onCompleteLesson,
  onToggleBookmark,
  primaryColour = "#008b68",
}: {
  course: Course;
  initialLessonId?: string;
  onBack: () => void;
  onCompleteLesson?: (lessonId: string) => void;
  onToggleBookmark?: (lessonId: string, bookmarked: boolean) => void;
  primaryColour?: string;
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
    <div className="min-h-screen bg-gradient-to-b from-mist via-white to-slate-50 dark:from-ink dark:via-slate-950 dark:to-slate-950">
      {/* Mobile-first sticky header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <Button variant="ghost" className="shrink-0 px-2" onClick={onBack}>
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline ml-2">Course</span>
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-emerald-700 dark:text-emerald-400">{course.title}</p>
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
        <div className="h-1 bg-slate-100 dark:bg-slate-800">
          <div className="h-full transition-all duration-500" style={{ width: `${progressPercent}%`, backgroundColor: primaryColour }} />
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col lg:flex-row">
        {/* Desktop sidebar */}
        <aside className="hidden w-full shrink-0 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 lg:block lg:w-80 xl:w-96">
          <SidebarContent
            course={course}
            currentLessonId={currentLessonId}
            onSelect={(id) => setCurrentLessonId(id)}
            primaryColour={primaryColour}
          />
        </aside>

        {/* Mobile drawer */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button type="button" className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} aria-label="Close menu" />
            <div className="absolute inset-y-0 left-0 w-[min(100%,20rem)] bg-white shadow-hero dark:bg-slate-950">
              <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">
                <p className="font-bold">Course content</p>
                <Button variant="ghost" className="px-2" onClick={() => setSidebarOpen(false)}><X className="size-4" /></Button>
              </div>
              <SidebarContent
                course={course}
                currentLessonId={currentLessonId}
                onSelect={(id) => { setCurrentLessonId(id); setSidebarOpen(false); }}
                primaryColour={primaryColour}
              />
            </div>
          </div>
        )}

        {/* Main reading column */}
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
          <div className="mx-auto max-w-3xl">
            {/* Hero meta */}
            <div className="mb-8 flex flex-wrap items-center gap-3 text-sm text-slate-500">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
                <Clock className="size-3.5" /> {currentLesson.estimatedMinutes} min read
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
                Lesson {currentIndex + 1} of {allLessons.length}
              </span>
              {currentLesson.completed && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                  <CheckCircle2 className="size-3.5" /> Completed
                </span>
              )}
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl lg:text-4xl dark:text-white">{currentLesson.title}</h2>
            <p className="mt-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">{currentLesson.moduleName}</p>

            {currentLesson.summary && (
              <div className="mt-6 rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50 to-teal-50/50 p-5 shadow-soft dark:border-emerald-900/40 dark:from-emerald-950/40 dark:to-teal-950/20">
                <p className="text-base leading-relaxed text-emerald-900 dark:text-emerald-100">{currentLesson.summary.split(/\n/)[0]}</p>
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

            {/* Downloads */}
            {(currentLesson.pdfUrl || currentLesson.lessonDownloads?.length || currentLesson.lessonDocuments?.length) && (
              <section className="mt-10">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold"><Download className="size-5 text-emerald-600" /> Downloads & resources</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {currentLesson.pdfUrl && (
                    <DownloadCard href={currentLesson.pdfUrl} title="Lesson PDF" subtitle="Official manual reference" />
                  )}
                  {currentLesson.lessonDocuments?.map((doc) => (
                    <DownloadCard key={doc.id} href={doc.downloadUrl} title={doc.title} subtitle={doc.fileType} />
                  ))}
                  {currentLesson.lessonDownloads?.map((d) => (
                    <DownloadCard key={d.id} href={d.url} title={d.title} subtitle={d.type} />
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
                  <Button className="w-full sm:w-auto" style={{ backgroundColor: primaryColour }} onClick={() => setCurrentLessonId(nextLesson.id)}>
                    <span className="truncate">Next: {nextLesson.title}</span>
                    <ArrowRight className="size-4 ml-2 shrink-0" />
                  </Button>
                ) : (
                  <Button onClick={onBack} style={{ backgroundColor: primaryColour }}>
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
  primaryColour,
}: {
  course: Course;
  currentLessonId: string;
  onSelect: (id: string) => void;
  primaryColour: string;
}) {
  return (
    <div className="max-h-[calc(100vh-4rem)] overflow-y-auto p-4">
      {course.modules.map((module) => (
        <div key={module.id} className="mb-6">
          <p className="mb-2 px-2 text-xs font-bold uppercase tracking-wider text-slate-500">{module.title}</p>
          <div className="space-y-1">
            {module.lessons.map((lesson) => (
              <button
                key={lesson.id}
                type="button"
                onClick={() => onSelect(lesson.id)}
                className={cn(
                  "flex w-full items-start gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-all",
                  lesson.id === currentLessonId
                    ? "bg-emerald-50 font-semibold text-emerald-900 shadow-sm dark:bg-emerald-900/30 dark:text-emerald-100"
                    : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-900",
                )}
                style={lesson.id === currentLessonId ? { borderLeft: `3px solid ${primaryColour}` } : undefined}
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

function DownloadCard({ href, title, subtitle }: { href: string; title: string; subtitle: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-emerald-300 hover:shadow-soft dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-700"
    >
      <div className="rounded-xl bg-emerald-50 p-3 group-hover:bg-emerald-100 dark:bg-emerald-900/30">
        <FileText className="size-5 text-emerald-600" />
      </div>
      <div className="min-w-0">
        <p className="font-semibold truncate">{title}</p>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
      <ChevronDown className="ml-auto size-4 -rotate-90 text-slate-400" />
    </a>
  );
}
