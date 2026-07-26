import fs from "node:fs";
import { getPublicBlogCategory, getPublicBlogIndex } from "../lib/blog/blog-repository";

loadLocalEnv();

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const first = await getPublicBlogIndex({ page: 1, limit: 9 });
  const second = await getPublicBlogIndex({ page: 2, limit: 9 });
  const categorySlug = first.categories[0]?.slug;
  const category = categorySlug ? await getPublicBlogCategory(categorySlug, { page: 2, limit: 9 }) : null;

  console.log(JSON.stringify({
    firstPage: summary(first),
    secondPage: summary(second),
    categorySecondPage: category ? summary(category) : null,
  }, null, 2));
}

function summary(data: { page: number; limit: number; total: number; hasMore: boolean; posts: Array<{ id: string; slug: string; featuredImageUrl?: string | null }> }) {
  return {
    page: data.page,
    limit: data.limit,
    total: data.total,
    count: data.posts.length,
    hasMore: data.hasMore,
    duplicatePostIds: duplicates(data.posts.map((post) => post.id || post.slug)),
    duplicateImages: duplicates(data.posts.map((post) => post.featuredImageUrl || "")),
  };
}

function duplicates(values: string[]) {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const value of values.filter(Boolean)) {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return [...repeated];
}

function loadLocalEnv() {
  if (!fs.existsSync(".env")) return;
  for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=("?)(.*)\2$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[3];
  }
}
