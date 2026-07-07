import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.join(import.meta.dirname, "..");

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const relative = specifier.slice(2);
    const base = path.join(root, relative);
    for (const suffix of ["", ".ts", ".tsx", ".js", ".mjs"]) {
      try {
        return await nextResolve(pathToFileURL(`${base}${suffix}`).href, context);
      } catch {
        // try next extension
      }
    }
  }
  return nextResolve(specifier, context);
}
