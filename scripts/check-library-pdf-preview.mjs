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
    file: "app/api/v1/library/products/[slug]/sample/route.ts",
    label: "sample route explicitly serves PDF content",
    pattern: /application\/pdf/,
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
