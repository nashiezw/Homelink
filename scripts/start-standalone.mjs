import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const standaloneDir = join(process.cwd(), ".next", "standalone");
const serverPath = join(standaloneDir, "server.js");

if (!existsSync(serverPath)) {
  process.stderr.write("Standalone server not found. Run npm run build first.\n");
  process.exit(1);
}

process.chdir(standaloneDir);
createRequire(serverPath)("./server.js");
