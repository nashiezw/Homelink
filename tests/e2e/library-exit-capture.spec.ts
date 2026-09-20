import { expect, test } from "@playwright/test";

test("Library checkout shows a polished exit capture prompt", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "houselink_library_cart",
      JSON.stringify([
        {
          productId: "test-guide",
          title: "Sample Library Guide (PDF)",
          price: 15,
          currency: "USD",
          quantity: 1,
          formatId: "pdf",
          formatType: "PDF",
          formatLabel: "PDF",
        },
      ]),
    );
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith("houselink_library_exit_capture:")) window.localStorage.removeItem(key);
    }
  });
  await page.goto("/library/checkout");
  await page.waitForTimeout(4200);
  await page.goBack();

  const dialog = page.getByRole("dialog", { name: /Need help finishing your order/i });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Name")).toBeVisible();
  await expect(dialog.getByLabel("Phone")).toBeVisible();
  await expect(dialog.getByLabel("Email")).toBeVisible();
  await expect(dialog.getByRole("button", { name: /Send my details/i })).toBeVisible();
  await expect(dialog.getByRole("button", { name: /Stay/i })).toBeVisible();
  await expect(dialog.getByText(/payment, proof upload, invoice details/i)).toBeVisible();
  await expect(dialog.getByRole("link", { name: "Privacy Policy" })).toBeVisible();
});

test("Library exit capture shows a storage error and keeps entered details", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("houselink_library_cart", JSON.stringify([{ productId: "test-guide", title: "Sample Library Guide", price: 15, currency: "USD", quantity: 1, formatId: "pdf", formatType: "PDF", formatLabel: "PDF" }]));
    for (const key of Object.keys(window.localStorage)) if (key.startsWith("houselink_library_exit_capture:")) window.localStorage.removeItem(key);
  });
  await page.route("**/api/v1/library/exit-lead", async (route) => route.fulfill({ status: 503, json: { error: { code: "LEAD_STORAGE_UNAVAILABLE", message: "We could not save your details. Please try again later." } } }));
  await page.goto("/library/checkout");
  await page.waitForTimeout(4200);
  await page.goBack();
  const dialog = page.getByRole("dialog", { name: /Need help finishing your order/i });
  await dialog.getByLabel("Name").fill("Ada Guide");
  await dialog.getByLabel("Phone").fill("0771234567");
  await dialog.getByLabel("Email").fill("ada@example.com");
  await dialog.getByRole("button", { name: /Send my details/i }).click();
  await expect(dialog.getByRole("alert")).toContainText("could not save");
  await expect(dialog.getByLabel("Name")).toHaveValue("Ada Guide");
});
