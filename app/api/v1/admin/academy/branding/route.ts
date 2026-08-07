import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getAcademyBranding, updateAcademyBranding, resetAcademyBranding } from "@/lib/academy/branding-repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to view branding settings.");

  try {
    const branding = await getAcademyBranding();
    return ok({ branding });
  } catch (error) {
    console.error("Failed to get branding settings:", error);
    return problem(500, "SERVER_ERROR", "Failed to get branding settings.");
  }
}

export async function PATCH(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to update branding settings.");

  try {
    const body = await request.json();
    const { logoUrl, primaryColor, secondaryColor, fontColor, backgroundColor, customCss } = body;

    const branding = await updateAcademyBranding({
      logoUrl,
      primaryColor,
      secondaryColor,
      fontColor,
      backgroundColor,
      customCss,
    });

    return ok({
      message: "Branding settings updated successfully.",
      branding,
    });
  } catch (error) {
    console.error("Failed to update branding settings:", error);
    return problem(500, "SERVER_ERROR", "Failed to update branding settings.");
  }
}

export async function POST(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to reset branding settings.");

  try {
    const branding = await resetAcademyBranding();

    return ok({
      message: "Branding settings reset to defaults.",
      branding,
    });
  } catch (error) {
    console.error("Failed to reset branding settings:", error);
    return problem(500, "SERVER_ERROR", "Failed to reset branding settings.");
  }
}
