import { expect, test } from "@playwright/test";
import { evaluateCertificateEligibility } from "../../lib/academy/certificate-eligibility";
import { isLessonProgressComplete } from "../../lib/academy/lesson-completion";

test("bookmarked lessons retain completion through their completion timestamp", () => {
  expect(isLessonProgressComplete({ status: "BOOKMARKED", completedAt: new Date("2026-09-26T16:20:04.018Z") })).toBe(true);
  expect(isLessonProgressComplete({ status: "BOOKMARKED", completedAt: null })).toBe(false);
});

test("certificate eligibility identifies incomplete lessons by course order and title", () => {
  const eligibility = evaluateCertificateEligibility({
    courseId: "course-1",
    certificateEnabled: true,
    passMark: 80,
    completedLessons: 2,
    totalLessons: 3,
    incompleteLessons: [{
      id: "lesson-2",
      number: 2,
      title: "How to Use This Academy",
      moduleTitle: "Welcome",
      sectionTitle: "Getting started",
    }],
    quizzes: [],
    assignments: [],
    exams: [],
    certificateIssued: false,
    templateAvailable: true,
  });

  expect(eligibility.status).toBe("LESSONS_IN_PROGRESS");
  expect(eligibility.lessonProgress.incomplete).toEqual([expect.objectContaining({
    number: 2,
    title: "How to Use This Academy",
  })]);
  expect(eligibility.blockers[0]?.detail).toContain("Lesson 2: How to Use This Academy");
});
