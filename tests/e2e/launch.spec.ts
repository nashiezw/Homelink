import { expect, test, type Page } from "@playwright/test";

const seekerEmail = process.env.E2E_SEEKER_EMAIL;
const seekerPassword = process.env.E2E_SEEKER_PASSWORD;
const landlordEmail = process.env.E2E_LANDLORD_EMAIL;
const landlordPassword = process.env.E2E_LANDLORD_PASSWORD;
const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;

test("home search finds inventory", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /find/i })).toBeVisible();
  await page.getByPlaceholder(/harare|avondale|kwekwe/i).first().fill("Harare");
  await page.getByRole("button", { name: /search|find|filter/i }).first().click();
  await expect(page).toHaveURL(/search|rent|property/);
});

test("search filters and mobile filter controls are scannable", async ({ page }) => {
  await page.goto("/search?intent=rent&city=Harare");
  await expect(page.getByText(/verified only/i).first()).toBeVisible();
  await page.getByText(/verified only/i).first().click();
  await expect(page).toHaveURL(/verifiedOnly=true/);
  await expect(page.getByRole("button", { name: /load more|next/i }).or(page.getByText(/no listings|results/i))).toBeVisible();
});

test("listing detail opens gallery and enquiry intent", async ({ page }) => {
  await page.goto("/search?intent=rent&city=Harare");
  const listing = page.locator('a[href*="/listings/"]').first();
  await expect(listing).toBeVisible();
  await listing.click();
  await expect(page).toHaveURL(/\/listings\//);
  await page.locator("button").filter({ hasText: /tap to enlarge|photos pending|\/|photo/i }).first().click();
  await expect(page.locator("[aria-label='Close']").first()).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /enquire|viewing|question|consultant/i }).first().click();
  await expect(page.getByText(/your enquiry|preferred|message/i).first()).toBeVisible();
});

test("auth login/register screen renders cleanly", async ({ page }) => {
  await page.goto("/auth");
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  await page.getByRole("button", { name: /register|need an account/i }).click();
  await expect(page.getByRole("button", { name: /create account|register/i })).toBeVisible();
});

test("save favourite requires auth or saves for signed-in user", async ({ page }) => {
  if (seekerEmail && seekerPassword) await login(page, seekerEmail, seekerPassword);
  await page.goto("/search?intent=rent&city=Harare");
  await page.locator('a[href*="/listings/"]').first().click();
  await page.getByRole("button", { name: /save/i }).click();
  await expect(page.getByText(/saved|sign in|account/i).first()).toBeVisible();
});

test("landlord can reach create listing form", async ({ page }) => {
  test.skip(!landlordEmail || !landlordPassword, "Set E2E_LANDLORD_EMAIL/PASSWORD to run landlord create listing flow.");
  await login(page, landlordEmail!, landlordPassword!);
  await page.goto("/dashboard/landlord/new");
  await expect(page.getByRole("heading", { name: /create a listing/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /submit listing/i })).toBeVisible();
});

test("admin can reach listing approval controls", async ({ page }) => {
  test.skip(!adminEmail || !adminPassword, "Set E2E_ADMIN_EMAIL/PASSWORD to run admin approval flow.");
  await login(page, adminEmail!, adminPassword!);
  await page.goto("/dashboard/admin");
  await expect(page.getByText(/control center|admin/i).first()).toBeVisible();
  await expect(page.getByText(/properties|review|approve/i).first()).toBeVisible();
});

test("upload flow and manual checkout surface are reachable", async ({ page }) => {
  test.skip(!seekerEmail || !seekerPassword, "Set E2E_SEEKER_EMAIL/PASSWORD to run upload/payment flow.");
  await login(page, seekerEmail!, seekerPassword!);
  await page.goto("/payments");
  await expect(page.getByText(/payment method/i)).toBeVisible();
  await page.getByRole("button", { name: /create payment/i }).click();
  await expect(page.getByText(/reference|proof|pending/i).first()).toBeVisible();
});

test("library storefront and product page render commerce surfaces", async ({ page }) => {
  await page.goto("/library");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByPlaceholder(/search title, author, category/i).fill("law");
  await expect(page.getByRole("link", { name: /property development and property law/i }).first()).toBeVisible();
  await page.getByRole("link", { name: /property development and property law/i }).first().click();
  await expect(page).toHaveURL(/\/library\//);
  await expect(page.getByRole("button", { name: /sample preview/i })).toBeVisible();
  await expect(page.getByText(/secure checkout/i).first()).toBeVisible();
});

test("library cart starts native checkout for signed-in users", async ({ page }) => {
  test.skip(!seekerEmail || !seekerPassword, "Set E2E_SEEKER_EMAIL/PASSWORD to run Library checkout flow.");
  await login(page, seekerEmail!, seekerPassword!);
  await page.goto("/library");
  await page.getByRole("button", { name: /^(add|pre-order|in bag)/i }).first().click();
  const formatDialog = page.getByRole("dialog");
  if (await formatDialog.isVisible().catch(() => false)) {
    await formatDialog.getByRole("button", { name: /add to bag/i }).click();
  }
  const checkout = page.getByRole("link", { name: /^checkout$/i });
  if (!(await checkout.first().isVisible().catch(() => false))) {
    await page.getByRole("button", { name: /open library bag/i }).click();
  }
  await page.getByRole("link", { name: /^checkout$/i }).first().click();
  await expect(page).toHaveURL(/\/payments\?status=|\/library/);
});

test("signed-in users can reach My Library", async ({ page }) => {
  test.skip(!seekerEmail || !seekerPassword, "Set E2E_SEEKER_EMAIL/PASSWORD to run My Library flow.");
  await login(page, seekerEmail!, seekerPassword!);
  await page.goto("/dashboard/my-library");
  await expect(page.getByRole("heading", { name: /your books, manuals, downloads/i })).toBeVisible();
  await expect(page.getByText(/secure downloads|purchased resources/i).first()).toBeVisible();
});

test("admin can reach Library operations", async ({ page }) => {
  test.skip(!adminEmail || !adminPassword, "Set E2E_ADMIN_EMAIL/PASSWORD to run Library admin flow.");
  await login(page, adminEmail!, adminPassword!);
  await page.goto("/dashboard/admin/library?libraryView=Products");
  await expect(page.getByText(/houselink library|library product management/i).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /create product/i })).toBeVisible();
});

test("admin can review and follow up on Library exit leads", async ({ page, isMobile }) => {
  test.skip(!adminEmail || !adminPassword, "Set E2E_ADMIN_EMAIL/PASSWORD to run Library leads flow.");
  await login(page, adminEmail!, adminPassword!);
  let fullLibraryLoads = 0;
  let unconfirmedUpdate = false;
  await page.route(/\/api\/v1\/admin\/library\?type=exit-leads/, async (route) => {
    const query = new URL(route.request().url()).searchParams.get("query");
    await route.fulfill({ json: { data: {
      page: 1, pageSize: 20, total: query && !"Ada Guide".toLowerCase().includes(query.toLowerCase()) ? 0 : 1,
      admins: [{ id: "admin-1", name: "Admin", email: "admin@example.com" }],
      canExport: false, reviewDays: 365,
      metrics: { remindersConfigured: true, shown: 1, submitted: 1, contacted: 0, confirmedConversions: 0, overdue: 0, notificationFailures: 0, submissionErrors: 0, retentionReviewDue: 0, averageResponseMinutes: null, responseMedianMinutes: null, responseP90Minutes: null, byHelpType: [], bySource: [], byProduct: [] },
      leads: query && !"Ada Guide".toLowerCase().includes(query.toLowerCase()) ? [] : [{
        id: "sample-lead", name: "Ada Guide", email: "ada@example.com", phone: "+263771234567",
        productTitle: "Property Investment Guide", status: "NEW", createdAt: new Date().toISOString(),
        assignedToId: null, nextFollowUpAt: null, lastContactedAt: null, followUpNote: null, relatedRequests: 0, relatedLeads: [], paidOrders: [], activity: [], supportChats: [], helpType: "complete_purchase", sourceSurface: "checkout", sourcePath: "/library/checkout", customerNote: "Please call me tomorrow", closeReason: null, mergedIntoId: null, confirmedOrderId: null,
        message: "[Exit intent lead]\nHelp requested: Help me complete the purchase\nNote: Please call me tomorrow",
      }],
    } } });
  });
  await page.route("**/api/v1/admin/library", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({ json: unconfirmedUpdate ? { data: {} } : { data: { lead: { id: "sample-lead", status: "CONTACTED" } } } });
    } else {
      fullLibraryLoads += 1;
      await route.continue();
    }
  });
  await page.goto("/dashboard/admin/library?libraryView=Inventory");
  if (isMobile) await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("button", { name: "Leads", exact: true }).click();
  await expect(page).toHaveURL(/libraryView=Leads/);
  await expect(page.getByText("Ada Guide")).toBeVisible();
  await page.getByRole("button", { name: /Ada Guide/ }).click();
  await expect(page.getByText("Note: Please call me tomorrow")).toBeVisible();
  await page.getByLabel("Assign Library lead").selectOption("admin-1");
  await page.getByLabel("Internal follow-up note").fill("Call tomorrow morning");
  await page.getByRole("button", { name: "Save follow-up" }).click();
  await page.getByRole("button", { name: "Mark contacted" }).click();
  await page.getByLabel("Search Library leads").fill("not found");
  await expect(page.getByText("No leads match these filters.")).toBeVisible();
  fullLibraryLoads = 0;
  await page.goto("/dashboard/admin/library?libraryView=Leads");
  await expect(page.getByText("Ada Guide")).toBeVisible();
  expect(fullLibraryLoads).toBe(0);
  await page.getByRole("button", { name: /Ada Guide/ }).click();
  unconfirmedUpdate = true;
  await page.getByRole("button", { name: "Save follow-up" }).click();
  await expect(page.getByRole("alert")).toContainText("Could not confirm the follow-up was saved");
  await expect(page.getByRole("button", { name: "Save follow-up" })).toBeEnabled();
});

test("mobile navigation exposes core journeys", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Mobile navigation scan runs only in mobile projects.");
  await page.goto("/");
  await page.getByRole("button", { name: /menu|navigation/i }).click();
  await expect(page.getByRole("link", { name: /search|rent|find/i }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /verification|verified|safety/i }).first()).toBeVisible();
});

async function login(page: Page, email: string, password: string) {
  await page.goto("/auth");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).not.toHaveURL(/\/auth$/);
}
