import { NextResponse } from "next/server";
import { problem } from "@/lib/api/response";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { getSignedAgreement, shouldUsePostgresSignatures } from "@/lib/signatures/postgres-signature-repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!shouldUsePostgresSignatures()) return problem(503, "POSTGRES_REQUIRED", "Digital signatures require PostgreSQL.");
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to download signed agreements.");
  const { id } = await params;
  const signature = await getSignedAgreement(id);
  if (!signature) return problem(404, "NOT_FOUND", "Signed agreement could not be found.");
  const { getMainPrisma } = await import("@/lib/db/main-prisma");
  const prisma = getMainPrisma();
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { roles: true } });
  const isAdmin = Boolean(user?.roles.map(String).some((role) => ["ADMIN", "SUPER_ADMIN"].includes(role)));
  const isSigner = signature.signerUserId === userId;
  const isOwner = signature.listingId
    ? (await prisma.listing.findUnique({ where: { id: signature.listingId }, select: { ownerId: true } }))?.ownerId === userId
    : false;
  if (!isAdmin && !isSigner && !isOwner) return problem(403, "FORBIDDEN", "You cannot download this signed agreement.");
  const row = await prisma.signedAgreement.findUnique({ where: { id }, select: { pdfBase64: true, title: true } });
  if (!row) return problem(404, "NOT_FOUND", "Signed agreement could not be found.");
  return new NextResponse(Buffer.from(row.pdfBase64, "base64"), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${row.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${id}.pdf"`,
    },
  });
}
