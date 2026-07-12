import { created, ok, problem } from "@/lib/api/response";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { checkRateLimit, getClientIp } from "@/lib/api/request-meta";
import { getMainPrisma } from "@/lib/db/main-prisma";
import {
  createSignedAgreement,
  listSignedAgreements,
  shouldUsePostgresSignatures,
} from "@/lib/signatures/postgres-signature-repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!shouldUsePostgresSignatures()) return problem(503, "POSTGRES_REQUIRED", "Digital signatures require PostgreSQL.");
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to view signed documents.");
  const user = await getMainPrisma().user.findUnique({ where: { id: userId }, select: { roles: true } });
  const isAdmin = Boolean(user?.roles.map(String).some((role) => ["ADMIN", "SUPER_ADMIN"].includes(role)));
  const { searchParams } = new URL(request.url);
  if (!isAdmin && searchParams.get("listingId")) {
    const listing = await getMainPrisma().listing.findUnique({ where: { id: searchParams.get("listingId")! }, select: { ownerId: true } });
    if (listing?.ownerId !== userId) return problem(403, "FORBIDDEN", "You cannot view signed documents for this listing.");
  }
  return ok({
    signatures: await listSignedAgreements({
      subjectType: searchParams.get("subjectType") ?? undefined,
      subjectId: searchParams.get("subjectId") ?? undefined,
      listingId: searchParams.get("listingId") ?? undefined,
    }),
  });
}

export async function POST(request: Request) {
  if (!shouldUsePostgresSignatures()) return problem(503, "POSTGRES_REQUIRED", "Digital signatures require PostgreSQL.");
  const rate = checkRateLimit(`signature:${getClientIp(request)}`, 8);
  if (!rate.allowed) return problem(429, "RATE_LIMITED", `Try again in ${rate.retryAfterSec} seconds.`);
  const userId = getSessionUserIdFromRequest(request);
  const body = await request.json();
  if (!body.subjectType || !body.subjectId || !body.signerName || !body.signatureText || !body.agreementText) {
    return problem(400, "INVALID_SIGNATURE", "Agreement subject, signer, signature, and text are required.");
  }
  const signature = await createSignedAgreement({
    subjectType: String(body.subjectType),
    subjectId: String(body.subjectId),
    listingId: body.listingId,
    title: String(body.title ?? "HomeLink agreement"),
    signerUserId: userId ?? body.signerUserId,
    signerName: String(body.signerName),
    signerEmail: body.signerEmail,
    signerRole: String(body.signerRole ?? "SIGNER"),
    signatureText: String(body.signatureText),
    agreementText: String(body.agreementText),
    signatureImageDataUrl: body.signatureImageDataUrl ? String(body.signatureImageDataUrl) : undefined,
    ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
    userAgent: request.headers.get("user-agent") ?? undefined,
  });
  return created({ signature });
}
