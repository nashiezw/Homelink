import { seedStagedCourseStructure } from "../lib/academy/staged-course-seed.ts";
import { seedOfficialAcademyResources } from "../lib/academy/official-academy-seed.ts";

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
