import { spawnSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";

const exportScript = path.join(process.cwd(), "scripts", "export-lesson-handouts.ts");
const loader = pathToFileURL(path.join(process.cwd(), "scripts", "register-alias.mjs")).href;

const exportResult = spawnSync(
  process.execPath,
  ["--experimental-strip-types", "--import", loader, exportScript],
  { stdio: "inherit", cwd: process.cwd(), env: process.env },
);

if (exportResult.status !== 0) {
  console.error("Lesson handout export failed.");
  process.exit(exportResult.status ?? 1);
}

const python = process.platform === "win32" ? "python" : "python3";
const generateResult = spawnSync(
  python,
  [path.join(process.cwd(), "scripts", "generate-lesson-handouts.py")],
  { stdio: "inherit", cwd: process.cwd(), env: process.env },
);

if (generateResult.status !== 0) {
  console.error("Lesson handout PDF generation failed.");
  process.exit(generateResult.status ?? 1);
}
