import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to import coupons.");

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return problem(400, "FILE_REQUIRED", "CSV file is required.");
    }

    if (!file.name.endsWith(".csv")) {
      return problem(400, "INVALID_FILE_TYPE", "Only CSV files are allowed.");
    }

    const text = await file.text();
    const lines = text.split("\n").filter((line) => line.trim());
    
    if (lines.length < 2) {
      return problem(400, "EMPTY_FILE", "CSV file is empty or has no data.");
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const prisma = getMainPrisma();

    const requiredHeaders = ["code", "discounttype", "discountvalue"];
    const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
      return problem(400, "MISSING_HEADERS", `Missing required headers: ${missingHeaders.join(", ")}`);
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(",").map((v) => v.trim());
        const row: Record<string, string> = {};
        
        headers.forEach((header, index) => {
          row[header] = values[index] || "";
        });

        // Validate required fields
        if (!row.code || !row.discounttype || !row.discountvalue) {
          results.failed++;
          results.errors.push(`Row ${i + 1}: Missing required fields`);
          continue;
        }

        // Validate discount type
        if (!["PERCENTAGE", "FIXED"].includes(row.discounttype.toUpperCase())) {
          results.failed++;
          results.errors.push(`Row ${i + 1}: Invalid discount type ${row.discounttype}`);
          continue;
        }

        // Validate discount value
        const discountValue = parseFloat(row.discountvalue);
        if (isNaN(discountValue) || discountValue <= 0) {
          results.failed++;
          results.errors.push(`Row ${i + 1}: Invalid discount value`);
          continue;
        }

        // Check if coupon already exists
        const existing = await prisma.academyCoupon.findUnique({
          where: { code: row.code.toUpperCase() },
        });

        if (existing) {
          results.failed++;
          results.errors.push(`Row ${i + 1}: Coupon ${row.code} already exists`);
          continue;
        }

        // Create coupon
        await prisma.academyCoupon.create({
          data: {
            code: row.code.toUpperCase(),
            discountType: row.discounttype.toUpperCase() as any,
            discountValue: discountValue,
            maxUses: row.maxuses ? parseInt(row.maxuses) : null,
            validUntil: row.expiresat ? new Date(row.expiresat) : null,
            applicableCourses: row.courseid ? [row.courseid] : [],
            createdBy: userId,
            active: row.active !== "false",
          },
        });

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    return ok({
      message: `Import completed. ${results.success} coupons imported, ${results.failed} failed.`,
      results,
    });
  } catch (error) {
    console.error("Failed to import coupons:", error);
    return problem(500, "SERVER_ERROR", "Failed to import coupons.");
  }
}
