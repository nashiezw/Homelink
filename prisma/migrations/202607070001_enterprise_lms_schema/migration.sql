-- Enterprise LMS schema: course metadata, lesson content fields, lesson/module-linked assessments

ALTER TABLE "training_courses" ADD COLUMN IF NOT EXISTS "subtitle" TEXT;
ALTER TABLE "training_courses" ADD COLUMN IF NOT EXISTS "shortDescription" TEXT;
ALTER TABLE "training_courses" ADD COLUMN IF NOT EXISTS "coInstructors" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "training_courses" ADD COLUMN IF NOT EXISTS "learningOutcomes" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "training_courses" ADD COLUMN IF NOT EXISTS "targetAudience" TEXT;
ALTER TABLE "training_courses" ADD COLUMN IF NOT EXISTS "introVideoUrl" TEXT;
ALTER TABLE "training_courses" ADD COLUMN IF NOT EXISTS "previewVideoUrl" TEXT;
ALTER TABLE "training_courses" ADD COLUMN IF NOT EXISTS "welcomeVideoUrl" TEXT;
ALTER TABLE "training_courses" ADD COLUMN IF NOT EXISTS "seoTitle" TEXT;
ALTER TABLE "training_courses" ADD COLUMN IF NOT EXISTS "seoDescription" TEXT;
ALTER TABLE "training_courses" ADD COLUMN IF NOT EXISTS "enrollmentType" TEXT NOT NULL DEFAULT 'OPEN';
ALTER TABLE "training_courses" ADD COLUMN IF NOT EXISTS "capacity" INTEGER;
ALTER TABLE "training_courses" ADD COLUMN IF NOT EXISTS "discountPrice" DECIMAL(12,2);

ALTER TABLE "training_modules" ADD COLUMN IF NOT EXISTS "objectives" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "training_modules" ADD COLUMN IF NOT EXISTS "estimatedMinutes" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "training_lessons" ADD COLUMN IF NOT EXISTS "transcript" TEXT;
ALTER TABLE "training_lessons" ADD COLUMN IF NOT EXISTS "lessonNotes" TEXT;
ALTER TABLE "training_lessons" ADD COLUMN IF NOT EXISTS "objectives" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "training_lessons" ADD COLUMN IF NOT EXISTS "discussionPrompt" TEXT;
ALTER TABLE "training_lessons" ADD COLUMN IF NOT EXISTS "checklist" JSONB;
ALTER TABLE "training_lessons" ADD COLUMN IF NOT EXISTS "reflectionQuestions" JSONB;

ALTER TABLE "quizzes" ADD COLUMN IF NOT EXISTS "moduleId" TEXT;
ALTER TABLE "quizzes" ADD COLUMN IF NOT EXISTS "lessonId" TEXT;
CREATE INDEX IF NOT EXISTS "quizzes_moduleId_idx" ON "quizzes"("moduleId");
CREATE INDEX IF NOT EXISTS "quizzes_lessonId_idx" ON "quizzes"("lessonId");
DO $$ BEGIN
  ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "training_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "training_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "assignments" ADD COLUMN IF NOT EXISTS "moduleId" TEXT;
ALTER TABLE "assignments" ADD COLUMN IF NOT EXISTS "lessonId" TEXT;
CREATE INDEX IF NOT EXISTS "assignments_moduleId_idx" ON "assignments"("moduleId");
CREATE INDEX IF NOT EXISTS "assignments_lessonId_idx" ON "assignments"("lessonId");
DO $$ BEGIN
  ALTER TABLE "assignments" ADD CONSTRAINT "assignments_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "training_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "assignments" ADD CONSTRAINT "assignments_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "training_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
