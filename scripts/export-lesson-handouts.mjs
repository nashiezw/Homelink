import { spawnSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";

const script = path.join(process.cwd(), "scripts", "export-lesson-handouts.ts");
const loader = pathToFileURL(path.join(process.cwd(), "scripts", "register-alias.mjs")).href;

const result = spawnSync(
  process.execPath,
  ["--experimental-strip-types", "--import", loader, script],
  { stdio: "inherit", cwd: process.cwd(), env: process.env },
);

if (result.status !== 0) {
  console.error("Lesson handout export failed.");
  process.exit(result.status ?? 1);
}
