/**
 * Mobile overflow diagnostic — run: node scripts/diagnose-overflow.mjs [url]
 */
import { chromium, devices } from "playwright";

const url = process.argv[2] ?? "http://localhost:3000/academy";
const widths = [320, 360, 375, 390, 412, 768];

const diagnostic = `() => {
  const vw = document.documentElement.clientWidth;
  return [...document.querySelectorAll("*")]
    .filter((el) => el.getBoundingClientRect().right > vw + 0.5)
    .map((el) => ({
      tag: el.tagName,
      class: el.className?.toString?.() ?? "",
      id: el.id,
      width: getComputedStyle(el).width,
      right: Math.round(el.getBoundingClientRect().right),
      vw,
    }))
    .sort((a, b) => b.right - a.right)
    .slice(0, 20);
}`;

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ...devices["iPhone 12"] });
const page = await context.newPage();

const results = [];
for (const width of widths) {
  await page.setViewportSize({ width, height: 800 });
  await page.goto(url, { waitUntil: "networkidle", timeout: 120_000 });
  await page.waitForTimeout(800);
  const offenders = await page.evaluate(diagnostic);
  results.push({ width, count: offenders.length, offenders });
}

console.log(JSON.stringify({ url, results }, null, 2));
await browser.close();
