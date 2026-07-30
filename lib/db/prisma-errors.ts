import { Prisma } from "@prisma/client";

export function isMissingSchemaError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2021" || error.code === "P2022");
}
