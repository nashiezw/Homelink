"use client";

import { cn } from "@/lib/utils";

export const academyPrimaryTabs = [
  "Overview",
  "Courses",
  "Learners",
  "Library",
  "Programmes",
  "Community",
  "Settings",
] as const;

export type AcademyPrimaryTab = (typeof academyPrimaryTabs)[number];

export const academySubTabs: Record<AcademyPrimaryTab, Array<{ id: string; label: string }>> = {
  Overview: [
    { id: "Dashboard", label: "Dashboard" },
    { id: "Analytics", label: "Analytics" },
  ],
  Courses: [{ id: "Courses", label: "Course Builder" }],
  Learners: [
    { id: "Public Learners", label: "Enrolments" },
    { id: "Certificates", label: "Certificates" },
  ],
  Library: [
    { id: "Training Resources", label: "Documents" },
    { id: "Video Library", label: "Videos" },
  ],
  Programmes: [
    { id: "Learning Paths", label: "Learning Paths" },
    { id: "Badges", label: "Badges" },
    { id: "Leaderboard", label: "Leaderboard" },
  ],
  Community: [
    { id: "Announcements", label: "Announcements" },
    { id: "Discussion Board", label: "Discussions" },
  ],
  Settings: [{ id: "Settings", label: "Academy Settings" }],
};

/** Maps legacy flat tabs to primary + sub tab. */
export function resolveAcademyNav(requested?: string | null): { primary: AcademyPrimaryTab; sub: string } {
  const legacyMap: Record<string, { primary: AcademyPrimaryTab; sub: string }> = {
    Dashboard: { primary: "Overview", sub: "Dashboard" },
    Analytics: { primary: "Overview", sub: "Analytics" },
    Courses: { primary: "Courses", sub: "Courses" },
    Lessons: { primary: "Courses", sub: "Courses" },
    "Lesson Content": { primary: "Courses", sub: "Courses" },
    Quizzes: { primary: "Courses", sub: "Courses" },
    Assignments: { primary: "Courses", sub: "Courses" },
    "Final Exams": { primary: "Courses", sub: "Courses" },
    "Public Learners": { primary: "Learners", sub: "Public Learners" },
    Certificates: { primary: "Learners", sub: "Certificates" },
    "Training Resources": { primary: "Library", sub: "Training Resources" },
    "Video Library": { primary: "Library", sub: "Video Library" },
    "Learning Paths": { primary: "Programmes", sub: "Learning Paths" },
    Badges: { primary: "Programmes", sub: "Badges" },
    Leaderboard: { primary: "Programmes", sub: "Leaderboard" },
    Announcements: { primary: "Community", sub: "Announcements" },
    "Discussion Board": { primary: "Community", sub: "Discussion Board" },
    Settings: { primary: "Settings", sub: "Settings" },
  };
  if (requested && legacyMap[requested]) return legacyMap[requested];
  return { primary: "Overview", sub: "Dashboard" };
}

export function AcademyHubNav({
  primary,
  sub,
  onPrimaryChange,
  onSubChange,
}: {
  primary: AcademyPrimaryTab;
  sub: string;
  onPrimaryChange: (tab: AcademyPrimaryTab) => void;
  onSubChange: (tab: string) => void;
}) {
  const subs = academySubTabs[primary];

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {academyPrimaryTabs.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => {
              onPrimaryChange(item);
              onSubChange(academySubTabs[item][0].id);
            }}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all",
              primary === item
                ? "bg-emerald-500 text-white shadow-glow"
                : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white",
            )}
          >
            {item}
          </button>
        ))}
      </div>
      {subs.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-white/10">
          {subs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSubChange(item.id)}
              className={cn(
                "shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                sub === item.id
                  ? "border-emerald-400 text-emerald-300"
                  : "border-transparent text-slate-400 hover:text-slate-200",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
