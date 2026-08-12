import { getMainPrisma } from "@/lib/db/main-prisma";

export interface EmailTemplate {
  id: string;
  templateKey: string;
  language: string;
  subject: string;
  htmlContent: string;
  textContent?: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEmailTemplateInput {
  templateKey: string;
  language: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  active?: boolean;
}

export interface UpdateEmailTemplateInput {
  subject?: string;
  htmlContent?: string;
  textContent?: string;
  active?: boolean;
}

export type AcademyEmailTemplateVariables = Record<string, string | number | null | undefined>;

export const SAMPLE_ACADEMY_EMAIL_VARIABLES: AcademyEmailTemplateVariables = {
  learnerName: "HouseLink Learner",
  userName: "HouseLink Learner",
  courseTitle: "Zimbabwe Real Estate Foundations",
  amount: "30.00",
  currency: "USD",
  registrationId: "HLA-1234567890",
  paymentInstructions: "EcoCash or bank transfer details will appear here with your HouseLink payment reference.",
  verificationLink: "https://www.houselink.co.zw/auth/verify-email?token=sample",
  courseUrl: "https://www.houselink.co.zw/academy",
  reminderDay: "2",
  logoUrl: "https://www.houselink.co.zw/brand/houselink-full-lockup.png",
  primaryColor: "#047857",
  secondaryColor: "#0f172a",
};

export function renderAcademyEmailTemplateString(value: string, variables: AcademyEmailTemplateVariables) {
  return value.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key: string) => {
    const replacement = variables[key];
    if (replacement === null || replacement === undefined) return match;
    return String(replacement);
  });
}

export function renderAcademyEmailTemplate(
  input: Pick<EmailTemplate, "subject" | "htmlContent" | "textContent">,
  variables: AcademyEmailTemplateVariables,
) {
  return {
    subject: renderAcademyEmailTemplateString(input.subject, variables),
    htmlContent: renderAcademyEmailTemplateString(input.htmlContent, variables),
    textContent: input.textContent ? renderAcademyEmailTemplateString(input.textContent, variables) : undefined,
  };
}

export async function getEmailTemplate(
  templateKey: string,
  language: string = "en"
): Promise<EmailTemplate | null> {
  const prisma = getMainPrisma();
  
  const template = await prisma.academyEmailTemplate.findUnique({
    where: {
      templateKey_language: {
        templateKey,
        language,
      },
    },
  });

  return template;
}

export async function getAllEmailTemplates(): Promise<EmailTemplate[]> {
  const prisma = getMainPrisma();
  
  const templates = await prisma.academyEmailTemplate.findMany({
    orderBy: [
      { templateKey: "asc" },
      { language: "asc" },
    ],
  });

  return templates;
}

export async function createEmailTemplate(
  input: CreateEmailTemplateInput
): Promise<EmailTemplate> {
  const prisma = getMainPrisma();
  
  const template = await prisma.academyEmailTemplate.upsert({
    where: {
      templateKey_language: {
        templateKey: input.templateKey,
        language: input.language,
      },
    },
    create: {
      templateKey: input.templateKey,
      language: input.language,
      subject: input.subject,
      htmlContent: input.htmlContent,
      textContent: input.textContent,
      active: input.active ?? true,
    },
    update: {
      subject: input.subject,
      htmlContent: input.htmlContent,
      textContent: input.textContent,
      active: input.active ?? true,
    },
  });

  return template;
}

export async function updateEmailTemplate(
  id: string,
  input: UpdateEmailTemplateInput
): Promise<EmailTemplate> {
  const prisma = getMainPrisma();
  
  const template = await prisma.academyEmailTemplate.update({
    where: { id },
    data: input,
  });

  return template;
}

export async function deleteEmailTemplate(id: string): Promise<void> {
  const prisma = getMainPrisma();
  
  await prisma.academyEmailTemplate.delete({
    where: { id },
  });
}

export async function getActiveEmailTemplate(
  templateKey: string,
  language: string = "en"
): Promise<EmailTemplate | null> {
  const prisma = getMainPrisma();
  
  const template = await prisma.academyEmailTemplate.findFirst({
    where: {
      templateKey,
      language,
      active: true,
    },
  });

  return template;
}

export async function getEmailTemplateByKey(
  templateKey: string
): Promise<EmailTemplate[]> {
  const prisma = getMainPrisma();
  
  const templates = await prisma.academyEmailTemplate.findMany({
    where: { templateKey },
    orderBy: { language: "asc" },
  });

  return templates;
}
