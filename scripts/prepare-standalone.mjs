import { cpSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const standaloneDir = join(process.cwd(), ".next", "standalone");

if (!existsSync(standaloneDir)) {
  process.stdout.write("standalone output not found; skipping asset copy\n");
  process.exit(0);
}

mkdirSync(join(standaloneDir, ".next"), { recursive: true });

cpSync(join(process.cwd(), ".next", "static"), join(standaloneDir, ".next", "static"), {
  force: true,
  recursive: true,
});

if (existsSync(join(process.cwd(), ".next", "server", "chunks"))) {
  cpSync(join(process.cwd(), ".next", "server", "chunks"), join(standaloneDir, ".next", "server"), {
    force: true,
    recursive: true,
  });
}

if (existsSync(join(process.cwd(), "public"))) {
  cpSync(join(process.cwd(), "public"), join(standaloneDir, "public"), {
    force: true,
    recursive: true,
  });
}

process.stdout.write("standalone assets copied\n");
