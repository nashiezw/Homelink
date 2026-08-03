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

const hub = requireIncludes("components/admin/blog-management-hub.tsx", [
  "bulk_posts",
  "delete_post",
  "duplicate_post",
  "CommentDrawer",
  "QuestionDrawer",
  "create_post_from_question",
  "delete_reader_question",
  "merge_category",
  "merge_tag",
  "delete_author",
  "delete_tag",
  "ArticlePreview",
  "articleQuality",
  "Copy article map",
  "ContentGapsPanel",
  "AnalyticsCard",
]);

requireIncludes("lib/blog/blog-repository.ts", [
  "ensureBlogProductionSchema",
  "bulk_posts",
  "update_comment",
  "reply_comment",
  "delete_reader_question",
  "create_post_from_question",
  "merge_category",
  "delete_author",
  "delete_tag",
  "merge_tag",
  "arrayOfTagNames",
  "Blog engagement tables are unavailable",
  "Blog reader question table is unavailable",
]);

requireIncludes("lib/db/production-schema.ts", [
  "CREATE TABLE IF NOT EXISTS \"blog_comments\"",
  "CREATE TABLE IF NOT EXISTS \"blog_reader_questions\"",
  "CREATE TABLE IF NOT EXISTS \"blog_article_feedback\"",
]);

if (!hub.includes("window.confirm(`Delete ${post.title}?")) {
  issues.push("Article delete action should ask for confirmation.");
}

if (!hub.includes("quality.blocking.length > 0")) {
  issues.push("Article editor should block saves when required publish fields are missing.");
}

if (issues.length) {
  console.error("\nBlog admin CMS check failed:\n");
  for (const issue of issues) console.error(`  - ${issue}`);
  process.exit(1);
}

console.log("Blog admin CMS checks passed.");
