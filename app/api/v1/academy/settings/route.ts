import { ok, problem } from "@/lib/api/response";
import { getAcademySettingsPublic } from "@/lib/academy/public-academy-repository";
import { isDatabaseUnavailableError } from "@/lib/db/production-schema";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const response = ok(await getAcademySettingsPublic());
    response.headers.set("Cache-Control", "public, max-age=300, s-maxage=600, stale-while-revalidate=600");
    return response;
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      const response = ok(defaultAcademySettings());
      response.headers.set("Cache-Control", "public, max-age=60, s-maxage=60");
      return response;
    }
    console.error("Failed to load academy settings", error);
    return problem(500, "SETTINGS_FAILED", "Academy settings could not be loaded.");
  }
}

function defaultAcademySettings() {
  return {
    academyName: "HouseLink Academy",
    certificatePrefix: "HLA",
    primaryColour: "#008b68",
    accentColour: "#c6a15b",
    paymentInstructions: "Upload proof of payment for admin approval before course activation.",
    accessDurationDays: 365,
    supportedFormats: ["PDF", "DOCX", "VIDEO"],
    quizSettings: { defaultPassMark: 80, maxAttempts: 3, showResults: true },
    enrolmentSettings: { allowTrainingOnly: true, requirePaymentProof: true },
    completionRules: { requireAllLessons: true, requireFinalExam: false },
    requireEmailVerification: false,
    community: { enabled: false, name: "", whatsappUrl: "", inviteText: "", sharePrompt: "" },
  };
}
