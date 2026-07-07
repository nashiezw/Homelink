import { readFile } from "fs/promises";
import path from "path";
import { ACADEMY_PROGRAMME_COURSES, getProgrammeCourse, PROGRAMME_COURSE_IDS, type AcademyProgrammeCourse } from "@/lib/academy/academy-programme";
import { isFullTrainingManualUrl } from "@/lib/academy/academy-constants";
import { toAcademyFileDownloadUrl } from "@/lib/academy/academy-files";

export type ToolkitItem = {
  id: string;
  title: string;
  description: string;
  category: string;
  fileUrl: string;
  fileName: string;
};

export type ToolkitGroup = {
  category: string;
  description: string;
  items: ToolkitItem[];
};

type ManifestRow = {
  title: string;
  description: string;
  category: string;
  fileName: string;
  fileUrl: string;
  sortOrder?: number;
};

const CATEGORY_BLURBS: Record<string, string> = {
  "Property Forms": "Print-ready client, listing and viewing forms with HomeLink branding.",
  "Agent Templates": "Daily planners, registers and operational templates for field use.",
  "Marketing Resources": "Checklists, scripts and campaign tools for professional marketing.",
  "Compliance Documents": "File, compliance and submission checklists for audit-ready records.",
  Assessments: "KPI trackers, goal planners and performance review tools.",
  "Reference Guides": "Process flowcharts and journey maps for you and your clients.",
};

/** Branded PDF titles included with each programme level (cumulative access when enrolled). */
export const TOOLKIT_TITLES_BY_COURSE: Record<string, string[]> = {
  "academy-course-beginner": [
    "Agent Daily Workflow",
    "Personal Goal Planner",
    "Weekly Performance Review",
    "Client Information Sheet",
    "Daily Activity Planner",
    "Weekly Planner",
    "Monthly Planner",
    "Appointment Schedule",
  ],
  "academy-course-intermediate": [
    "Property Appraisal Form",
    "Listing Agreement Template",
    "Property Listing Form",
    "Property Marketing Checklist",
    "Property Photography Checklist",
    "Property Description Template",
    "Lead Tracking Sheet",
    "Client Follow-Up Register",
    "Cold Calling Scripts",
    "Telephone Scripts",
    "Objection Handling Guide",
    "Buyer Registration Form",
    "Tenant Registration Form",
    "Buyer Needs Analysis Form",
    "Tenant Needs Analysis Form",
    "Property Viewing Register",
    "Viewing Feedback Form",
    "Open House Checklist",
    "WhatsApp Marketing Templates",
    "Social Media Content Planner",
    "Email Templates",
    "Listing Tracker",
    "Offer to Purchase Template",
    "Rental Application Form",
  ],
  "academy-course-advanced-professional": [
    "Seller Information Form",
    "Landlord Registration Form",
    "Property Inspection Checklist",
    "File Checklist",
    "Compliance Checklist",
    "Document Submission Checklist",
    "Commission Calculation Worksheet",
    "Expense Tracker",
    "Mileage Log",
    "Monthly KPI Tracker",
    "Closed Deals Register",
    "Sales Performance Tracker",
    "Property Selling Process Flowchart",
    "Property Rental Process Flowchart",
    "Buyer Journey Flowchart",
    "Seller Journey Flowchart",
    "Landlord Journey Flowchart",
  ],
};

let manifestCache: ManifestRow[] | null = null;

export async function loadAcademyManifest() {
  if (manifestCache) return manifestCache;
  const manifestPath = path.join(process.cwd(), "public", "uploads", "academy", "academy-resources-manifest.json");
  manifestCache = JSON.parse(await readFile(manifestPath, "utf8")) as ManifestRow[];
  return manifestCache;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "toolkit";
}

export function toolkitTitlesForCourse(courseId: string, cumulative = false) {
  if (!cumulative) return TOOLKIT_TITLES_BY_COURSE[courseId] ?? [];
  const course = getProgrammeCourse(courseId);
  if (!course) return [];
  return ACADEMY_PROGRAMME_COURSES.filter((entry) => entry.sortOrder <= course.sortOrder)
    .flatMap((entry) => TOOLKIT_TITLES_BY_COURSE[entry.id] ?? []);
}

export async function getToolkitGroupsForCourse(courseId: string, options?: { cumulative?: boolean; preview?: boolean }) {
  const manifest = await loadAcademyManifest();
  const titles = new Set(toolkitTitlesForCourse(courseId, options?.cumulative ?? !options?.preview));
  const items = manifest
    .filter((row) => !isFullTrainingManualUrl(row.fileUrl) && titles.has(row.title))
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((row) => ({
      id: `toolkit-${slugify(row.title)}`,
      title: row.title,
      description: row.description,
      category: row.category,
      fileUrl: toAcademyFileDownloadUrl(row.fileUrl),
      fileName: row.fileName,
    }));

  const grouped = new Map<string, ToolkitItem[]>();
  for (const item of items) {
    const list = grouped.get(item.category) ?? [];
    list.push(item);
    grouped.set(item.category, list);
  }

  return [...grouped.entries()].map(([category, groupItems]) => ({
    category,
    description: CATEGORY_BLURBS[category] ?? "HomeLink branded print-ready resources.",
    items: groupItems,
  }));
}

export function programmeMetaForCourse(courseId: string): AcademyProgrammeCourse | null {
  return getProgrammeCourse(courseId);
}

export async function getEnrolledCourseToolkits(courseIds: string[]) {
  const ordered = PROGRAMME_COURSE_IDS.filter((id) => courseIds.includes(id));
  return Promise.all(
    ordered.map(async (courseId) => {
      const meta = getProgrammeCourse(courseId);
      const groups = await getToolkitGroupsForCourse(courseId, { cumulative: false });
      const itemCount = groups.reduce((sum, group) => sum + group.items.length, 0);
      return {
        courseId,
        courseTitle: meta?.title ?? courseId,
        theme: meta?.theme ?? null,
        itemCount,
        groups,
      };
    }),
  );
}
