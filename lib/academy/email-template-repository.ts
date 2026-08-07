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
  
  const template = await prisma.academyEmailTemplate.create({
    data: {
      templateKey: input.templateKey,
      language: input.language,
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
