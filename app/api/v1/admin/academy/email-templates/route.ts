import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getAllEmailTemplates, createEmailTemplate, updateEmailTemplate, deleteEmailTemplate } from "@/lib/academy/email-template-repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to view email templates.");

  try {
    const templates = await getAllEmailTemplates();
    return ok({ templates });
  } catch (error) {
    console.error("Failed to get email templates:", error);
    return problem(500, "SERVER_ERROR", "Failed to get email templates.");
  }
}

export async function POST(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to create email templates.");

  try {
    const body = await request.json();
    const { templateKey, language, subject, htmlContent, textContent, active } = body;

    if (!templateKey || !language || !subject || !htmlContent) {
      return problem(400, "MISSING_FIELDS", "templateKey, language, subject, and htmlContent are required.");
    }

    const template = await createEmailTemplate({
      templateKey,
      language,
      subject,
      htmlContent,
      textContent,
      active: active ?? true,
    });

    return ok({
      message: "Email template created successfully.",
      template,
    });
  } catch (error) {
    console.error("Failed to create email template:", error);
    return problem(500, "SERVER_ERROR", "Failed to create email template.");
  }
}

export async function PATCH(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to update email templates.");

  try {
    const body = await request.json();
    const { id, subject, htmlContent, textContent, active } = body;

    if (!id) {
      return problem(400, "MISSING_ID", "Template ID is required.");
    }

    const template = await updateEmailTemplate(id, {
      subject,
      htmlContent,
      textContent,
      active,
    });

    return ok({
      message: "Email template updated successfully.",
      template,
    });
  } catch (error) {
    console.error("Failed to update email template:", error);
    return problem(500, "SERVER_ERROR", "Failed to update email template.");
  }
}

export async function DELETE(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to delete email templates.");

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return problem(400, "MISSING_ID", "Template ID is required.");
    }

    await deleteEmailTemplate(id);

    return ok({
      message: "Email template deleted successfully.",
    });
  } catch (error) {
    console.error("Failed to delete email template:", error);
    return problem(500, "SERVER_ERROR", "Failed to delete email template.");
  }
}
