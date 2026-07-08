import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const projectRoot = process.cwd();
const standaloneDir = join(projectRoot, ".next", "standalone");
const serverPath = join(standaloneDir, "server.js");

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^"|"$/g, "");
  }
}

if (!existsSync(serverPath)) {
  process.stderr.write("Standalone server not found. Run npm run build first.\n");
  process.exit(1);
}

loadEnvFile(join(projectRoot, ".env"));
loadEnvFile(join(projectRoot, ".env.local"));

process.chdir(standaloneDir);
createRequire(serverPath)("./server.js");
