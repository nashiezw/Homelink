"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Clock, FileText, Play, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/page-shell";

type Lesson = {
  id: string;
  title: string;
  summary?: string;
  richText: string;
  videoUrl?: string | null;
  embeddedVideoUrl?: string | null;
  pdfUrl?: string | null;
  audioUrl?: string | null;
  estimatedMinutes: number;
  completionRequirement: string;
  lessonVideos?: Array<{ id: string; title: string; url: string; provider: string }>;
  lessonDownloads?: Array<{ id: string; title: string; url: string; type: string }>;
};

type Module = {
  id: string;
  title: string;
  lessons: Lesson[];
};

type Course = {
  id: string;
  title: string;
  modules: Module[];
};

interface LessonViewerProps {
  course: Course;
  initialLessonId?: string;
  onBack: () => void;
  onCompleteLesson?: (lessonId: string) => void;
}

export function LessonViewer({ course, initialLessonId, onBack, onCompleteLesson }: LessonViewerProps) {
  const [currentLessonId, setCurrentLessonId] = useState(initialLessonId || course.modules[0]?.lessons[0]?.id || "");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const allLessons = course.modules.flatMap((module) =>
    module.lessons.map((lesson) => ({ ...lesson, moduleName: module.title }))
  );
  const currentIndex = allLessons.findIndex((l) => l.id === currentLessonId);
  const currentLesson = allLessons[currentIndex];
  const previousLesson = allLessons[currentIndex - 1];
  const nextLesson = allLessons[currentIndex + 1];

  if (!currentLesson) {
    return (
      <PageShell eyebrow="Academy" title="Lesson Not Found" description="The requested lesson could not be found.">
        <Button onClick={onBack}><ArrowLeft className="size-4 mr-2" /> Back to Course</Button>
      </PageShell>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft className="size-4 mr-2" /> Back
            </Button>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">{course.title}</p>
              <h1 className="text-lg font-bold">{currentLesson.title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <X className="size-4" /> : <BookOpen className="size-4" />}
            </Button>
            {onCompleteLesson && (
              <Button onClick={() => onCompleteLesson(currentLesson.id)}>
                <CheckCircle2 className="size-4 mr-2" /> Mark Complete
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row">
        {/* Sidebar - Lesson Navigation */}
        {sidebarOpen && (
          <aside className="w-full flex-shrink-0 border-b border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 lg:w-80 lg:border-b-0 lg:border-r">
            <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Course Content</h2>
            <div className="space-y-4">
              {course.modules.map((module) => (
                <div key={module.id}>
                  <h3 className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-400">{module.title}</h3>
                  <div className="space-y-1">
                    {module.lessons.map((lesson) => (
                      <button
                        key={lesson.id}
                        onClick={() => setCurrentLessonId(lesson.id)}
                        className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                          lesson.id === currentLessonId
                            ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-300"
                            : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <BookOpen className="size-4 flex-shrink-0" />
                          <span className="truncate">{lesson.title}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-4xl p-6">
            {/* Video Section */}
            {(currentLesson.videoUrl || currentLesson.embeddedVideoUrl || currentLesson.lessonVideos?.length) && (
              <div className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-black dark:border-slate-800">
                {currentLesson.embeddedVideoUrl ? (
                  <div className="aspect-video">
                    <iframe
                      src={currentLesson.embeddedVideoUrl}
                      className="h-full w-full"
                      allowFullScreen
                      title={currentLesson.title}
                    />
                  </div>
                ) : currentLesson.videoUrl ? (
                  <video
                    src={currentLesson.videoUrl}
                    controls
                    className="h-full w-full"
                  >
                    Your browser does not support the video tag.
                  </video>
                ) : currentLesson.lessonVideos && currentLesson.lessonVideos.length > 0 ? (
                  <div className="aspect-video flex items-center justify-center bg-slate-900">
                    <div className="text-center">
                      <Play className="mx-auto mb-4 size-16 text-emerald-500" />
                      <p className="text-white">Select a video from the resources below</p>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* Lesson Content */}
            <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-6 flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1"><Clock className="size-4" /> {currentLesson.estimatedMinutes} minutes</span>
                <span className="flex items-center gap-1"><BookOpen className="size-4" /> {currentLesson.completionRequirement}</span>
              </div>

              {currentLesson.summary && (
                <div className="mb-6 rounded-xl bg-emerald-50 p-4 dark:bg-emerald-900/20">
                  <p className="text-sm text-emerald-900 dark:text-emerald-300">{currentLesson.summary}</p>
                </div>
              )}

              <div className="prose prose-slate max-w-none dark:prose-invert">
                {currentLesson.richText ? (
                  <div dangerouslySetInnerHTML={{ __html: currentLesson.richText }} />
                ) : (
                  <p className="text-slate-600 dark:text-slate-400">This lesson has no written content yet. Review the video or downloads above.</p>
                )}
              </div>
            </div>

            {/* Downloads Section */}
            {(currentLesson.pdfUrl || currentLesson.lessonDownloads?.length) && (
              <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
                <h3 className="mb-4 text-lg font-bold flex items-center gap-2"><Download className="size-5" /> Downloads</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {currentLesson.pdfUrl && (
                    <a
                      href={currentLesson.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 hover:border-emerald-400 hover:bg-emerald-50 dark:border-slate-800 dark:hover:border-emerald-700 dark:hover:bg-emerald-900/20 transition-colors"
                    >
                      <FileText className="size-5 text-red-500" />
                      <div>
                        <p className="font-semibold">Lesson PDF</p>
                        <p className="text-xs text-slate-500">Download lesson materials</p>
                      </div>
                    </a>
                  )}
                  {currentLesson.lessonDownloads?.map((download) => (
                    <a
                      key={download.id}
                      href={download.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 hover:border-emerald-400 hover:bg-emerald-50 dark:border-slate-800 dark:hover:border-emerald-700 dark:hover:bg-emerald-900/20 transition-colors"
                    >
                      <FileText className="size-5 text-blue-500" />
                      <div>
                        <p className="font-semibold">{download.title}</p>
                        <p className="text-xs text-slate-500">{download.type}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between gap-4">
              {previousLesson ? (
                <Button variant="secondary" onClick={() => setCurrentLessonId(previousLesson.id)}>
                  <ArrowLeft className="size-4 mr-2" /> Previous: {previousLesson.title}
                </Button>
              ) : (
                <div />
              )}
              {nextLesson ? (
                <Button onClick={() => setCurrentLessonId(nextLesson.id)}>
                  Next: {nextLesson.title} <ArrowRight className="size-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={onBack} variant="primary">
                  <CheckCircle2 className="size-4 mr-2" /> Complete Course
                </Button>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
