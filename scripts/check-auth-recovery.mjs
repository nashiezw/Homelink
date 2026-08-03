import { existsSync, readFileSync } from "node:fs";

const issues = [];

function read(path) {
  if (!existsSync(path)) {
    issues.push(`Missing required file: ${path}`);
    return "";
  }
  return readFileSync(path, "utf8");
}

function requireIncludes(path, tokens) {
  const source = read(path);
  for (const token of tokens) {
    if (!source.includes(token)) issues.push(`${path} missing ${JSON.stringify(token)}`);
  }
  return source;
}

const authForm = requireIncludes("components/auth/auth-form.tsx", [
  "validateAuthInput",
  "fieldErrorsForApiError",
  "PASSWORD_NOT_SET",
  "Send me a password setup link",
  "/auth/forgot-password",
  "aria-describedby",
  "Enter a valid email address",
]);

if (/showToast\(result\.error/.test(read("components/providers/app-provider.tsx"))) {
  issues.push("AppProvider should not show duplicate auth failure toasts; auth pages render inline errors.");
}

requireIncludes("app/api/v1/auth/session/route.ts", [
  "INVALID_JSON",
  "INVALID_EMAIL",
  "Use Forgot password to send yourself a secure setup link",
  "PASSWORD_NOT_SET",
  "ACCOUNT_SUSPENDED",
  "ACCOUNT_BLOCKED",
]);

requireIncludes("components/auth/password-recovery-forms.tsx", [
  "ForgotPasswordForm",
  "ResetPasswordForm",
  "searchParams?.get(\"email\")",
  "Passwords do not match.",
  "Password must be at least 8 characters.",
  "Request a new reset link",
]);

requireIncludes("app/api/v1/auth/password-reset/route.ts", [
  "requestPasswordReset",
  "applyPasswordReset",
  "RATE_LIMITED",
  "INVALID_TOKEN",
]);

requireIncludes("lib/auth/password-reset.ts", [
  "PasswordResetToken",
  "sendPasswordResetEmail",
  "sendSmtpPlainEmail",
  "AUTH_PASSWORD_RESET_REQUEST",
  "AUTH_PASSWORD_RESET_COMPLETE",
  "WHERE \"userId\" = ${row.userId} AND \"usedAt\" IS NULL",
  "shouldExposeDevResetUrl",
]);

requireIncludes("prisma/schema.prisma", [
  "passwordResetTokens PasswordResetToken[]",
  "model PasswordResetToken",
  "tokenHash String    @unique",
]);

requireIncludes("lib/db/production-schema.ts", [
  "ensureBlogProductionSchema",
  "CREATE TABLE IF NOT EXISTS \"PasswordResetToken\"",
  "CREATE TABLE IF NOT EXISTS \"blog_comments\"",
  "CREATE TABLE IF NOT EXISTS \"blog_reader_questions\"",
  "CREATE TABLE IF NOT EXISTS \"blog_article_feedback\"",
]);

requireIncludes("lib/blog/blog-repository.ts", [
  "ensureBlogProductionSchema",
  "getBlogReaderQuestionDashboardData",
  "Blog engagement tables are unavailable",
  "Blog reader question table is unavailable",
]);

requireIncludes("components/admin/settings/platform-settings-panel.tsx", [
  "SMTP test recipient email",
  "Test SMTP",
]);

requireIncludes("scripts/check-production-readiness.mjs", [
  "SMTP_HOST is required for transactional email.",
  "SMTP_FROM, EMAIL_FROM, RESEND_FROM, or FROM_EMAIL must be a verified sender address.",
]);

for (const path of [
  "app/auth/forgot-password/page.tsx",
  "app/auth/reset-password/page.tsx",
  "prisma/migrations/202608030001_password_reset_tokens/migration.sql",
  "prisma/migrations/202608030002_blog_engagement_schema_repair/migration.sql",
]) {
  if (!existsSync(path)) issues.push(`Missing required file: ${path}`);
}

if (!authForm.includes("setFieldErrors(fieldErrorsForApiError(result.error.code))")) {
  issues.push("Auth form should map API error codes to field-level messages.");
}

if (issues.length) {
  console.error("\nAuth recovery check failed:\n");
  for (const issue of issues) console.error(`  - ${issue}`);
  process.exit(1);
}

console.log("Auth recovery checks passed.");
