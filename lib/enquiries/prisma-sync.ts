import { isPostgresStoreEnabled, getMainPrisma } from "@/lib/db/main-prisma";
import type { PropertyEnquiry } from "@/lib/enquiries/types";

function enquiryPayload(enquiry: PropertyEnquiry) {
  const {
    id: _id,
    subjectType: _subjectType,
    listingId: _listingId,
    roommateUserId: _roommateUserId,
    holidayBookingId: _holidayBookingId,
    seekerId: _seekerId,
    ownerId: _ownerId,
    status: _status,
    enquiryType: _enquiryType,
    assignedAgentId: _assignedAgentId,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...rest
  } = enquiry;
  return rest;
}

export async function syncEnquiryToPrisma(enquiry: PropertyEnquiry) {
  if (!isPostgresStoreEnabled()) return;
  try {
    const prisma = getMainPrisma() as unknown as {
      propertyEnquiryRecord: {
        upsert: (args: unknown) => Promise<unknown>;
        findMany: (args: unknown) => Promise<
          Array<{
            id: string;
            subjectType: string;
            listingId: string | null;
            roommateUserId: string | null;
            holidayBookingId: string | null;
            seekerId: string;
            ownerId: string | null;
            status: string;
            enquiryType: string;
            assignedAgentId: string | null;
            payload: unknown;
            createdAt: Date;
            updatedAt: Date;
          }>
        >;
      };
    };
    await prisma.propertyEnquiryRecord.upsert({
      where: { id: enquiry.id },
      create: {
        id: enquiry.id,
        subjectType: enquiry.subjectType,
        listingId: enquiry.listingId || null,
        roommateUserId: enquiry.roommateUserId ?? null,
        holidayBookingId: enquiry.holidayBookingId ?? null,
        seekerId: enquiry.seekerId,
        ownerId: enquiry.ownerId || null,
        status: enquiry.status,
        enquiryType: enquiry.enquiryType,
        assignedAgentId: enquiry.assignedAgentId ?? null,
        payload: enquiryPayload(enquiry) as object,
        createdAt: new Date(enquiry.createdAt),
        updatedAt: new Date(enquiry.updatedAt),
      },
      update: {
        subjectType: enquiry.subjectType,
        listingId: enquiry.listingId || null,
        roommateUserId: enquiry.roommateUserId ?? null,
        holidayBookingId: enquiry.holidayBookingId ?? null,
        seekerId: enquiry.seekerId,
        ownerId: enquiry.ownerId || null,
        status: enquiry.status,
        enquiryType: enquiry.enquiryType,
        assignedAgentId: enquiry.assignedAgentId ?? null,
        payload: enquiryPayload(enquiry) as object,
        updatedAt: new Date(enquiry.updatedAt),
      },
    });
  } catch {
    // Prisma sync is best-effort until migrations are applied
  }
}

export async function loadEnquiriesFromPrisma(): Promise<PropertyEnquiry[]> {
  if (!isPostgresStoreEnabled()) return [];
  try {
    const prisma = getMainPrisma() as unknown as {
      propertyEnquiryRecord: {
        upsert: (args: unknown) => Promise<unknown>;
        findMany: (args: unknown) => Promise<
          Array<{
            id: string;
            subjectType: string;
            listingId: string | null;
            roommateUserId: string | null;
            holidayBookingId: string | null;
            seekerId: string;
            ownerId: string | null;
            status: string;
            enquiryType: string;
            assignedAgentId: string | null;
            payload: unknown;
            createdAt: Date;
            updatedAt: Date;
          }>
        >;
      };
    };
    const rows = await prisma.propertyEnquiryRecord.findMany({
      orderBy: { createdAt: "desc" },
      take: 5000,
    });
    return rows.map((row) => ({
      id: row.id,
      subjectType: row.subjectType as PropertyEnquiry["subjectType"],
      listingId: row.listingId ?? "",
      roommateUserId: row.roommateUserId ?? undefined,
      holidayBookingId: row.holidayBookingId ?? undefined,
      seekerId: row.seekerId,
      ownerId: row.ownerId ?? "",
      status: row.status as PropertyEnquiry["status"],
      enquiryType: row.enquiryType as PropertyEnquiry["enquiryType"],
      assignedAgentId: row.assignedAgentId ?? undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      ...(row.payload as Omit<PropertyEnquiry, "id" | "subjectType" | "listingId" | "seekerId" | "ownerId" | "status" | "enquiryType" | "createdAt" | "updatedAt">),
    }));
  } catch {
    return [];
  }
}
