import { expect, test } from "@playwright/test";

test("Library lead API rejects malformed and incomplete submissions", async ({ request }) => {
  const malformed = await request.post("/api/v1/library/exit-lead", {
    data: Buffer.from("{not-json"),
    headers: { "Content-Type": "application/json" },
  });
  expect(malformed.status()).toBe(400);
  expect((await malformed.json()).error.code).toBe("INVALID_JSON");

  const incomplete = await request.post("/api/v1/library/exit-lead", {
    data: { name: "Test Customer", phone: "0771234567", email: "invalid-email" },
  });
  expect(incomplete.status()).toBe(400);
  expect((await incomplete.json()).error.code).toBe("MISSING_CONTACT");
});

test("Library lead admin and export endpoints require authentication", async ({ request }) => {
  const inbox = await request.get("/api/v1/admin/library?type=exit-leads");
  expect(inbox.status()).toBe(401);

  const exportResponse = await request.get("/api/v1/admin/library?type=exit-leads-export");
  expect(exportResponse.status()).toBe(401);

  const update = await request.post("/api/v1/admin/library", {
    data: { action: "update_exit_lead", id: "missing", status: "CONTACTED" },
  });
  expect(update.status()).toBe(401);
});

test("Lead notifications cannot be read or acknowledged anonymously", async ({ request }) => {
  const list = await request.get("/api/v1/notifications");
  expect(list.status()).toBe(401);

  const acknowledge = await request.patch("/api/v1/notifications", {
    data: { id: "not-a-notification" },
  });
  expect(acknowledge.status()).toBe(401);
});
