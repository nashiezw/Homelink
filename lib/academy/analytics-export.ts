import { StudentProgressAnalytics, CourseWideAnalytics, AtRiskStudent } from "./analytics-repository";

export function exportStudentProgressToCSV(analytics: StudentProgressAnalytics): string {
  const headers = [
    "Student Name",
    "Student Email",
    "Enrolled Courses",
    "Completed Courses",
    "In Progress Courses",
    "Average Completion Rate",
    "Total Learning Hours",
    "Last Activity Date",
    "Enrollment Date",
    "Course Title",
    "Course Status",
    "Completion Percentage",
    "Learning Hours",
    "Average Score",
    "Modules Completed",
    "Total Modules",
    "Lessons Completed",
    "Total Lessons",
    "Current Lesson",
    "Time Per Lesson (min)",
    "Estimated Completion Date"
  ];

  const rows = analytics.courses.map(course => [
    analytics.studentName,
    analytics.studentEmail,
    analytics.enrolledCourses,
    analytics.completedCourses,
    analytics.inProgressCourses,
    analytics.averageCompletionRate.toFixed(1),
    (analytics.totalLearningMinutes / 60).toFixed(1),
    analytics.lastActivityDate ? analytics.lastActivityDate.toISOString() : "",
    analytics.enrollmentDate ? analytics.enrollmentDate.toISOString() : "",
    course.courseTitle,
    course.status,
    course.completionPercentage,
    (course.learningMinutes / 60).toFixed(1),
    course.averageScore.toFixed(1),
    course.modulesCompleted,
    course.totalModules,
    course.lessonsCompleted,
    course.totalLessons,
    course.currentLesson || "",
    course.timeSpentPerLesson.toFixed(1),
    course.estimatedCompletionDate ? course.estimatedCompletionDate.toISOString() : ""
  ]);

  return [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
}

export function exportCourseAnalyticsToCSV(analytics: CourseWideAnalytics): string {
  const headers = [
    "Course Title",
    "Total Enrollments",
    "Active Enrollments",
    "Completed Enrollments",
    "Enrollment Rate",
    "Completion Rate",
    "Average Completion Time (days)",
    "Average Score",
    "Average Learning Hours"
  ];

  const summaryRow = [
    analytics.courseTitle,
    analytics.totalEnrollments,
    analytics.activeEnrollments,
    analytics.completedEnrollments,
    analytics.enrollmentRate.toFixed(1),
    analytics.completionRate.toFixed(1),
    analytics.averageCompletionTime.toFixed(1),
    analytics.averageScore.toFixed(1),
    (analytics.averageLearningMinutes / 60).toFixed(1)
  ];

  let csv = [headers.join(","), summaryRow.join(",")].join("\n");

  // Add drop-off points
  if (analytics.dropOffPoints.length > 0) {
    csv += "\n\nDROP-OFF POINTS\n";
    const dropOffHeaders = ["Lesson Title", "Module Title", "Drop-off Count", "Drop-off Percentage", "Avg Time Before Drop-off (min)"];
    const dropOffRows = analytics.dropOffPoints.map(point => [
      point.lessonTitle,
      point.moduleTitle,
      point.dropOffCount,
      point.dropOffPercentage.toFixed(1),
      point.averageTimeBeforeDropOff.toFixed(1)
    ]);
    csv += [dropOffHeaders.join(","), ...dropOffRows.map(row => row.join(","))].join("\n");
  }

  // Add peak usage times
  if (analytics.peakUsageTimes.length > 0) {
    csv += "\n\nPEAK USAGE TIMES\n";
    const usageHeaders = ["Day of Week", "Hour", "Activity Count", "Percentage"];
    const usageRows = analytics.peakUsageTimes.map(time => [
      time.dayOfWeek,
      time.hour,
      time.activityCount,
      time.percentage.toFixed(1)
    ]);
    csv += [usageHeaders.join(","), ...usageRows.map(row => row.join(","))].join("\n");
  }

  // Add cohort comparison
  if (analytics.cohortComparison.length > 0) {
    csv += "\n\nCOHORT COMPARISON\n";
    const cohortHeaders = ["Cohort Name", "Enrollment Period", "Total Enrollments", "Completion Rate", "Avg Completion Time (days)", "Avg Score"];
    const cohortRows = analytics.cohortComparison.map(cohort => [
      cohort.cohortName,
      cohort.enrollmentPeriod,
      cohort.totalEnrollments,
      cohort.completionRate.toFixed(1),
      cohort.averageCompletionTime.toFixed(1),
      cohort.averageScore.toFixed(1)
    ]);
    csv += [cohortHeaders.join(","), ...cohortRows.map(row => row.join(","))].join("\n");
  }

  return csv;
}

export function exportAtRiskStudentsToCSV(students: AtRiskStudent[]): string {
  const headers = [
    "Student Name",
    "Student Email",
    "Course Title",
    "Risk Type",
    "Risk Level",
    "Risk Description",
    "Last Activity Date",
    "Days Since Last Activity",
    "Consecutive Failures",
    "Current Lesson",
    "Time on Current Lesson (min)",
    "Progress Percentage",
    "Expected Progress",
    "Intervention Recommended",
    "Intervention Actions"
  ];

  const rows = students.map(student => [
    student.studentName,
    student.studentEmail,
    student.courseTitle,
    student.riskType,
    student.riskLevel,
    student.riskDescription,
    student.lastActivityDate ? student.lastActivityDate.toISOString() : "",
    student.daysSinceLastActivity || "",
    student.consecutiveFailures,
    student.currentLesson || "",
    student.timeOnCurrentLesson,
    student.progressPercentage,
    student.expectedProgress,
    student.interventionRecommended ? "Yes" : "No",
    student.interventionActions.join("; ")
  ]);

  return [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
}

export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function generateStudentProgressReport(analytics: StudentProgressAnalytics): string {
  return `
# Student Progress Report

## Student Information
- **Name:** ${analytics.studentName}
- **Email:** ${analytics.studentEmail}
- **Enrollment Date:** ${analytics.enrollmentDate ? analytics.enrollmentDate.toLocaleDateString() : "N/A"}
- **Last Activity:** ${analytics.lastActivityDate ? analytics.lastActivityDate.toLocaleDateString() : "N/A"}

## Overall Progress
- **Enrolled Courses:** ${analytics.enrolledCourses}
- **Completed Courses:** ${analytics.completedCourses}
- **In Progress:** ${analytics.inProgressCourses}
- **Average Completion Rate:** ${analytics.averageCompletionRate.toFixed(1)}%
- **Total Learning Time:** ${Math.floor(analytics.totalLearningMinutes / 60)} hours

## Course Details

${analytics.courses.map(course => `
### ${course.courseTitle}
- **Status:** ${course.status}
- **Completion:** ${course.completionPercentage}%
- **Progress:** ${course.lessonsCompleted}/${course.totalLessons} lessons, ${course.modulesCompleted}/${course.totalModules} modules
- **Learning Time:** ${Math.floor(course.learningMinutes / 60)} hours
- **Average Score:** ${course.averageScore.toFixed(1)}%
- **Current Lesson:** ${course.currentLesson || "N/A"}
- **Average Time Per Lesson:** ${Math.floor(course.timeSpentPerLesson)} minutes
- **Estimated Completion:** ${course.estimatedCompletionDate ? course.estimatedCompletionDate.toLocaleDateString() : "N/A"}
`).join("\n")}

---
*Report generated on ${new Date().toLocaleDateString()}*
`;
}

export function generateCourseAnalyticsReport(analytics: CourseWideAnalytics): string {
  return `
# Course Analytics Report

## Course Overview
- **Course:** ${analytics.courseTitle}
- **Total Enrollments:** ${analytics.totalEnrollments}
- **Active Learners:** ${analytics.activeEnrollments}
- **Completed:** ${analytics.completedEnrollments}
- **Enrollment Rate:** ${analytics.enrollmentRate.toFixed(1)}%
- **Completion Rate:** ${analytics.completionRate.toFixed(1)}%
- **Average Completion Time:** ${analytics.averageCompletionTime.toFixed(1)} days
- **Average Score:** ${analytics.averageScore.toFixed(1)}%
- **Average Learning Time:** ${Math.floor(analytics.averageLearningMinutes / 60)} hours

## Key Insights

### Drop-off Points
${analytics.dropOffPoints.length > 0 ? analytics.dropOffPoints.map(point => `
- **${point.lessonTitle}** (${point.moduleTitle})
  - ${point.dropOffCount} students (${point.dropOffPercentage.toFixed(1)}%)
  - Average time before drop-off: ${point.averageTimeBeforeDropOff.toFixed(1)} minutes
`).join("") : "No significant drop-off points identified."}

### Peak Usage Times
${analytics.peakUsageTimes.slice(0, 5).map(time => `
- **${time.dayOfWeek} at ${time.hour}:00** - ${time.activityCount} activities (${time.percentage.toFixed(1)}%)
`).join("")}

### Cohort Comparison
${analytics.cohortComparison.map(cohort => `
- **${cohort.cohortName}**
  - Enrollments: ${cohort.totalEnrollments}
  - Completion Rate: ${cohort.completionRate.toFixed(1)}%
  - Avg Completion Time: ${cohort.averageCompletionTime.toFixed(1)} days
  - Avg Score: ${cohort.averageScore.toFixed(1)}%
`).join("")}

---
*Report generated on ${new Date().toLocaleDateString()}*
`;
}
