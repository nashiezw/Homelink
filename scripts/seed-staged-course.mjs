/**
 * Runs staged course seed using Node native TypeScript (--experimental-strip-types).
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";

const script = path.join(process.cwd(), "scripts", "seed-staged-course.ts");
const loader = pathToFileURL(path.join(process.cwd(), "scripts", "register-alias.mjs")).href;

const result = spawnSync(
  process.execPath,
  ["--experimental-strip-types", "--import", loader, script],
  { stdio: "inherit", cwd: process.cwd(), env: process.env },
);

if (result.status !== 0) {
  console.error("Staged course seed failed.");
  process.exit(result.status ?? 1);
}
