DO $$ BEGIN CREATE TYPE "TrainingCourseStatus" AS ENUM ('DRAFT','PUBLISHED','ARCHIVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "TrainingVisibility" AS ENUM ('INTERNAL_ONLY','PUBLIC','BRANCH_SPECIFIC','ROLE_BASED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "TrainingDifficulty" AS ENUM ('BEGINNER','INTERMEDIATE','ADVANCED','EXPERT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "TrainingResourceType" AS ENUM ('PDF','DOCX','XLSX','PPTX','IMAGE','VIDEO','AUDIO','ZIP','LINK'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "TrainingQuestionType" AS ENUM ('MULTIPLE_CHOICE','MULTIPLE_ANSWER','TRUE_FALSE','FILL_BLANK','MATCHING','ORDERING','IMAGE','VIDEO','SCENARIO','ESSAY','DRAG_DROP','HOTSPOT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "TrainingAttemptStatus" AS ENUM ('IN_PROGRESS','SUBMITTED','PASSED','FAILED','GRADED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "AssignmentSubmissionStatus" AS ENUM ('SUBMITTED','APPROVED','REJECTED','RESUBMISSION_REQUESTED','GRADED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "training_categories" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "description" TEXT,
  "parentId" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "training_courses" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "thumbnailUrl" TEXT,
  "bannerUrl" TEXT,
  "description" TEXT NOT NULL,
  "categoryId" TEXT,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "difficulty" "TrainingDifficulty" NOT NULL DEFAULT 'BEGINNER',
  "durationMinutes" INTEGER NOT NULL DEFAULT 0,
  "instructor" TEXT,
  "prerequisites" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "passingPercentage" INTEGER NOT NULL DEFAULT 80,
  "estimatedHours" DECIMAL(6,2) NOT NULL DEFAULT 0,
  "certificateEnabled" BOOLEAN NOT NULL DEFAULT false,
  "expiresAfterDays" INTEGER,
  "version" INTEGER NOT NULL DEFAULT 1,
  "language" TEXT NOT NULL DEFAULT 'English',
  "status" "TrainingCourseStatus" NOT NULL DEFAULT 'DRAFT',
  "featured" BOOLEAN NOT NULL DEFAULT false,
  "visibility" "TrainingVisibility" NOT NULL DEFAULT 'INTERNAL_ONLY',
  "branchIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "roleNames" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "training_courses_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "training_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "training_courses_status_idx" ON "training_courses"("status");
CREATE INDEX IF NOT EXISTS "training_courses_categoryId_idx" ON "training_courses"("categoryId");
CREATE INDEX IF NOT EXISTS "training_courses_featured_idx" ON "training_courses"("featured");

CREATE TABLE IF NOT EXISTS "training_modules" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "courseId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "training_modules_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "training_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "training_modules_courseId_sortOrder_idx" ON "training_modules"("courseId","sortOrder");

CREATE TABLE IF NOT EXISTS "training_sections" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "moduleId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "training_sections_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "training_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "training_sections_moduleId_sortOrder_idx" ON "training_sections"("moduleId","sortOrder");

CREATE TABLE IF NOT EXISTS "training_lessons" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sectionId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "richText" TEXT NOT NULL DEFAULT '',
  "videoUrl" TEXT,
  "embeddedVideoUrl" TEXT,
  "pdfUrl" TEXT,
  "audioUrl" TEXT,
  "mapEmbedUrl" TEXT,
  "estimatedMinutes" INTEGER NOT NULL DEFAULT 0,
  "completionRequirement" TEXT NOT NULL DEFAULT 'VIEW',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "commentsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "bookmarksEnabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "training_lessons_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "training_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "training_lessons_sectionId_sortOrder_idx" ON "training_lessons"("sectionId","sortOrder");

CREATE TABLE IF NOT EXISTS "document_categories" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "description" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "document_library" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "categoryId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "fileUrl" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "fileType" "TrainingResourceType" NOT NULL,
  "fileSizeBytes" INTEGER NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 1,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "permissions" TEXT[] NOT NULL DEFAULT ARRAY['ADMIN','AGENT']::TEXT[],
  "searchableText" TEXT NOT NULL DEFAULT '',
  "downloadable" BOOLEAN NOT NULL DEFAULT true,
  "previewable" BOOLEAN NOT NULL DEFAULT true,
  "replacedById" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "document_library_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "document_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "document_library_categoryId_idx" ON "document_library"("categoryId");
CREATE INDEX IF NOT EXISTS "document_library_fileType_idx" ON "document_library"("fileType");
CREATE INDEX IF NOT EXISTS "document_library_active_idx" ON "document_library"("active");

CREATE TABLE IF NOT EXISTS "lesson_videos" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "lessonId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'UPLOAD',
  "durationSeconds" INTEGER NOT NULL DEFAULT 0,
  "captionsUrl" TEXT,
  "downloadable" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lesson_videos_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "training_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "lesson_videos_lessonId_idx" ON "lesson_videos"("lessonId");

CREATE TABLE IF NOT EXISTS "lesson_documents" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "lessonId" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lesson_documents_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "training_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "lesson_documents_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "document_library"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "lesson_documents_lessonId_documentId_key" ON "lesson_documents"("lessonId","documentId");

CREATE TABLE IF NOT EXISTS "lesson_resources" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "lessonId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lesson_resources_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "training_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "lesson_resources_lessonId_idx" ON "lesson_resources"("lessonId");

CREATE TABLE IF NOT EXISTS "lesson_downloads" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "lessonId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "type" "TrainingResourceType" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lesson_downloads_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "training_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "lesson_downloads_lessonId_idx" ON "lesson_downloads"("lessonId");

CREATE TABLE IF NOT EXISTS "quizzes" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "courseId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "passingPercentage" INTEGER NOT NULL DEFAULT 80,
  "randomise" BOOLEAN NOT NULL DEFAULT false,
  "timeLimitMinutes" INTEGER,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "quizzes_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "training_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "quizzes_courseId_idx" ON "quizzes"("courseId");

CREATE TABLE IF NOT EXISTS "question_bank" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "quiz_questions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "quizId" TEXT,
  "bankId" TEXT,
  "type" "TrainingQuestionType" NOT NULL,
  "prompt" TEXT NOT NULL,
  "points" INTEGER NOT NULL DEFAULT 1,
  "explanation" TEXT,
  "correctAnswer" JSONB NOT NULL,
  "incorrectFeedback" TEXT,
  "hints" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "difficulty" "TrainingDifficulty" NOT NULL DEFAULT 'BEGINNER',
  "randomise" BOOLEAN NOT NULL DEFAULT false,
  "mediaUrl" TEXT,
  "attachments" JSONB,
  "categories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "quiz_questions_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "quiz_questions_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "question_bank"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "quiz_questions_quizId_idx" ON "quiz_questions"("quizId");
CREATE INDEX IF NOT EXISTS "quiz_questions_bankId_idx" ON "quiz_questions"("bankId");

CREATE TABLE IF NOT EXISTS "quiz_answers" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "questionId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "isCorrect" BOOLEAN NOT NULL DEFAULT false,
  "feedback" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "quiz_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "quiz_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "quiz_answers_questionId_idx" ON "quiz_answers"("questionId");

CREATE TABLE IF NOT EXISTS "quiz_attempts" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "quizId" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "status" "TrainingAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "score" DECIMAL(6,2) NOT NULL DEFAULT 0,
  "answers" JSONB NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "submittedAt" TIMESTAMP(3),
  "gradedAt" TIMESTAMP(3),
  CONSTRAINT "quiz_attempts_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "quiz_attempts_quizId_idx" ON "quiz_attempts"("quizId");
CREATE INDEX IF NOT EXISTS "quiz_attempts_agentId_idx" ON "quiz_attempts"("agentId");

CREATE TABLE IF NOT EXISTS "final_exams" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "courseId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "durationMinutes" INTEGER NOT NULL DEFAULT 60,
  "passingScore" INTEGER NOT NULL DEFAULT 80,
  "randomQuestions" BOOLEAN NOT NULL DEFAULT true,
  "questionPools" JSONB,
  "attemptLimit" INTEGER NOT NULL DEFAULT 2,
  "browserLock" BOOLEAN NOT NULL DEFAULT false,
  "autoSubmit" BOOLEAN NOT NULL DEFAULT true,
  "retakeRules" JSONB,
  "reviewEnabled" BOOLEAN NOT NULL DEFAULT true,
  "manualGrading" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "final_exams_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "training_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "final_exams_courseId_idx" ON "final_exams"("courseId");

CREATE TABLE IF NOT EXISTS "exam_attempts" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "examId" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "status" "TrainingAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "score" DECIMAL(6,2) NOT NULL DEFAULT 0,
  "answers" JSONB NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "submittedAt" TIMESTAMP(3),
  "gradedAt" TIMESTAMP(3),
  CONSTRAINT "exam_attempts_examId_fkey" FOREIGN KEY ("examId") REFERENCES "final_exams"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "exam_attempts_examId_idx" ON "exam_attempts"("examId");
CREATE INDEX IF NOT EXISTS "exam_attempts_agentId_idx" ON "exam_attempts"("agentId");

CREATE TABLE IF NOT EXISTS "assignments" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "courseId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "dueDays" INTEGER,
  "points" INTEGER NOT NULL DEFAULT 100,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "assignments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "training_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "assignments_courseId_idx" ON "assignments"("courseId");

CREATE TABLE IF NOT EXISTS "assignment_submissions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "assignmentId" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "status" "AssignmentSubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
  "notes" TEXT,
  "fileUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "grade" DECIMAL(6,2),
  "reviewerId" TEXT,
  "reviewerNote" TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  CONSTRAINT "assignment_submissions_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "assignment_submissions_assignmentId_idx" ON "assignment_submissions"("assignmentId");
CREATE INDEX IF NOT EXISTS "assignment_submissions_agentId_idx" ON "assignment_submissions"("agentId");

CREATE TABLE IF NOT EXISTS "course_enrolments" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "courseId" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dueAt" TIMESTAMP(3),
  CONSTRAINT "course_enrolments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "training_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "course_enrolments_courseId_agentId_key" ON "course_enrolments"("courseId","agentId");
CREATE INDEX IF NOT EXISTS "course_enrolments_agentId_idx" ON "course_enrolments"("agentId");

CREATE TABLE IF NOT EXISTS "lesson_progress" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "lessonId" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
  "percentComplete" INTEGER NOT NULL DEFAULT 0,
  "readingSeconds" INTEGER NOT NULL DEFAULT 0,
  "completedAt" TIMESTAMP(3),
  "lastViewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lesson_progress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "training_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "lesson_progress_lessonId_agentId_key" ON "lesson_progress"("lessonId","agentId");
CREATE INDEX IF NOT EXISTS "lesson_progress_agentId_idx" ON "lesson_progress"("agentId");

CREATE TABLE IF NOT EXISTS "course_progress" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "courseId" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
  "percentComplete" INTEGER NOT NULL DEFAULT 0,
  "averageScore" DECIMAL(6,2) NOT NULL DEFAULT 0,
  "learningMinutes" INTEGER NOT NULL DEFAULT 0,
  "completedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "course_progress_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "training_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "course_progress_courseId_agentId_key" ON "course_progress"("courseId","agentId");
CREATE INDEX IF NOT EXISTS "course_progress_agentId_idx" ON "course_progress"("agentId");

CREATE TABLE IF NOT EXISTS "learning_paths" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "badgeTitle" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "path_courses" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "pathId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "required" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "path_courses_pathId_fkey" FOREIGN KEY ("pathId") REFERENCES "learning_paths"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "path_courses_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "training_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "path_courses_pathId_courseId_key" ON "path_courses"("pathId","courseId");

CREATE TABLE IF NOT EXISTS "certificates" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "certificate_templates" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "backgroundUrl" TEXT,
  "logoUrl" TEXT,
  "signatureUrl" TEXT,
  "templateJson" JSONB NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "certificate_issues" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "certificateNumber" TEXT NOT NULL UNIQUE,
  "courseId" TEXT,
  "agentId" TEXT NOT NULL,
  "templateId" TEXT,
  "qrCodeUrl" TEXT,
  "pdfUrl" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "certificate_issues_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "training_courses"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "certificate_issues_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "certificate_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "certificate_issues_agentId_idx" ON "certificate_issues"("agentId");
CREATE INDEX IF NOT EXISTS "certificate_issues_courseId_idx" ON "certificate_issues"("courseId");

CREATE TABLE IF NOT EXISTS "video_library" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT NOT NULL,
  "videoUrl" TEXT NOT NULL,
  "thumbnailUrl" TEXT,
  "durationSeconds" INTEGER NOT NULL DEFAULT 0,
  "captionsUrl" TEXT,
  "downloadable" BOOLEAN NOT NULL DEFAULT false,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "video_library_category_idx" ON "video_library"("category");

CREATE TABLE IF NOT EXISTS "video_progress" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "videoId" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "watchedSeconds" INTEGER NOT NULL DEFAULT 0,
  "percentComplete" INTEGER NOT NULL DEFAULT 0,
  "playbackSpeed" DECIMAL(4,2) NOT NULL DEFAULT 1,
  "bookmarks" JSONB,
  "notes" TEXT,
  "lastWatchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "video_progress_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "video_library"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "video_progress_videoId_agentId_key" ON "video_progress"("videoId","agentId");

CREATE TABLE IF NOT EXISTS "discussion_threads" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "courseId" TEXT,
  "title" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "pinned" BOOLEAN NOT NULL DEFAULT false,
  "locked" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "discussion_threads_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "training_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "discussion_threads_courseId_idx" ON "discussion_threads"("courseId");

CREATE TABLE IF NOT EXISTS "discussion_posts" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "threadId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "imageUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "reactions" JSONB,
  "mentions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "bookmarkedBy" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "moderated" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "discussion_posts_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "discussion_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "discussion_posts_threadId_idx" ON "discussion_posts"("threadId");

CREATE TABLE IF NOT EXISTS "announcements" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "audience" TEXT NOT NULL DEFAULT 'ALL',
  "publishedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'QUEUED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3)
);
CREATE INDEX IF NOT EXISTS "notifications_userId_idx" ON "notifications"("userId");

CREATE TABLE IF NOT EXISTS "badges" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "iconUrl" TEXT,
  "xp" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "agent_badges" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "badgeId" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "agent_badges_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "badges"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "agent_badges_badgeId_agentId_key" ON "agent_badges"("badgeId","agentId");

CREATE TABLE IF NOT EXISTS "leaderboards" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "agentId" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "points" INTEGER NOT NULL DEFAULT 0,
  "rank" INTEGER NOT NULL DEFAULT 0,
  "period" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "leaderboards_agentId_scope_period_key" ON "leaderboards"("agentId","scope","period");

CREATE TABLE IF NOT EXISTS "training_settings" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
  "payload" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "target" TEXT NOT NULL,
  "metadata" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "audit_logs_actorId_idx" ON "audit_logs"("actorId");
