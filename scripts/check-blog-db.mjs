import fs from "node:fs";
import { PrismaClient } from "@prisma/client";

loadLocalEnv();

const prisma = new PrismaClient();

try {
  await prisma.$connect();
  const [publishedBlogPosts, blogCategories] = await Promise.all([
    prisma.blogPost.count({ where: { status: "PUBLISHED" } }),
    prisma.blogCategory.count(),
  ]);
  console.log(JSON.stringify({ connected: true, publishedBlogPosts, blogCategories }, null, 2));
} catch (error) {
  console.error(JSON.stringify({
    connected: false,
    error: error?.code ?? error?.name ?? "UNKNOWN",
    message: String(error?.message ?? error).split("\n")[0],
  }, null, 2));
  process.exitCode = 1;
} finally {
  await prisma.$disconnect().catch(() => null);
}

function loadLocalEnv() {
  if (!fs.existsSync(".env")) return;
  for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=("?)(.*)\2$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[3];
  }
}
