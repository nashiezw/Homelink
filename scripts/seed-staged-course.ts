import { spawnSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { seedStagedCourseStructure } from "../lib/academy/staged-course-seed.ts";
import { seedOfficialAcademyResources } from "../lib/academy/official-academy-seed.ts";

const generateScript = path.join(process.cwd(), "scripts", "generate-academy-lesson-handouts.mjs");

const handouts = spawnSync(process.execPath, [generateScript], {
  stdio: "inherit",
  cwd: process.cwd(),
  env: process.env,
});

if (handouts.status !== 0) {
  console.error("Lesson handout generation failed.");
  process.exit(handouts.status ?? 1);
}

async function main() {
  console.log("Seeding staged HomeLink Certified Agent Programme...");
  const result = await seedStagedCourseStructure({ forceRebuild: true });
  console.log("Staged course:", result);
  const stats = await seedOfficialAcademyResources({ skipCourseRebuild: true });
  console.log("Assessments & resources:", stats);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
