/**
 * End-to-end API + page smoke test. Run: node scripts/smoke-test.mjs
 * Requires server on BASE_URL (default http://localhost:3000).
 * Set SMOKE_PUBLIC_ONLY=1 to skip authenticated flows (for production health checks).
 */

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const PUBLIC_ONLY = process.env.SMOKE_PUBLIC_ONLY === "1" || process.env.SMOKE_PUBLIC_ONLY === "true";
const STANDARD_PASSWORD = process.env.SEED_STANDARD_PASSWORD ?? "HouseLink2026!";
const TINASHE_PASSWORD = process.env.SEED_TINASHE_PASSWORD ?? STANDARD_PASSWORD;
const LANDLORD_PASSWORD = process.env.SEED_LANDLORD_PASSWORD ?? "HouseLinkOwner2026!";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "HouseLinkAdmin2026!";
const LOGIN_FALLBACKS = {
  "admin@houselink.co.zw": ["admin1234"],
  "landlord@houselink.co.zw": ["landlord1234"],
  "demo@houselink.co.zw": ["demo1234"],
  "tinashe.dube@houselink.co.zw": ["demo1234"],
  "blessing@harareprime.co.zw": ["demo1234"],
};

let cookie = "";
let passed = 0;
let failed = 0;

async function req(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers ?? {}) };
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  for (const c of setCookie) {
    const part = c.split(";")[0];
    cookie = cookie ? `${cookie}; ${part}` : part;
  }
  let data = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data, ok: res.ok, headers: res.headers };
}

async function getPage(path) {
  const res = await fetch(`${BASE}${path}`);
  const text = await res.text();
  return { status: res.status, ok: res.ok, text };
}

function assert(name, condition, detail = "") {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function login(email, password) {
  const passwords = [password, ...(LOGIN_FALLBACKS[email] ?? [])].filter(Boolean);
  let result = null;
  for (const candidate of [...new Set(passwords)]) {
    cookie = "";
    result = await req("/api/v1/auth/session", {
      method: "POST",
      body: JSON.stringify({ email, password: candidate }),
    });
    if (result.ok) return result;
  }
  return result;
}

async function main() {
  console.log(`\nHouseLink smoke test → ${BASE}\n`);

  // Static assets
  let r = await fetch(`${BASE}/brand/houselink-icon.png`);
  assert("Brand icon asset served", r.ok && (r.headers.get("content-type") ?? "").includes("image"));
  r = await fetch(`${BASE}/brand/houselink-nav-lockup.png`);
  assert("Nav logo asset served", r.ok && (r.headers.get("content-type") ?? "").includes("image"));
  r = await fetch(`${BASE}/brand/houselink-full-lockup.png`);
  assert("Full logo asset served", r.ok && (r.headers.get("content-type") ?? "").includes("image"));

  // Key pages
  for (const page of [
    "/",
    "/auth",
    "/search",
    "/become-agent",
    "/become-agent/apply",
    "/dashboard/agent",
    "/agents/blessing-muzenda",
    "/property-management",
    "/dashboard/tenancies",
    "/dashboard/landlord",
    "/about",
    "/verification",
    "/report-listing",
    "/careers",
    "/contact",
    "/calculators",
    "/terms",
    "/safety",
    "/listings/harare-avondale-cottage",
    "/roommates/people/user_seeker_tinashe",
  ]) {
    const p = await getPage(page);
    assert(`Page ${page}`, p.ok && p.text.length > 100, `status ${p.status}`);
  }

  // Listings API
  r = await req("/api/v1/listings");
  assert("GET listings", r.ok && Array.isArray(r.data?.data));

  // Public APIs (no auth)
  r = await req("/api/v1/property-management/requests/public", {
    method: "POST",
    body: JSON.stringify({
      fullName: "Smoke Tester",
      phone: "+263770000001",
      email: "smoke@test.co.zw",
      location: "Borrowdale, Harare",
      services: ["manage"],
      propertyType: "house",
    }),
  });
  assert("POST PM public request", r.ok, JSON.stringify(r.data?.error));

  r = await req("/api/v1/roommates/profiles/user_seeker_tinashe");
  const history = r.data?.data?.residenceHistory ?? [];
  assert(
    "Public profile hides full address",
    r.ok && history.length > 0 && history.every((h) => !h.fullAddress),
    JSON.stringify(r.data?.error),
  );

  r = await req("/api/v1/search/ai", {
    method: "POST",
    body: JSON.stringify({ query: "room under 200 in Harare" }),
  });
  assert("POST AI search", r.ok);

  r = await req("/api/v1/payments/config");
  assert("GET payments config", r.ok);

  r = await req("/api/v1/agents/public/blessing-muzenda");
  assert("GET public agent profile API", r.ok && r.data?.data?.profile, JSON.stringify(r.data?.error));
  if (r.data?.data?.user) {
    assert("Public agent hides personal phone", !r.data.data.user.phone, "phone leaked in API");
  }

  if (PUBLIC_ONLY) {
    console.log(`\n${passed} passed, ${failed} failed (public-only mode)\n`);
    process.exit(failed > 0 ? 1 : 0);
  }

  // Landlord flow
  r = await login("landlord@houselink.co.zw", LANDLORD_PASSWORD);
  assert("POST login landlord", r.ok);

  r = await req("/api/v1/listings", {
    method: "POST",
    body: JSON.stringify({
      title: "Smoke test room",
      city: "Harare",
      suburb: "Avondale",
      price: 150,
      type: "room",
      intent: "rent",
      bedrooms: 1,
      bathrooms: 1,
      description: "Automated smoke test listing",
      amenities: ["Wi-Fi"],
      image: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
      images: ["https://res.cloudinary.com/demo/image/upload/sample.jpg"],
      ownerAgreementAccepted: true,
      ownerAgreementSignerName: "Smoke Test Landlord",
      ownerAgreementVersion: "2026-01",
      ownerAgreementSignedAt: new Date().toISOString(),
    }),
  });
  const listingId = r.data?.data?.id;
  assert("POST create listing", r.ok && listingId, JSON.stringify(r.data?.error));

  r = await req("/api/v1/landlord/analytics");
  assert("GET landlord analytics", r.ok && r.data?.data?.listings?.[0]?.suburb);

  if (listingId) {
    r = await req(`/api/v1/listings/${listingId}/mark-rented`, {
      method: "POST",
      body: JSON.stringify({
        tenantUserId: "user_seeker_tinashe",
        fullAddress: "99 Test Street, Avondale, Harare",
      }),
    });
    assert("POST mark-rented with tenant", r.ok, JSON.stringify(r.data?.error));
  }

  r = await req("/api/v1/users/lookup?email=tinashe.dube@houselink.co.zw");
  assert("GET user lookup", r.ok && r.data?.data?.id === "user_seeker_tinashe");

  // Demo user — tenancies
  r = await login("tinashe.dube@houselink.co.zw", TINASHE_PASSWORD);
  assert("POST login seeker", r.ok);

  r = await req("/api/v1/tenancies");
  const tenancies = r.data?.data?.tenancies ?? [];
  assert("GET tenancies (seeker)", r.ok && Array.isArray(tenancies));
  const seededTenancy = tenancies.find((t) => t.record?.verified);
  assert("Seeded verified tenancy", Boolean(seededTenancy));

  if (seededTenancy) {
    r = await req(`/api/v1/tenancies/${seededTenancy.tenancyId}`);
    assert("GET tenancy detail", r.ok, JSON.stringify(r.data?.error));

    r = await req(`/api/v1/tenancies/${seededTenancy.tenancyId}/references`, {
      method: "POST",
      body: JSON.stringify({ note: "Smoke test reference" }),
    });
    assert("POST tenancy reference", r.ok, JSON.stringify(r.data?.error));

    r = await req(`/api/v1/tenancies/${seededTenancy.tenancyId}/address-consent`, {
      method: "POST",
      body: JSON.stringify({ consent: true }),
    });
    assert("POST address consent", r.ok, JSON.stringify(r.data?.error));
  }

  const pending = tenancies.find((t) => t.needsMyConfirmation);
  if (pending) {
    r = await req(`/api/v1/tenancies/${pending.tenancyId}/confirm`, { method: "POST" });
    assert("POST confirm tenancy", r.ok, JSON.stringify(r.data?.error));
  }

  const manual = (await req("/api/v1/users/me/residence-history")).data?.data?.records?.find(
    (rec) => rec.verificationSource === "manual" && !rec.verified,
  );
  if (manual) {
    r = await req(`/api/v1/tenancies/${manual.tenancyId}/disputes`, {
      method: "POST",
      body: JSON.stringify({ reason: "Smoke test dispute", details: "Automated test only" }),
    });
    assert("POST tenancy dispute", r.ok, JSON.stringify(r.data?.error));
    const disputeId = r.data?.data?.dispute?.id;
    if (disputeId) {
      cookie = "";
      r = await login("admin@houselink.co.zw", ADMIN_PASSWORD);
      r = await req(`/api/v1/admin/tenancy-disputes/${disputeId}`, {
        method: "PATCH",
        body: JSON.stringify({ resolution: "upheld", adminNote: "Smoke test resolved" }),
      });
      assert("PATCH resolve dispute", r.ok, JSON.stringify(r.data?.error));
      r = await login("tinashe.dube@houselink.co.zw", TINASHE_PASSWORD);
    }
  }

  r = await req("/api/v1/users/me/residence-history");
  assert("GET residence history", r.ok && Array.isArray(r.data?.data?.records));

  r = await req("/api/v1/users/me/residence-history", {
    method: "POST",
    body: JSON.stringify({
      propertyTitle: "Old flat",
      city: "Harare",
      suburb: "Mount Pleasant",
      role: "tenant",
      startDate: "2020-01-01",
      endDate: "2021-06-01",
    }),
  });
  assert("POST manual residence (unverified)", r.ok && r.data?.data?.record?.verified === false);

  // Tenancy payment checkout
  r = await req("/api/v1/payments/checkout", {
    method: "POST",
    body: JSON.stringify({
      plan: "tenancy_payment",
      provider: "bank_transfer",
      amount: 200,
      listingId: "harare-avondale-cottage",
      tenantUserId: "user_seeker_tinashe",
      landlordUserId: "user_landlord",
    }),
  });
  assert("POST tenancy payment checkout", r.ok && r.data?.data?.redirectUrl && r.data?.data?.manualMethod);

  // Lease sign
  r = await req("/api/v1/tenancies/lease", {
    method: "POST",
    body: JSON.stringify({
      listingId: "gweru-senga-room",
      tenantUserId: "user_seeker_tinashe",
      landlordUserId: "user_seeker_tinashe",
      fullAddress: "5 Senga Road, Gweru",
    }),
  });
  assert("POST sign lease", r.ok || r.status === 403, JSON.stringify(r.data?.error));

  // Roommates (authenticated)
  r = await login("tinashe.dube@houselink.co.zw", TINASHE_PASSWORD);
  r = await req("/api/v1/roommates/profile");
  assert("GET roommate profile", r.ok, JSON.stringify(r.data?.error));

  r = await req("/api/v1/roommates/matches", {
    method: "POST",
    body: JSON.stringify({
      lookingFor: "roommate",
      budgetMin: 100,
      budgetMax: 300,
      preferredLocations: "Harare",
      lifestyle: "quiet",
      gender: "female",
      age: 25,
      preferredAgeMin: 20,
      preferredAgeMax: 35,
      religion: "christian",
      maritalStatus: "single",
      householdType: "single",
      householdSize: 1,
    }),
  });
  assert("POST roommate matches", r.ok, JSON.stringify(r.data?.error));

  r = await req("/api/v1/messages");
  assert("GET messages", r.ok);

  // Admin
  r = await login("admin@houselink.co.zw", ADMIN_PASSWORD);
  assert("POST login admin", r.ok);

  r = await req("/api/v1/admin/control-center");
  assert("GET admin control center", r.ok);

  r = await req("/api/v1/admin/tenancy-disputes");
  assert("GET admin tenancy disputes", r.ok && Array.isArray(r.data?.data?.disputes));

  r = await req("/api/v1/admin/agents");
  assert("GET admin agents hub", r.ok && Array.isArray(r.data?.data?.territories));

  r = await req("/api/v1/admin/agents/activity");
  assert("GET admin agent activity", r.ok && Array.isArray(r.data?.data?.rows));

  r = await req("/api/v1/admin/listings?status=PENDING_REVIEW");
  assert("GET admin listings queue", r.ok && Array.isArray(r.data?.data?.listings));

  r = await req("/api/v1/enquiries");
  assert("GET agent enquiries CRM", r.ok || r.status === 403, JSON.stringify(r.data?.error));

  const territoryId = `terranean_${Date.now()}`;
  r = await req("/api/v1/admin/agents", {
    method: "PATCH",
    body: JSON.stringify({
      action: "save_territory",
      territory: {
        id: territoryId,
        name: "Smoke test zone",
        province: "Harare",
        city: "Harare",
        suburbs: ["Avondale"],
        postalCodes: [],
        agentIds: [],
        active: true,
      },
    }),
  });
  assert("PATCH save territory", r.ok, JSON.stringify(r.data?.error));

  r = await req("/api/v1/admin/agents", {
    method: "PATCH",
    body: JSON.stringify({ action: "delete_territory", territoryId }),
  });
  assert("PATCH delete territory", r.ok, JSON.stringify(r.data?.error));

  // Agent ratings (demo user on completed deal listing)
  r = await login("tinashe.dube@houselink.co.zw", TINASHE_PASSWORD);
  r = await req("/api/v1/agents/ratings?listingId=harare-avondale-cottage");
  const rateableDeal = r.data?.data;
  const alreadyRated = r.ok && rateableDeal === null;
  assert("GET rateable agent deal", (r.ok && rateableDeal?.dealRef) || alreadyRated, JSON.stringify(r.data?.error));

  if (rateableDeal?.dealRef) {
    r = await req("/api/v1/agents/ratings", {
      method: "POST",
      body: JSON.stringify({
        listingId: "harare-avondale-cottage",
        dealRef: rateableDeal.dealRef,
        professionalism: 5,
        communication: 5,
        knowledge: 4,
        responsiveness: 5,
        comment: "Smoke test rating",
      }),
    });
    assert("POST agent rating", r.ok, JSON.stringify(r.data?.error));
  } else {
    assert("POST agent rating", alreadyRated, "seed deal was already rated in this persisted environment");
  }

  r = await login("blessing@harareprime.co.zw", STANDARD_PASSWORD);
  assert("POST login agent", r.ok);

  r = await req("/api/v1/agents/me");
  assert("GET agent me", r.ok && r.data?.data?.profile, JSON.stringify(r.data?.error));

  const agentProfile = (await req("/api/v1/agents/public/blessing-muzenda")).data?.data;
  const openLead = agentProfile?.leads?.find((l) => l.status !== "CLOSED_WON");
  if (openLead) {
    r = await req("/api/v1/agents/leads", {
      method: "POST",
      body: JSON.stringify({
        action: "close",
        leadId: openLead.id,
        type: "RENTAL",
        dealAmount: 400,
      }),
    });
    assert("POST close agent lead", r.ok, JSON.stringify(r.data?.error));
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
