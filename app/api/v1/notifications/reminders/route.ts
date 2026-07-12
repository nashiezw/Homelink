import { ok, problem } from "@/lib/api/response";
import { requireAdminAsync } from "@/lib/admin/require-admin";
import { getMainPrisma, isPostgresStoreEnabled } from "@/lib/db/main-prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireAdminAsync(request);
  if (auth.error) return auth.error;
  if (!isPostgresStoreEnabled()) return problem(503, "POSTGRES_REQUIRED", "Reminder jobs require PostgreSQL.");

  const prisma = getMainPrisma();
  const now = new Date();
  const appointments = await prisma.viewingAppointment.findMany({
    where: {
      reminderAt: { lte: now },
      status: { in: ["REQUESTED", "CONFIRMED", "RESCHEDULED"] },
      OR: [{ seekerId: { not: null } }, { agentId: { not: null } }],
    },
    include: { listing: { select: { title: true } } },
    take: 100,
  });

  let queued = 0;
  for (const appointment of appointments) {
    const subject = `Viewing reminder: ${appointment.referenceNumber}`;
    const existing = await prisma.notification.findFirst({ where: { subject } });
    if (existing) continue;
    const body = `Reminder: ${appointment.listing.title} viewing is scheduled for ${appointment.startAt.toLocaleString()}.`;
    const recipients = [appointment.seekerId, appointment.agentId].filter((id): id is string => Boolean(id));
    if (!recipients.length) continue;
    await prisma.notification.createMany({
      data: recipients.map((userId) => ({ userId, channel: "EMAIL", subject, body })),
    });
    queued += recipients.length;
  }

  return ok({ queued, checked: appointments.length });
}
