import { readFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const files = execFileSync("git", ["ls-files", "app/api/v1/admin/**/route.ts"], {
  cwd: root,
  encoding: "utf8",
}).trim().split(/\r?\n/).filter(Boolean);

const failures = [];

for (const file of files) {
  const source = readFileSync(join(root, file), "utf8");
  if (!/requireAdmin(?:Async)?\(/.test(source)) {
    failures.push(`${file}: missing requireAdmin/requireAdminAsync`);
  }
  if (/getSessionUserIdFromRequest/.test(source) && !/requireAdmin(?:Async)?\(/.test(source)) {
    failures.push(`${file}: direct session check without admin helper`);
  }
}

if (failures.length) {
  console.error("Admin permission check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Admin permission check passed for ${files.length} routes.`);
