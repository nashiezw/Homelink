"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BookOpen, CheckCircle2, Clock, Download, Award, Target, Calendar, Zap, Users } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/providers/app-provider";
import { apiFetch } from "@/lib/api/client";

type AgentTrainingData = {
  assignedCourses: Array<{
    id: string;
    title: string;
    description: string;
    progress: number;
    status: string;
    modules: Array<{
      id: string;
      title: string;
      lessons: Array<{
        id: string;
        title: string;
        completed: boolean;
        estimatedMinutes: number;
      }>;
    }>;
    certificateEnabled: boolean;
    certificateIssued?: boolean;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    dueDate: string;
    status: string;
    type: string;
  }>;
  resources: Array<{
    id: string;
    title: string;
    category: string;
    downloadUrl: string;
  }>;
  announcements: Array<{
    id: string;
    title: string;
    body: string;
    createdAt: string;
  }>;
  stats: {
    coursesEnrolled: number;
    coursesCompleted: number;
    totalLessons: number;
    completedLessons: number;
    certificates: number;
    hoursLearned: number;
  };
};

export function AgentTrainingDashboard() {
  const { user, showToast } = useApp();
  const [data, setData] = useState<AgentTrainingData | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await apiFetch<AgentTrainingData>("/api/v1/agents/training/dashboard");
    if (result.data) setData(result.data);
    else showToast(result.error?.message ?? "Training dashboard could not be loaded.", "error");
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!data) {
    return (
      <PageShell
        eyebrow="Agent Training"
        title="Loading your training workspace..."
        description="Please wait while we load your courses and progress."
      >
        <div className="h-64 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow="Agent Training"
      title={`Welcome, ${user?.name}`}
      description="Track your training progress, access courses, and achieve certification."
      actions={<Link href={`/dashboard/academy/${data.assignedCourses[0]?.id ?? ""}`}><Button variant="secondary"><BookOpen className="size-4 mr-2" /> Open Course Viewer</Button></Link>}
    >
      {/* Stats Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-100 p-3 dark:bg-emerald-900/30">
              <BookOpen className="size-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{data.stats.coursesEnrolled}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Courses Enrolled</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-100 p-3 dark:bg-blue-900/30">
              <CheckCircle2 className="size-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{data.stats.coursesCompleted}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Completed</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-purple-100 p-3 dark:bg-purple-900/30">
              <Award className="size-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{data.stats.certificates}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Certificates</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-100 p-3 dark:bg-amber-900/30">
              <Clock className="size-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{data.stats.hoursLearned}h</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Learning Hours</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(20rem,0.7fr)]">
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">My Training Courses</h2>
          </div>
          
          {data.assignedCourses.map((course) => (
            <article key={course.id} className="rounded-2xl border-2 border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      course.status === "COMPLETED" 
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" 
                        : course.status === "IN_PROGRESS"
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                        : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                    }`}>
                      {course.status.replace(/_/g, " ")}
                    </span>
                    {course.certificateEnabled && (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 flex items-center gap-1">
                        <Award className="size-3" />
                        {course.certificateIssued ? "Certificate Issued" : "Certificate Available"}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold mb-2">{course.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{course.description}</p>
                  
                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="font-medium">Progress</span>
                      <span className="text-slate-600 dark:text-slate-400">{course.progress}%</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden dark:bg-slate-800">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Course Modules/Lessons */}
              <div className="mt-6">
                <Button
                  variant={selectedCourse === course.id ? "primary" : "secondary"}
                  onClick={() => setSelectedCourse(selectedCourse === course.id ? null : course.id)}
                  className="w-full"
                >
                  {selectedCourse === course.id ? "Hide Details" : "View Course Content"}
                </Button>
              </div>

              {selectedCourse === course.id && (
                <div className="mt-6 space-y-4">
                  {course.modules.map((module) => (
                    <div key={module.id} className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/50">
                      <h4 className="font-bold mb-4 flex items-center gap-2">
                        <BookOpen className="size-5 text-emerald-500" />
                        {module.title}
                      </h4>
                      <div className="space-y-2">
                        {module.lessons.map((lesson) => (
                          <div key={lesson.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                            <div className={`rounded-full p-1 ${
                              lesson.completed 
                                ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" 
                                : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                            }`}>
                              {lesson.completed ? <CheckCircle2 className="size-4" /> : <Clock className="size-4" />}
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold">{lesson.title}</p>
                              <p className="text-xs text-slate-500">{lesson.estimatedMinutes} minutes</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}

          {!data.assignedCourses.length && (
            <div className="rounded-2xl border-2 border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
              <BookOpen className="size-12 mx-auto text-slate-400 mb-4" />
              <p className="text-lg font-semibold text-slate-600 dark:text-slate-400">No training courses assigned</p>
              <p className="text-sm text-slate-500 mt-2 mb-4">Contact your manager to get enrolled in training courses.</p>
              <Link href="/academy" className="inline-flex items-center gap-2 text-emerald-600 font-semibold hover:text-emerald-700">
                <Zap className="size-4" /> Browse Available Courses
              </Link>
            </div>
          )}
        </section>

        <aside className="space-y-4">
          {/* Tasks */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-xl bg-orange-100 p-2 dark:bg-orange-900/30">
                <Target className="size-5 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-lg font-bold">Tasks</h3>
            </div>
            <div className="space-y-2">
              {data.tasks.map((task) => (
                <div key={task.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{task.title}</p>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <Calendar className="size-3" />
                        {new Date(task.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      task.status === "COMPLETED" 
                        ? "bg-emerald-100 text-emerald-800" 
                        : task.status === "IN_PROGRESS"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-amber-100 text-amber-800"
                    }`}>
                      {task.status.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
              ))}
              {!data.tasks.length && (
                <p className="text-sm text-slate-500 text-center py-4">No pending tasks</p>
              )}
            </div>
          </div>

          {/* Resources */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-xl bg-blue-100 p-2 dark:bg-blue-900/30">
                <Download className="size-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-bold">Resources</h3>
            </div>
            <div className="space-y-2">
              {data.resources.map((resource) => (
                <a key={resource.id} href={resource.downloadUrl} className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm hover:border-emerald-300 hover:bg-emerald-50 dark:border-slate-700 dark:hover:border-emerald-700 dark:hover:bg-emerald-900/20 transition-colors">
                  <Download className="mt-0.5 size-4 text-emerald-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{resource.title}</p>
                    <p className="text-xs text-slate-500">{resource.category}</p>
                  </div>
                </a>
              ))}
              {!data.resources.length && (
                <p className="text-sm text-slate-500 text-center py-4">No resources available</p>
              )}
            </div>
          </div>

          {/* Announcements */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-xl bg-purple-100 p-2 dark:bg-purple-900/30">
                <Users className="size-5 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-bold">Announcements</h3>
            </div>
            <div className="space-y-3">
              {data.announcements.map((announcement) => (
                <div key={announcement.id} className="rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 p-4 text-sm dark:from-purple-900/20 dark:to-pink-900/20">
                  <p className="font-semibold">{announcement.title}</p>
                  <p className="mt-1 text-slate-600 dark:text-slate-400 line-clamp-2">{announcement.body}</p>
                </div>
              ))}
              {!data.announcements.length && (
                <p className="text-sm text-slate-500 text-center py-4">No announcements</p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}
