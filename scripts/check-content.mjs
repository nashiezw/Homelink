import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const textExtensions = new Set([
  ".css",
  ".json",
  ".md",
  ".mjs",
  ".prisma",
  ".ts",
  ".tsx",
  ".js",
  ".yml",
  ".yaml",
  ".example",
  ".dockerignore",
  ".gitignore",
]);
const requiredFiles = [
  "app/page.tsx",
  "app/search/page.tsx",
  "app/listings/[id]/page.tsx",
  "app/auth/page.tsx",
  "app/saved/page.tsx",
  "app/roommates/page.tsx",
  "app/messages/page.tsx",
  "app/payments/page.tsx",
  "app/compare/page.tsx",
  "app/dashboard/landlord/page.tsx",
  "app/dashboard/agency/page.tsx",
  "app/dashboard/admin/page.tsx",
  "app/api/v1/listings/route.ts",
  "app/api/v1/search/ai/route.ts",
  "prisma/schema.prisma",
  "docs/architecture.md",
  "docs/api.md",
  "docs/operations.md",
];
const forbiddenPatterns = [
  { name: "debug logging", pattern: new RegExp("console\\.log|debug" + "ger"), scopes: ["app/", "components/", "lib/"] },
  { name: "unfinished marker", pattern: new RegExp("TO" + "DO|FIX" + "ME"), scopes: ["app/", "components/", "lib/", "prisma/"] },
  { name: "placeholder link", pattern: new RegExp("href=" + String.fromCharCode(34) + "#") },
];

const errors = [];

for (const file of requiredFiles) {
  try {
    statSync(join(root, file));
  } catch {
    errors.push(`Missing required file: ${file}`);
  }
}

for (const file of walk(root)) {
  const relativePath = relative(root, file).replaceAll("\\", "/");

  if (
    relativePath.startsWith("node_modules/") ||
    relativePath.startsWith(".next/") ||
    relativePath.startsWith(".git/") ||
    relativePath.startsWith(".data/") ||
    relativePath.startsWith("coverage/") ||
    relativePath.startsWith("tmp/") ||
    relativePath.startsWith("lib/generated/")
  ) {
    continue;
  }

  const extension = extensionFor(relativePath);
  if (!textExtensions.has(extension)) {
    continue;
  }

  const source = readFileSync(file, "utf8");

  if (relativePath.endsWith(".json")) {
    try {
      JSON.parse(source);
    } catch (error) {
      errors.push(`Invalid JSON in ${relativePath}: ${error.message}`);
    }
  }

  for (const { name, pattern, scopes } of forbiddenPatterns) {
    if (scopes && !scopes.some((scope) => relativePath.startsWith(scope))) {
      continue;
    }
    if (pattern.test(source)) {
      errors.push(`Found ${name} in ${relativePath}`);
    }
  }
}

if (errors.length) {
  for (const error of errors) {
    process.stderr.write(`${error}\n`);
  }
  process.exit(1);
}

process.stdout.write("content checks passed\n");

function walk(directory) {
  const entries = readdirSync(directory);
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry);
    const stats = statSync(path);

    if (stats.isDirectory()) {
      files.push(...walk(path));
    } else {
      files.push(path);
    }
  }

  return files;
}

function extensionFor(path) {
  if (path.endsWith(".env.example")) {
    return ".example";
  }

  if (path.endsWith(".dockerignore")) {
    return ".dockerignore";
  }

  if (path.endsWith(".gitignore")) {
    return ".gitignore";
  }

  const lastDot = path.lastIndexOf(".");
  return lastDot === -1 ? "" : path.slice(lastDot);
}
