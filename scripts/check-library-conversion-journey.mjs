import { readFileSync } from "node:fs";

const productPage = readFileSync("components/library/library-product-page.tsx", "utf8");
const liveChat = readFileSync("components/live-chat/live-chat-widget.tsx", "utf8");
const analyticsEvents = readFileSync("lib/analytics/events.ts", "utf8");
const advancedReport = readFileSync("lib/analytics/advanced-report.ts", "utf8");

const checks = [
  {
    label: "product page has a quick buyer decision block before purchase",
    pass: /Quick decision check/.test(productPage) && /Best for:/.test(productPage) && /You get:/.test(productPage) && /Access:/.test(productPage),
  },
  {
    label: "sample preview is positioned inside the buying decision area",
    pass: /Preview before buying/.test(productPage) && /decision_block/.test(productPage),
  },
  {
    label: "What you get uses a full-width stacked outcome list",
    pass: /<ol className="mt-5 grid gap-2">[\s\S]*learningOutcomes\.slice\(0, 6\)/.test(productPage),
  },
  {
    label: "Who This Is For uses a numbered stacked audience list",
    pass: /<Panel title="Who This Is For" icon=\{Users\}>[\s\S]*<ol className="grid gap-2">[\s\S]*whoThisIsFor\.map\(\(item, index\)/.test(productPage),
  },
  {
    label: "product page has a tracked buyer FAQ",
    pass: /Before You Buy/.test(productPage) && /trackFaqOpened/.test(productPage) && /library_faq_opened/.test(productPage),
  },
  {
    label: "digital CTA says Get instant access",
    pass: /Get instant access/.test(productPage),
  },
  {
    label: "format selections and purchase CTAs are tracked",
    pass: /library_format_selected/.test(productPage) && /library_cta_clicked/.test(productPage),
  },
  {
    label: "live chat quick replies ask conversion questions",
    pass: /Is this right for me\?/.test(liveChat) && /payment or proof upload/.test(liveChat),
  },
  {
    label: "new conversion events are registered",
    pass: ["library_format_selected", "library_faq_opened", "library_cta_clicked"].every((event) => analyticsEvents.includes(`"${event}"`)),
  },
  {
    label: "new conversion events appear in analytics engagement and journeys",
    pass: /format selections/.test(advancedReport) && /buyer FAQ opens/.test(advancedReport) && /purchase CTA clicks/.test(advancedReport),
  },
];

let failed = false;
for (const check of checks) {
  if (check.pass) {
    console.log(`OK   ${check.label}`);
  } else {
    failed = true;
    console.error(`FAIL ${check.label}`);
  }
}

if (failed) process.exit(1);
