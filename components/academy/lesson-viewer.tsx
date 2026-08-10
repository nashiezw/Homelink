"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bookmark,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Download,
  FileText,
  Lightbulb,
  List,
  Lock,
  MessageSquare,
  Play,
  Sparkles,
  StickyNote,
  Target,
  X,
} from "lucide-react";
import { HouseLinkBrand } from "@/components/brand/houselink-logo";
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
  locked?: boolean;
  gate?: {
    locked: boolean;
    title: string;
    requirements: Array<{ id: string; title: string; type: "lesson" | "quiz" | "assignment"; complete: boolean }>;
  };
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
  toolkitLocked = false,
}: {
  course: Course;
  initialLessonId?: string;
  onBack: () => void;
  onCompleteLesson?: (lessonId: string) => void;
  onToggleBookmark?: (lessonId: string, bookmarked: boolean) => void;
  primaryColour?: string;
  courseTheme?: CourseTheme;
  toolkitLocked?: boolean;
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
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/95 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <Button variant="ghost" className="h-10 shrink-0 rounded-full border border-slate-200 bg-white px-3 text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200" onClick={onBack}>
            <ArrowLeft className="size-4" />
            <span className="ml-2 hidden text-sm font-semibold sm:inline">Course</span>
          </Button>
          <div className="hidden h-9 w-px bg-slate-200 dark:bg-slate-800 sm:block" />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
              <p className="truncate text-[11px] font-extrabold uppercase tracking-wide" style={{ color: accent }}>{course.title}</p>
            </div>
            <h1 className="mt-1 truncate text-[15px] font-bold leading-5 text-slate-950 sm:text-base dark:text-white">{currentLesson.title}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 sm:inline-flex">
              Lesson {currentIndex + 1}/{allLessons.length}
            </span>
            {onToggleBookmark && (
              <Button variant="ghost" className="h-10 rounded-full px-2.5" onClick={() => onToggleBookmark(currentLesson.id, !currentLesson.bookmarked)} aria-label="Bookmark">
                <Bookmark className={cn("size-4", currentLesson.bookmarked && "fill-amber-400 text-amber-500")} />
              </Button>
            )}
            <Button variant="ghost" className="h-10 rounded-full px-2.5 lg:hidden" onClick={() => setSidebarOpen(true)}>
              <List className="size-4" />
            </Button>
          </div>
        </div>
        <div className="h-1 bg-slate-100 dark:bg-slate-800">
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
            <div className={cn("absolute inset-y-0 left-0 w-[min(100%,22rem)] bg-gradient-to-b shadow-hero", sidebarGradient)}>
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5 dark:border-slate-800">
                <div>
                  <p className="text-sm font-bold text-slate-950 dark:text-white">Course content</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{allLessons.length} lessons</p>
                </div>
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
            <div className={cn("relative overflow-hidden rounded-xl bg-gradient-to-br p-6 text-white shadow-hero sm:p-8", heroGradient)}>
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:34px_34px]" />
              <div className="relative z-10">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="rounded-2xl bg-white/95 p-2 shadow-lg ring-1 ring-white/40">
                    <HouseLinkBrand variant="icon" iconOnly />
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
            <section className="academy-panel mt-10 rounded-xl p-6 sm:p-8 lg:p-10">
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
              <PremiumLessonDepth lesson={currentLesson} accent={accent} />
            </section>

            {/* Lesson notes */}
            {currentLesson.lessonNotes && (
              <section className="mt-8 rounded-xl border border-amber-200/60 bg-amber-50/50 p-6 dark:border-amber-900/40 dark:bg-amber-950/20">
                <div className="flex items-center gap-2 mb-3">
                  <StickyNote className="size-5 text-amber-600" />
                  <h3 className="font-bold text-amber-900 dark:text-amber-100">Instructor notes</h3>
                </div>
                <p className="text-sm leading-relaxed text-amber-900/90 dark:text-amber-100/90 whitespace-pre-wrap">{currentLesson.lessonNotes}</p>
              </section>
            )}

            {/* Discussion prompt */}
            {currentLesson.discussionPrompt && (
              <section className="academy-panel mt-8 rounded-xl p-6">
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
                  <p className="mt-1 text-sm text-slate-500">Print-ready HouseLink forms and checklists — also available under the Toolkit tab.</p>
                </div>
                {toolkitLocked ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900/40 dark:bg-amber-950/20">
                    <div className="flex items-start gap-3">
                      <div className="rounded-full bg-amber-100 p-2 dark:bg-amber-900/40">
                        <Download className="size-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-amber-900 dark:text-amber-100">Toolkit access required</p>
                        <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
                          These field forms and tools are part of the premium toolkit. Purchase the toolkit from the Toolkit tab to access all {fieldForms.length} downloadable resources.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {fieldForms.map((resource) => (
                      <DownloadCard key={resource.id} href={resource.url} title={resource.title} subtitle={resource.subtitle} />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Footer nav */}
            <div className="mt-12 flex flex-col gap-3 border-t border-slate-200 pt-8 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
              {previousLesson ? (
                <Button variant="secondary" className="w-full justify-start sm:w-auto" onClick={() => setCurrentLessonId(previousLesson.id)}>
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
                  nextLesson.locked ? (
                    <Button className="w-full sm:w-auto" variant="secondary" disabled>
                      <Lock className="size-4 mr-2" /> Complete checkpoint to continue
                    </Button>
                  ) : (
                    <Button className="w-full sm:w-auto" style={{ backgroundColor: accent }} onClick={() => setCurrentLessonId(nextLesson.id)}>
                      <span className="truncate">Next: {nextLesson.title}</span>
                      <ArrowRight className="size-4 ml-2 shrink-0" />
                    </Button>
                  )
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

function PremiumLessonDepth({ lesson, accent }: { lesson: Lesson; accent: string }) {
  const depth = buildLessonDepth(lesson);

  return (
    <div className="mt-8 space-y-5">
      <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50/90 via-white to-sky-50/70 p-5 dark:border-emerald-900/50 dark:from-emerald-950/30 dark:via-slate-950 dark:to-sky-950/20 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-white p-2 shadow-sm ring-1 ring-emerald-100 dark:bg-slate-900 dark:ring-emerald-900/60">
            <Target className="size-5" style={{ color: accent }} />
          </div>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Professional outcome</p>
            <p className="mt-2 text-base leading-7 text-slate-700 dark:text-slate-200">{depth.outcome}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <LessonDepthCard icon={ClipboardCheck} title="Field Practice Standard" items={depth.standard} accent={accent} />
        <LessonDepthCard icon={Lightbulb} title="Common mistakes to avoid" items={depth.mistakes} accent={accent} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-5" style={{ color: accent }} />
          <h4 className="text-base font-bold text-slate-950 dark:text-white">Zimbabwe field scenario</h4>
        </div>
        <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{depth.scenario}</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/50 sm:p-6">
        <div className="flex items-center gap-2">
          <StickyNote className="size-5 text-amber-600" />
          <h4 className="text-base font-bold text-slate-950 dark:text-white">Practice before you move on</h4>
        </div>
        <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{depth.practice}</p>
      </div>
    </div>
  );
}

function LessonDepthCard({
  icon: Icon,
  title,
  items,
  accent,
}: {
  icon: typeof BookOpen;
  title: string;
  items: string[];
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
      <div className="flex items-center gap-2">
        <Icon className="size-5" style={{ color: accent }} />
        <h4 className="text-base font-bold text-slate-950 dark:text-white">{title}</h4>
      </div>
      <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-600" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function buildLessonDepth(lesson: Lesson) {
  const editableDepth = editableLessonDepth(lesson);
  const title = lesson.title.toLowerCase();

  if (/journey|professional agent|goal|standard/.test(title)) {
    return withEditableDepth({
      outcome:
        "You should be able to explain what separates a trusted property professional from an informal middleman, set a measurable 90-day activity plan, and keep records that a broker, landlord, or client can audit.",
      standard: [
        "Use a weekly activity plan covering prospecting, viewings, follow-ups, listing checks, and client updates.",
        "Keep written records of enquiries, viewing feedback, landlord instructions, price changes, and safety concerns.",
        "Escalate legal, safety, pricing, and client dispute issues through the correct HouseLink channel instead of guessing.",
        "Protect client confidentiality and never share documents, phone numbers, keys, or private circumstances casually.",
      ],
      mistakes: [
        "Treating the certificate as a badge only, instead of building repeatable field habits.",
        "Promising outcomes before verifying ownership, availability, pricing, and property condition.",
        "Working from memory instead of a pipeline tracker, viewing notes, and documented client instructions.",
      ],
      scenario:
        "A landlord in Harare asks you to list quickly because another agent already has buyers. A professional response is to confirm mandate details, collect verified property facts, explain realistic pricing, record the landlord's instructions, and only publish when the listing can withstand client questions.",
      practice:
        "Create a one-page 90-day agent plan with weekly prospecting targets, listing quality targets, response-time rules, and the evidence you will keep for every client interaction. Use it as your personal operating standard.",
    }, editableDepth);
  }

  if (/listing|photo|description|pricing|market/.test(title)) {
    return withEditableDepth({
      outcome:
        "You should be able to turn a property into a listing that is accurate, searchable, visually credible, and useful enough for serious renters or buyers to make a next-step decision.",
      standard: [
        "Verify price, location, availability, ownership or authority to market, utilities, access rules, and defects before publishing.",
        "Write descriptions with property facts first: rooms, condition, amenities, access, neighbourhood, costs, and restrictions.",
        "Use photos that show the real condition of key spaces instead of hiding weak areas with vague angles.",
        "Update or remove stale listings quickly so clients do not lose trust in HouseLink inventory.",
      ],
      mistakes: [
        "Using generic words such as nice, spacious, or secure without evidence.",
        "Leaving out costs that change affordability, including levies, rates, deposits, arrears, or service charges.",
        "Publishing before checking whether the property is still available.",
      ],
      scenario:
        "A Borrowdale listing has strong demand, but the borehole is seasonal and the cottage is occupied. A strong agent discloses both facts early, adjusts the viewing script, and positions the property for clients who can accept those trade-offs.",
      practice:
        "Rewrite one weak listing into a client-ready version. Include verified facts, a clear price note, five photo requirements, and three questions you would answer before booking a viewing.",
    }, editableDepth);
  }

  if (/client|lead|enquiry|viewing|negotiation|communication/.test(title)) {
    return withEditableDepth({
      outcome:
        "You should be able to qualify clients respectfully, manage expectations, run safer viewings, and keep momentum without pressuring people into poor decisions.",
      standard: [
        "Respond with clarity: confirm budget, preferred areas, move-in timing, must-haves, and decision makers.",
        "Prepare clients before viewings with location, costs, documents needed, safety rules, and viewing expectations.",
        "Summarise every important call or viewing in writing so next steps are clear.",
        "Use negotiation notes that separate client preferences, landlord terms, and non-negotiable legal or safety issues.",
      ],
      mistakes: [
        "Sending too many random options instead of qualifying the need.",
        "Letting WhatsApp conversations become untracked promises.",
        "Ignoring red flags because the client seems ready to pay.",
      ],
      scenario:
        "A renter wants a same-day viewing and says they can pay immediately. A top agent still confirms identity, budget, documents, viewing logistics, and landlord availability before creating urgency around payment.",
      practice:
        "Write a five-message WhatsApp sequence for a new enquiry: greeting, qualification, recommended options, viewing confirmation, and post-viewing follow-up.",
    }, editableDepth);
  }

  if (/legal|compliance|ethic|document|mandate|fraud|safety|risk/.test(title)) {
    return withEditableDepth({
      outcome:
        "You should be able to identify documentation risk, protect clients from unsafe transactions, and know when to pause a deal until the right evidence is available.",
      standard: [
        "Check mandate authority, ID details, property access rights, payment instructions, and suspicious urgency.",
        "Never advise beyond your competence on legal matters; escalate to the right professional when needed.",
        "Keep copies or references for material instructions, offer terms, deposits, defects, and dispute notes.",
        "Stop and escalate when ownership, payment destination, identity, or client safety cannot be verified.",
      ],
      mistakes: [
        "Treating verbal permission as enough for high-value decisions.",
        "Allowing payment pressure before identity and authority are clear.",
        "Deleting or scattering records across private chats.",
      ],
      scenario:
        "A supposed owner asks for deposit payment into a third-party account before viewing. A competent agent pauses the transaction, verifies authority, flags the risk, and protects the client from rushed payment.",
      practice:
        "Build a red-flag checklist for one transaction type you handle often. Include the trigger, evidence needed, escalation route, and client wording you would use.",
    }, editableDepth);
  }

  return withEditableDepth({
    outcome:
      "You should be able to apply this lesson in a real client conversation, document the evidence, and explain your decision using HouseLink's professional standard.",
    standard: [
      "Translate the lesson into a repeatable field checklist before using it with clients.",
      "Capture evidence: notes, photos, confirmations, client preferences, risks, and next steps.",
      "Communicate in plain language so landlords, buyers, tenants, and colleagues can act quickly.",
      "Review your work after each transaction and improve the next client interaction.",
    ],
    mistakes: [
      "Memorising the idea but failing to use it in the field.",
      "Skipping records because the conversation feels simple.",
      "Letting speed reduce accuracy, safety, or client trust.",
    ],
    scenario:
      "A client asks for immediate advice while key facts are still missing. A professional agent slows the decision down, confirms what is known, identifies what must be checked, and gives the client a clear next step.",
    practice:
      "Write a short field note for this lesson: what you would check, what you would say to the client, what proof you would keep, and what would make you escalate.",
  }, editableDepth);
}

type LessonDepth = {
  outcome: string;
  standard: string[];
  mistakes: string[];
  scenario: string;
  practice: string;
};

const lessonDepthResourceTitles = {
  outcome: "Professional outcome",
  standard: "Field Practice Standard",
  mistakes: "Common mistakes to avoid",
  scenario: "Zimbabwe field scenario",
  practice: "Practice before you move on",
} as const;
const legacyLessonDepthResourceTitles = {
  standard: "HouseLink field standard",
} as const;

function editableLessonDepth(lesson: Lesson): Partial<LessonDepth> {
  const resources = new Map(
    (lesson.lessonResources ?? [])
      .filter((resource) => resource.type === "LESSON_DEPTH")
      .map((resource) => [resource.title, resource.body.trim()]),
  );
  return {
    outcome: resources.get(lessonDepthResourceTitles.outcome) || undefined,
    standard: splitDepthList(resources.get(lessonDepthResourceTitles.standard) ?? resources.get(legacyLessonDepthResourceTitles.standard)),
    mistakes: splitDepthList(resources.get(lessonDepthResourceTitles.mistakes)),
    scenario: resources.get(lessonDepthResourceTitles.scenario) || undefined,
    practice: resources.get(lessonDepthResourceTitles.practice) || undefined,
  };
}

function withEditableDepth(fallback: LessonDepth, editable: Partial<LessonDepth>): LessonDepth {
  return {
    outcome: editable.outcome || fallback.outcome,
    standard: editable.standard?.length ? editable.standard : fallback.standard,
    mistakes: editable.mistakes?.length ? editable.mistakes : fallback.mistakes,
    scenario: editable.scenario || fallback.scenario,
    practice: editable.practice || fallback.practice,
  };
}

function splitDepthList(value?: string) {
  if (!value) return undefined;
  return value.split(/\r?\n/).map((item) => item.replace(/^[-*]\s*/, "").trim()).filter(Boolean);
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
  const lessonCount = course.modules.reduce((sum, module) => sum + module.lessons.length, 0);
  const completedCount = course.modules.reduce((sum, module) => sum + module.lessons.filter((lesson) => lesson.completed).length, 0);

  return (
    <div className="max-h-[calc(100vh-4rem)] overflow-y-auto px-3 py-4 sm:px-4">
      <div className="mb-5 rounded-2xl border border-white/70 bg-white/75 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/70">
        <div className={cn("mb-3 inline-flex max-w-full rounded-full px-3 py-1 text-xs font-bold leading-snug", chipClass ?? "bg-emerald-100 text-emerald-900")}>
          <span className="truncate">{course.title}</span>
        </div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Progress</p>
            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{completedCount} of {lessonCount} lessons</p>
          </div>
          <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-bold text-white dark:bg-white dark:text-slate-950">
            {lessonCount ? Math.round((completedCount / lessonCount) * 100) : 0}%
          </span>
        </div>
      </div>
      {course.modules.map((module) => (
        <div key={module.id} className="mb-7">
          <p className="mb-2.5 px-1 text-[11px] font-extrabold uppercase leading-4 tracking-wide" style={{ color: accent }}>{module.title}</p>
          <div className="space-y-2">
            {module.lessons.map((lesson) => (
              <button
                key={lesson.id}
                type="button"
                onClick={(event) => {
                  event.currentTarget.blur();
                  onSelect(lesson.id);
                }}
                className={cn(
                  "group relative flex w-full items-start gap-3 rounded-2xl border px-3.5 py-3 text-left text-sm outline-none transition-all focus-visible:ring-2 focus-visible:ring-offset-2",
                  lesson.id === currentLessonId
                    ? "border-white bg-white font-semibold text-slate-950 shadow-sm ring-1 ring-emerald-900/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    : "border-white/70 bg-white/55 text-slate-700 hover:border-white hover:bg-white hover:shadow-sm dark:border-slate-800/70 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-slate-900",
                )}
                style={lesson.id === currentLessonId ? { boxShadow: `inset 3px 0 0 ${accent}, 0 10px 24px rgba(15, 23, 42, 0.08)` } : undefined}
              >
                {lesson.completed ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                ) : (
                  <BookOpen className={cn("mt-0.5 size-4 shrink-0", lesson.id === currentLessonId ? "text-slate-700 dark:text-slate-200" : "text-slate-400 group-hover:text-slate-600")} />
                )}
                <span className="line-clamp-2 min-w-0 leading-5">{lesson.title}</span>
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
    subtitle: "HouseLink branded study guide · Print or save",
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
      subtitle: "HouseLink field form · Print-ready PDF",
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
      className="academy-card group relative overflow-hidden rounded-xl border-emerald-200/70 p-4 dark:border-emerald-900/40 dark:hover:border-emerald-700"
    >
      <div className="flex items-center gap-4">
        <div className="rounded-xl bg-white p-2 shadow-sm ring-1 ring-emerald-100 group-hover:ring-emerald-200 dark:bg-slate-900 dark:ring-emerald-900/60">
          <HouseLinkBrand variant="icon" iconOnly className="scale-75" />
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
