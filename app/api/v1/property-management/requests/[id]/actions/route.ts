import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getStore } from "@/lib/store/app-store";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1";
}

export async function POST(request: Request, context: RouteContext) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to continue.");

  const { id } = await context.params;
  const body = await request.json();
  const store = getStore();
  const user = store.getUserById(userId);
  if (!user) return problem(401, "UNAUTHORIZED", "Invalid session.");

  const pmRequest = store.getPMRequest(id);
  if (!pmRequest) return problem(404, "NOT_FOUND", "Request not found.");

  const action = body.action as string;
  const isAdmin = user.roles.includes("ADMIN");
  const isConsultant = user.roles.includes("CONSULTANT") && pmRequest.consultantId === userId;
  const isOwner = pmRequest.ownerId === userId;

  const adminOnly = [
    "assign_consultant", "assign_agency", "approve", "reject", "pause", "resume", "close",
    "archive", "delete", "restore", "merge", "transfer", "approve_document", "reject_document",
    "approve_valuation", "generate_invoice", "link_payment", "activate_management",
  ];
  const consultantActions = ["add_note", "schedule_inspection", "reschedule_inspection", "cancel_inspection", "assign_valuation", "generate_quotation", "generate_agreement", "sign_agreement", "add_offer", "add_interested_party", "upload_document", "email_document"];
  const ownerActions = ["upload_document", "add_note"];

  if (adminOnly.includes(action) && !isAdmin) return problem(403, "FORBIDDEN", "Admin only.");
  if (consultantActions.includes(action) && !isAdmin && !isConsultant) return problem(403, "FORBIDDEN", "Consultant or admin only.");
  if (ownerActions.includes(action) && !isAdmin && !isOwner && !isConsultant) return problem(403, "FORBIDDEN", "Not permitted.");

  const result = store.pmRunAction(id, action, { id: userId, name: user.name }, body, clientIp(request));
  if (!result) return problem(400, "UNKNOWN_ACTION", `Unknown action: ${action}`);

  return ok({ request: store.getPMRequest(id), result });
}
