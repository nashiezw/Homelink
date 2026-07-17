import { seedManualCourseStructure } from "../lib/academy/manual-course-seed";
import { seedOfficialAcademyResources } from "../lib/academy/official-academy-seed";

async function main() {
  console.log("Seeding complete HouseLink Agent Training course from manual...");
  const result = await seedManualCourseStructure({ forceRebuild: true });
  console.log("Manual course:", result);
  const stats = await seedOfficialAcademyResources();
  console.log("Assessments & resources:", stats);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
