import { created, ok, problem } from "@/lib/api/response";

export function GET() {
  return ok([]);
}

export async function POST(request: Request) {
  const body = await request.json();

  if (!body.targetType) {
    return problem(400, "INVALID_VERIFICATION", "targetType is required.");
  }
  if (!Array.isArray(body.documents) || body.documents.length === 0) {
    return problem(400, "DOCUMENTS_REQUIRED", "Upload at least one verification document.");
  }

  return created({
    id: `verify_${crypto.randomUUID()}`,
    status: "PENDING",
    ...body,
  });
}
