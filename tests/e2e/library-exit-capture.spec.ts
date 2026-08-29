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

  await page.locator("body").dispatchEvent("mouseout", { clientY: 0, relatedTarget: null });

  const dialog = page.getByRole("dialog", { name: /Need a hand finishing your Library order/i });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Name")).toBeVisible();
  await expect(dialog.getByLabel("Phone")).toBeVisible();
  await expect(dialog.getByLabel("Email")).toBeVisible();
  await expect(dialog.getByRole("button", { name: /Send my details/i })).toBeVisible();
  await expect(dialog.getByRole("button", { name: /Stay/i })).toBeVisible();
  await expect(dialog.getByText(/payment, proof upload, invoice details/i)).toBeVisible();
});
