import { readFileSync } from "fs";

const checks = [
  {
    file: "components/library/library-product-page.tsx",
    label: "sample modal uses the bundled PDF.js viewer",
    pattern: /<PdfSampleViewer[\s>]/,
  },
  {
    file: "components/library/library-product-page.tsx",
    label: "sample modal no longer relies on native iframe PDF rendering",
    reject: /<iframe/i,
  },
  {
    file: "components/library/pdf-sample-viewer.tsx",
    label: "PDF.js is imported client-side",
    pattern: /import\("pdfjs-dist"\)/,
  },
  {
    file: "components/library/pdf-sample-viewer.tsx",
    label: "PDF.js worker is bundled from pdfjs-dist",
    pattern: /pdf\.worker\.min\.mjs/,
  },
  {
    file: "components/library/pdf-sample-viewer.tsx",
    label: "PDF pages render progressively near the viewport",
    pattern: /IntersectionObserver[\s\S]*rootMargin: "600px 0px"/,
  },
  {
    file: "components/library/pdf-sample-viewer.tsx",
    label: "the first PDF page renders eagerly",
    pattern: /eager=\{page\.pageNumber === 1\}/,
  },
  {
    file: "components/library/pdf-sample-viewer.tsx",
    label: "mobile canvas density is capped",
    pattern: /Math\.min\(window\.devicePixelRatio \|\| 1, 1\.5\)/,
  },
  {
    file: "components/library/pdf-sample-viewer.tsx",
    label: "sample viewed tracking does not restart rendering",
    pattern: /onViewedRef[\s\S]*onViewedRef\.current\?\.\(\)/,
  },
  {
    file: "lib/library/sample-preview.ts",
    label: "prepared sample lookup normalizes product slug variants",
    pattern: /sampleLookupKey[\s\S]*complete[\s\S]*guide/,
  },
  {
    file: "lib/library/repository.ts",
    label: "the sample selected in the product form takes priority",
    pattern: /resolveLibraryProductSampleFile[\s\S]*const sample[\s\S]*if \(!sample\?\.fileUrl\)[\s\S]*const prepared/,
  },
  {
    file: "app/api/v1/library/products/[slug]/sample/route.ts",
    label: "sample route explicitly serves PDF content",
    pattern: /application\/pdf/,
  },
  {
    file: "components/library/library-product-page.tsx",
    label: "prepared product samples use static delivery",
    pattern: /startsWith\("\/uploads\/library\/samples\/"\)/,
  },
  {
    file: "app/api/v1/library/products/[slug]/sample/route.ts",
    label: "sample route supports inline preview and intentional download",
    pattern: /download.*attachment.*inline/s,
  },
  {
    file: "next.config.ts",
    label: "standalone output traces local sample uploads",
    pattern: /\/api\/v1\/library\/products\/\[slug\]\/sample/,
  },
  {
    file: "next.config.ts",
    label: "prepared samples use immutable caching and byte ranges",
    pattern: /\/uploads\/library\/samples\/:path\*[\s\S]*max-age=31536000, immutable[\s\S]*Accept-Ranges/,
  },
];

let failed = false;

for (const check of checks) {
  const source = readFileSync(check.file, "utf8");
  if (check.pattern && !check.pattern.test(source)) {
    failed = true;
    console.error(`FAIL ${check.label}`);
  } else if (check.reject && check.reject.test(source)) {
    failed = true;
    console.error(`FAIL ${check.label}`);
  } else {
    console.log(`OK   ${check.label}`);
  }
}

if (failed) process.exit(1);
