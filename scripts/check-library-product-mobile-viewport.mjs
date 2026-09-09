import fs from "node:fs";

const page = fs.readFileSync("components/library/library-product-page.tsx", "utf8");

function assert(pass, label) {
  if (!pass) {
    console.error(`FAIL ${label}`);
    process.exitCode = 1;
  } else {
    console.log(`OK   ${label}`);
  }
}

assert(
  /<main className=\{cn\("w-full max-w-\[100vw\] overflow-x-clip/.test(page),
  "product page root is clamped to the mobile viewport",
);

assert(
  /<section className="mx-auto w-full max-w-\[88rem\] min-w-0 overflow-hidden px-4 py-4 pr-6/.test(page),
  "hero section uses mobile-safe gutters with extra right padding",
);

assert(
  /<article className="w-full min-w-0 max-w-full overflow-hidden/.test(page) &&
    /<div className="grid w-full min-w-0 max-w-full items-stretch gap-4 overflow-hidden/.test(page),
  "hero card and grid cannot exceed their section width",
);

assert(
  /<section className="mx-auto grid w-full max-w-\[88rem\] min-w-0 gap-7 overflow-hidden px-4 pr-6 pb-10/.test(page),
  "main product detail section keeps the same mobile viewport gutter",
);

assert(
  /<aside className="min-w-0 max-w-full space-y-4 overflow-hidden/.test(page),
  "sidebar/detail cards are contained before becoming sticky on desktop",
);

assert(
  /<section className="mx-auto w-full max-w-\[88rem\] min-w-0 overflow-hidden px-4 pr-6 pb-14/.test(page),
  "related products section keeps the mobile right gutter",
);

assert(
  /function Panel[\s\S]*<section className="min-w-0 max-w-full overflow-hidden rounded-2xl/.test(page) &&
    /<div className="mb-4 flex min-w-0 flex-wrap/.test(page) &&
    /<h2 className="flex min-w-0 items-center gap-2 break-words/.test(page),
  "shared panels wrap headings and actions inside the viewport",
);

assert(
  /inline-flex w-fit max-w-full justify-self-start whitespace-nowrap rounded-full bg-emerald-100[\s\S]*Save \{discount\}%/.test(page),
  "purchase save badge stays as a compact mobile pill",
);

assert(
  /<div className="mt-4 grid min-w-0 gap-2 rounded-2xl border border-emerald-100[\s\S]*Questions\? WhatsApp us[\s\S]*Team access\? Request a quote/.test(page),
  "purchase help actions use a compact aligned mobile contact block",
);

assert(
  !/<section className="mx-auto[^"]*px-2\.5/.test(page),
  "product page no longer uses the narrow mobile gutter that exposed right-edge clipping",
);

if (process.exitCode) process.exit(process.exitCode);
console.log("Library product mobile viewport checks passed.");
