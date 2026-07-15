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
