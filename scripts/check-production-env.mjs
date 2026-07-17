const required = [
  "DATABASE_URL",
  "HOUSELINK_STRICT_PRODUCTION",
  "NEXT_PUBLIC_APP_URL",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "HOUSELINK_UPLOAD_SCAN_URL",
];

const missing = required.filter((name) => !process.env[name]);
const weak = [];
const sessionSecret = process.env.HOUSELINK_SESSION_SECRET || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "";

if (!sessionSecret) {
  missing.push("HOUSELINK_SESSION_SECRET, AUTH_SECRET, or NEXTAUTH_SECRET");
} else if (sessionSecret.length < 32) {
  weak.push("The configured session secret must be at least 32 characters.");
}

if (process.env.HOUSELINK_STRICT_PRODUCTION !== "true") {
  weak.push("HOUSELINK_STRICT_PRODUCTION must be exactly true.");
}

if (process.env.NEXT_PUBLIC_APP_URL && /localhost|127\.0\.0\.1/i.test(process.env.NEXT_PUBLIC_APP_URL)) {
  weak.push("NEXT_PUBLIC_APP_URL must be the production origin, not localhost.");
}

if (missing.length || weak.length) {
  console.error("Production environment check failed.");
  for (const name of missing) console.error(`- Missing ${name}`);
  for (const issue of weak) console.error(`- ${issue}`);
  process.exit(1);
}

console.log("Production environment check passed.");
