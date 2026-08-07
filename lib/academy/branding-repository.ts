import { getMainPrisma } from "@/lib/db/main-prisma";

export interface AcademyBranding {
  id: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  fontColor: string;
  backgroundColor: string;
  customCss: string | null;
  updatedAt: Date;
}

export interface UpdateAcademyBrandingInput {
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fontColor?: string;
  backgroundColor?: string;
  customCss?: string;
}

export async function getAcademyBranding(): Promise<AcademyBranding> {
  const prisma = getMainPrisma();
  
  let branding = await prisma.academyBranding.findUnique({
    where: { id: "singleton" },
  });

  // Create default branding if it doesn't exist
  if (!branding) {
    branding = await prisma.academyBranding.create({
      data: {
        id: "singleton",
        primaryColor: "#10b981",
        secondaryColor: "#059669",
        fontColor: "#333333",
        backgroundColor: "#ffffff",
      },
    });
  }

  return branding;
}

export async function updateAcademyBranding(
  input: UpdateAcademyBrandingInput
): Promise<AcademyBranding> {
  const prisma = getMainPrisma();
  
  const branding = await prisma.academyBranding.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      ...input,
    },
    update: input,
  });

  return branding;
}

export async function resetAcademyBranding(): Promise<AcademyBranding> {
  const prisma = getMainPrisma();
  
  const branding = await prisma.academyBranding.update({
    where: { id: "singleton" },
    data: {
      logoUrl: null,
      primaryColor: "#10b981",
      secondaryColor: "#059669",
      fontColor: "#333333",
      backgroundColor: "#ffffff",
      customCss: null,
    },
  });

  return branding;
}
