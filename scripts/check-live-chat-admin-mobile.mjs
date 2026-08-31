import { readFileSync } from "node:fs";

const hub = readFileSync("components/admin/live-chat-hub.tsx", "utf8");

const checks = [
  {
    label: "Live Chat root prevents viewport overflow",
    pass: /<div className="min-w-0 space-y-4 overflow-hidden">/.test(hub)
      && /<section className="min-w-0 overflow-hidden rounded-2xl/.test(hub),
  },
  {
    label: "inbox layout is mobile-first and only becomes three columns on desktop",
    pass: /grid min-w-0 gap-0 lg:min-h-\[660px\] lg:grid-cols-\[minmax\(280px,330px\)_minmax\(0,1fr\)_minmax\(320px,380px\)\]/.test(hub),
  },
  {
    label: "mobile inbox and message panes use viewport-safe scroll heights",
    pass: /max-h-\[42dvh\]/.test(hub) && /max-h-\[52dvh\]/.test(hub) && /min-h-\[70dvh\]/.test(hub),
  },
  {
    label: "message bubbles and context text break long URLs safely",
    pass: /sm:max-w-\[78%\]/.test(hub) && /\[overflow-wrap:anywhere\]/.test(hub) && /break-words/.test(hub),
  },
  {
    label: "mobile composers and action rows stack before desktop",
    pass: /mt-2 grid gap-2 sm:flex/.test(hub)
      && /grid gap-2 sm:grid-cols-\[minmax\(0,1fr\)_auto\]/.test(hub)
      && /w-full sm:w-auto/.test(hub),
  },
  {
    label: "profile and settings panels are single-column on mobile",
    pass: /grid min-w-0 grid-cols-1 gap-4 p-3 sm:p-4 xl:grid-cols-\[minmax\(280px,360px\)_minmax\(0,1fr\)\]/.test(hub)
      && /grid min-w-0 grid-cols-1 gap-4 p-3 sm:p-4 xl:grid-cols-\[minmax\(0,1fr\)_minmax\(280px,360px\)\]/.test(hub),
  },
  {
    label: "live visitors cards are single-column on small screens",
    pass: /grid min-w-0 grid-cols-1 gap-3 p-3 sm:p-4 md:grid-cols-2 xl:grid-cols-3/.test(hub),
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
