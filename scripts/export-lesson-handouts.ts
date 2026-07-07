import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { buildLessonHandoutManifest } from "../lib/academy/lesson-handouts.ts";
import { modules } from "../lib/academy/staged-course-seed.ts";

async function main() {
  const manifest = buildLessonHandoutManifest(modules);
  const outDir = path.join(process.cwd(), "public", "uploads", "academy");
  await mkdir(outDir, { recursive: true });
  const manifestPath = path.join(outDir, "lesson-handouts-manifest.json");
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  console.log(`Exported ${manifest.length} lesson handouts to ${manifestPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
